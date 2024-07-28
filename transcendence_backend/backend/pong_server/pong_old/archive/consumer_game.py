# import os
# os.environ["PYTHONASYNCIODEBUG"] = "1"
from .game import PongGame
from .pong_settings import PongSettings
import logging
import queue
import concurrent.futures
import functools
from . import messages_client as msg_client
from . import messages_server as msg_server
from channels.layers import get_channel_layer, InMemoryChannelLayer
from asgiref.sync import async_to_sync, sync_to_async
from channels_redis.core import RedisChannelLayer
from channels.consumer import SyncConsumer, AsyncConsumer
from game.models import GameSchedule, GameResults
from channels.db import database_sync_to_async
from user.models import UserAccount
import sys
from typing import Literal
import asyncio
import uuid
import time


GAME_CHANNEL_ALIAS = "default"
JOIN_TIMEOUT = 5
RECONNECT_TIMEOUT = 10
IDLE_TIMEOUT = 30

# logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
logger.setLevel(level=logging.DEBUG)
logHandler = logging.StreamHandler(sys.stdout)
logFormatter = logging.Formatter(fmt='%(levelname)-8s:: Game Engine: %(message)s')
logHandler.setFormatter(logFormatter)
logger.addHandler(logHandler)




async def send_command_response(event: msg_client.GameEngineMessage, success: bool, message: str,
    status_code: msg_server.WebsocketErrorCode = msg_server.WebsocketErrorCode.OK):
    if not isinstance(event["client_command"]["id"], int):
        logger.error("Error: send_command_response: invalid id")
    msg: msg_client.GameEngineMessageResponse = {
        "type": "handle_command_response",
        "channel_name": "",
        "response": {
            "success": success,
            "id": event["client_command"]["id"],
            "cmd": event["client_command"]["cmd"],
            "message": message,
            "status_code": status_code.value,
        }
    }
    layer = get_channel_layer()
    if layer:
        if event["consumer_channel_name"] and isinstance(event["consumer_channel_name"], str):
            try:
                await layer.send(event["consumer_channel_name"], msg)
            except Exception as e:
                logger.error(f"Error: send_command_response: send to channel {event['consumer_channel_name']}: {e}")
        else:
            logger.error("Error: send_command_response: Channel name invalid")
    else:
        logger.error("Error: send_command_response: Channel layer not initialized")




class GameConsumer(AsyncConsumer):

    async def handle_command(self, event: msg_client.GameEngineMessage):
        try:
            game_handle = await GameHandle.get_or_create_handle(event["game_group_name"])
        
            match event["client_command"]["cmd"]:

                case "client-disconnected":
                    logger.info(f"user {event['client_command']['payload']['user_id']} disconnected")
                    await game_handle.player_disconnected(event["client_command"]["payload"]["user_id"])

                case "client-join-game":
                    logger.info(f"user {event['client_command']['payload']['user_id']} joined game {event['game_group_name']} -> schedule_id: {event['client_command']['payload']['schedule_id']}")
                    await game_handle.player_join(
                        event["client_command"]["payload"]["user_id"],
                        event["client_command"]["payload"]["schedule_id"]
                    )

                case "client-leave-game":
                    logger.info(f"user {event['client_command']['payload']['user_id']} attempt to leave game {event['game_group_name']}")
                    await GameHandle.remove_game(
                        game_handle=game_handle,
                        user_id=event["client_command"]["payload"]["user_id"]
                    )

                case "client-move" | "client-pause" | "client-resume":
                    logger.info(f"user {event['client_command']['payload']['user_id']} make command: {event['client_command']['cmd']}")
                    # print("GameConsumer: handle_command: client-move, client-pause, client-resume")
                    await game_handle.push_action(event['client_command']['payload']['user_id'], event["client_command"])

                case _:
                    logger.error(f"user {event['client_command']['payload']['user_id']} invalid command: {event['client_command']['cmd']}")
                    raise msg_server.CommandError("Invalid command", msg_server.WebsocketErrorCode.INVALID_COMMAND)

            await send_command_response(event, True, f"command {event['client_command']['cmd']} handled successfully", msg_server.WebsocketErrorCode.OK)

        except msg_server.CommandError as e:
            logger.error(f"CommandError: {e}, code: {e.error_code}")
            await send_command_response(event, False, f"Error handling message: {e}", e.error_code)
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            await send_command_response(event, False, f"Error handling message: {e}", msg_server.WebsocketErrorCode.DEFAULT_ERROR)







class GameHandle:

    __running_user_sessions: dict[int, str] = {}
    __game_handles: dict[str, "GameHandle"] = {}
    __channel_layer: RedisChannelLayer | None = get_channel_layer()
    __messenger = msg_client.InternalMessenger()

    @classmethod
    def print_sessions(cls):
        
        print("sessions: ", cls.__running_user_sessions)

    @classmethod
    async def get_or_create_handle(cls, game_group_name: str) -> "GameHandle":
        # print(f"get_or_create_handle: {game_group_name}")
        if not game_group_name or not isinstance(game_group_name, str):
            logger.error("Invalid game_group_name for game")
            # print("Invalid game_group_name for game")
            raise RuntimeError("Invalid game_group_name for game")
        handle = cls.__game_handles.get(game_group_name, None)
        # print(f"handle: {handle}")
        if not handle:
            # print("create new handle")
            logger.debug(f"no handle found, create new handle for {game_group_name}")
            handle = cls.__game_handles[game_group_name] = GameHandle(PongSettings(max_score=10000), game_group_name, GAME_CHANNEL_ALIAS)
            handle.join_timeout_task = asyncio.get_running_loop().create_task(handle.__join_timeout())
        return handle


    @classmethod
    async def has_session(cls, user_id: int) -> bool:
        return True if user_id in cls.__running_user_sessions else False

    @classmethod
    async def get_user_session_game_handle(cls, user_id: int) -> "GameHandle | None":
        name = cls.__running_user_sessions.get(user_id)
        if name:
            return cls.__game_handles[name]
        return None

    @classmethod
    async def remove_game(cls, user_id: int | None = None, game_group_name: str | None = None, game_handle: "GameHandle | None" = None):
        try:
            logger.info(f"remove_game: name: {game_group_name}, handle: {game_handle}")
            if game_group_name and isinstance(game_group_name, str):
                if game_group_name not in cls.__game_handles:
                    raise RuntimeError(f"game_group_name {game_group_name} has no game")
                game_handle = cls.__game_handles[game_group_name]
            elif game_handle and isinstance(game_handle, GameHandle):
                game_group_name = game_handle.game_group_name
            else:
                raise RuntimeError("Invalid arguments: remove_game_handle")
            game_handle.removed = True
            await game_handle.__quit(user_id)
            del cls.__game_handles[game_group_name]
        except Exception as e:
            logger.error(f"Error in remove_game: {e}")
        
    @classmethod
    def __print_stack(cls, stack: list):
        print("\nstack:")
        for frame in stack:
            print(frame)

    def __init__(self, settings: PongSettings, game_group_name: str, channel_alias: str | None = None):
        logger.debug(f"GameHandle: __init__: {game_group_name}")
        self.game_group_name = game_group_name
        self.channel_alias = channel_alias
        self.settings = settings
        self.connected_user_ids: set[int] = set()
        self.reconnect_tasks: dict[int, asyncio.Task] = {}
        self.join_timeout_task: asyncio.Task | None = None
        self.idle_timeout_task: asyncio.Task | None = None
        self.game: PongGame | None = None
        self.gameScheduleObj: GameSchedule | None = None
        self.last_action = time.time()
        self.removed = False


    async def __join_timeout(self):
        logger.debug(f"join timeout: game: {self.game_group_name}: task started")
        await asyncio.sleep(JOIN_TIMEOUT)
        logger.debug(f"join timeout: game: {self.game_group_name}: timeout expired")
        logger.debug(f"connected user: {self.connected_user_ids}, all connected?: {self.all_players_connected()}, already removed?: {self.removed}")
        if not self.all_players_connected() and not self.removed:
            # logger.debug(f"join timeout: game: {self.game_group_name}: send to game group...")
            # layer = get_channel_layer()
            # if self.__channel_layer:
            #     try:
            #         await self.__channel_layer.group_send(self.game_group_name, msg_server.GameJoinTimeout().to_consumer_msg())
            #     except Exception as e:
            #         logger.error(f"error send to channel: {e}")
            if not await msg_server.async_send_to_consumer(
                msg_server.Error(
                    error=f"players did not joined the game in {JOIN_TIMEOUT} seconds, server will close the socket connection",
                    close_code=msg_server.WebsocketErrorCode.JOIN_TIMEOUT),
                group_name=self.game_group_name
            ):
                logger.error(f"join timeout: game: {self.game_group_name}: unable to send to consumer")
            logger.info(f"timeout joining the game: {self.game_group_name}")
            logger.debug(f"join timeout: game: {self.game_group_name}: remove game")
            await GameHandle.remove_game(game_handle=self)

    async def __reconnect_timeout(self, user_id: int):
        logger.debug(f"reconnect timeout: game: {self.game_group_name}, user: {user_id}: task started")
        await asyncio.sleep(RECONNECT_TIMEOUT)
        logger.debug(f"reconnect timeout: game: {self.game_group_name}, user: {user_id}: timeout expired")
        if not self.removed:
            logger.info(f"timeout for user: {user_id} reconnecting to the game: {self.game_group_name}")
            if not await msg_server.async_send_to_consumer(
                msg_server.Error(
                    error="player disconnected and did not reconnect, server will close the socket connection",
                    close_code=msg_server.WebsocketErrorCode.RECONNECT_TIMEOUT),
                group_name=self.game_group_name
            ):
                logger.error(f"reconnect timeout: game: {self.game_group_name}: unable to send to consumer")
            # if self.__channel_layer:
            #     await self.__channel_layer.group_send(self.game_group_name, msg_server.UserDisconnected(user_id=user_id).to_consumer_msg())
            logger.debug(f"reconnect timeout: game: {self.game_group_name}, user: {user_id}: remove game")
            await GameHandle.remove_game(game_handle=self)

    async def __idle_timeout(self):
        logger.debug(f"idle timeout: game: {self.game_group_name}: task started")
        while self.game and self.game.is_alive():
            await asyncio.sleep(IDLE_TIMEOUT)
            logger.debug(f"Idle timeout: game: {self.game_group_name}: check idle")
            if self.last_action and time.time() - self.last_action > IDLE_TIMEOUT and not self.removed:
                logger.info(f"Idle timeout: game: {self.game_group_name}: remove game")
                if not await msg_server.async_send_to_consumer(
                    msg_server.Error(
                        error="idle Timeout, server will close the socket connection",
                        close_code=msg_server.WebsocketErrorCode.IDLE_TIMEOUT),
                    group_name=self.game_group_name
                ):
                    logger.error(f"idle timeout: game: {self.game_group_name}: unable to send to consumer")
                await GameHandle.remove_game(game_handle=self)

    def all_players_connected(self):
        return len(self.connected_user_ids) == 2

    async def player_disconnected(self, user_id: int):
        if user_id in self.connected_user_ids:
            if self.game and self.game.is_alive():
                logger.info(f"GameHandle: player_disconnected: user: {user_id}, pause game and trigger pause of the game")
                cmd: msg_client.ClientPauseCommand = {"cmd": "client-pause", "id": 0, "payload": {"user_id": user_id}}
                await self.push_action(user_id, cmd)
                self.reconnect_tasks[user_id] = asyncio.get_running_loop().create_task(self.__reconnect_timeout(user_id))
                if not await msg_server.async_send_to_consumer(
                    msg_server.UserDisconnected(user_id=user_id),
                    group_name=self.game_group_name
                ):
                    logger.error(f"GameHandle: player_disconnected: {self.game_group_name}: unable to send to consumer")
                # if self.__channel_layer:
                #     await self.__channel_layer.group_send(self.game_group_name, msg_server.UserDisconnected(user_id=user_id).to_consumer_msg())
            else:
                logger.info(f"GameHandle: player_disconnected: user: {user_id}, game not started, don't trigger reconnect timeout and pause")
            self.connected_user_ids.remove(user_id)
        else:
            logger.error(f"GameHandle: player_disconnected: user: {user_id}, not in the game: {self.connected_user_ids}")


    @database_sync_to_async
    def __add_user_to_game(self, user_id: int, schedule_id: int):
        logger.debug(f"GameHandle: __add_user_to_game: user {user_id}, game {self.game_group_name}, schedule_id: {schedule_id}")
        # print(f"\nadd_user_to_game: {user_id}")
        try:
            user: UserAccount = UserAccount.objects.get(pk=user_id)
        except UserAccount.DoesNotExist:
            logger.error(f"__add_user_to_game: user_id: {user_id} not found")
            raise msg_server.CommandError(f"join game: user_id: {user_id} not found", error_code=msg_server.WebsocketErrorCode.INVALID_USER_ID)
        if not self.gameScheduleObj:
            try:
                self.gameScheduleObj = GameSchedule.objects.get(pk=schedule_id)
            except GameSchedule.DoesNotExist:
                logger.error(f"__add_user_to_game: user_id: {user_id}, Game for schedule_id: {schedule_id} not found")
                raise msg_server.CommandError(f"join game: Game for schedule_id: {schedule_id} not found", error_code=msg_server.WebsocketErrorCode.INVALID_SCHEDULE_ID)
        
        logger.debug(f"GameHandle: __add_user_to_game: Sessions: {GameHandle.__running_user_sessions}")
        
        if user_id in self.connected_user_ids:
            logger.error(f"__add_user_to_game: user_id: {user_id} already joined the game")
            raise msg_server.CommandError(f"join game: user_id: {user_id} already joined the game", error_code=msg_server.WebsocketErrorCode.USER_ALREADY_JOINED_GAME)
        if user_id in GameHandle.__running_user_sessions:
            logger.error(f"__add_user_to_game: user_id: {user_id} has a running game session")
            raise msg_server.CommandError(f"join game: user_id: {user_id} has a running game session", error_code=msg_server.WebsocketErrorCode.ALREADY_RUNNING_GAME_SESSION)
        if self.gameScheduleObj.player_one.user == user or self.gameScheduleObj.player_two.user == user:
            self.connected_user_ids.add(user.pk)
            self.__running_user_sessions[user.pk] = self.game_group_name
        else:
            logger.error(f"__add_user_to_game: user_id: {user_id} not participant of the game")
            raise msg_server.CommandError(f"join game: user_id: {user_id} not participant of the game", error_code=msg_server.WebsocketErrorCode.USER_NO_PARTICIPANT)
        

    async def __start_game(self):
        logger.debug(f"GameHandle: __start_game")
        if not self.game and self.gameScheduleObj:
            self.q: queue.Queue[msg_client.ClientCommand] = queue.Queue()
            self.game = PongGame(self.settings, self.game_group_name, self.q, self.gameScheduleObj, self.channel_alias)
            self.game.start()
            self.last_action = time.time()
            if (self.join_timeout_task):
                self.join_timeout_task.cancel()
            self.idle_timeout_task = asyncio.get_running_loop().create_task(self.__idle_timeout())
        else:
            logger.error(f"Error starting the game: Game already started")
            raise RuntimeError("start_game: Game already started")


    async def player_join(self, user_id: int, schedule_id: int):
        if self.game and self.game.is_alive():
            if user_id in self.reconnect_tasks:
                logger.info(f"GameHandle: player_join: running game: user {user_id} in reconnect_tasks, cancel reconnect timeout")
                task = self.reconnect_tasks.pop(user_id)
                task.cancel()
                self.connected_user_ids.add(user_id)
                if (len(self.reconnect_tasks) == 0):
                    logger.info(f"GameHandle: player_join: running game: all reconnections resolved, push cmd to game to resume")
                    cmd: msg_client.ClientResumeCommand = {"cmd": "client-resume", "id": 0, "payload": {"user_id": user_id}}
                    await self.push_action(user_id, cmd)
                if not await msg_server.async_send_to_consumer(
                    msg_server.UserReconnected(user_id=user_id),
                    group_name=self.game_group_name
                ):
                    logger.error(f"GameHandle: player_disconnected: {self.game_group_name}: unable to send to consumer")
            else:
                logger.error(f"GameHandle: player_join: running game: user {user_id} is not part of the game")
                raise RuntimeError(f"join game: user_id: {user_id} not participant of the game")
        else:
            await self.__add_user_to_game(user_id, schedule_id)
            logger.info(f"GameHandle: player_join: user: {user_id} added to the game")
            if self.all_players_connected():
                logger.info(f"GameHandle: player_join: all users connected, start the game. users: {self.connected_user_ids}")
                await self.__start_game()
        

    async def push_action(self, user_id: int, action: msg_client.ClientCommand):
        if user_id not in self.connected_user_ids:
            logger.error(f"GameHandle: push_action: user: {user_id} not part of the game, command: {action}")
            raise RuntimeError(f"unable to push action, user not part of the game")
        elif self.game and self.game.is_alive():
            logger.info(f"GameHandle: push_action: user: {user_id}, command: {action}")
            self.last_action = time.time()
            self.q.put_nowait(action)
        else:
            logger.error(f"Error: GameHandle: push_action: game not started. user: {user_id}, command: {action}")
            raise RuntimeError(f"Game not started")


    async def __quit(self, user_id: int | None):
        if self.game and self.game.is_alive():
            logger.info(f"GameHandle: __quit: quit the game {self.game_group_name}, user: {user_id}")
            user_id = user_id if user_id else -1
            cmd = self.__messenger.leave_game(user_id)
            try:
                self.q.put_nowait(cmd)
            except queue.Full:
                logger.error("GameHandle: __quit: queue is full")
                with self.q.mutex:
                    self.q.queue.clear()
                    self.q.put_nowait(cmd)
            await join_game_thread(self.game)
            del self.game
            self.game = None
            logger.debug(f"GameHandle: __quit: game thread joined")
        else:
            logger.error(f"GameHandle: __quit: game {self.game_group_name} not started")
        for user_id in self.connected_user_ids:
            self.__running_user_sessions.pop(user_id, None)

        self.reconnect_tasks.clear()
        self.connected_user_ids.clear()

        logger.debug(f"debug game_handle members: connected_user_ids: {self.connected_user_ids}")
        logger.debug(f"debug game_handle members: game: {self.game}")
        logger.debug(f"debug game_handle members: game_group_name: {self.game_group_name}")
        logger.debug(f"debug game_handle members: gameScheduleObj: {self.gameScheduleObj}")
        logger.debug(f"debug game_handle members: idle_timeout_task: {self.idle_timeout_task}")
        logger.debug(f"debug game_handle members: join_timeout_task: {self.join_timeout_task}")
        logger.debug(f"debug game_handle members: reconnect_tasks: {self.reconnect_tasks}")
        logger.debug(f"debug game_handle members: last_action: {self.last_action}")
        logger.debug(f"debug game_handle members: removed: {self.removed}")





async def join_game_thread(game: PongGame | None):
    if game and game.is_alive():
        with concurrent.futures.ThreadPoolExecutor() as executor:
            try:
                # print("ok game join in executor")
                future = asyncio.get_running_loop().run_in_executor(executor, 
                functools.partial(join_game_thread_executor, game))
                future.add_done_callback(lambda future: print("future done: ", future))
                # print("future created: ", future)
                await future
                
                # print("ok game joined, res: ", future.result())
            except Exception as e:
                logger.error(f"join error: {e}")


def join_game_thread_executor(game: PongGame):
    try:
        # print("try join game thread")
        game.join()
        # print("game joined")
    except Exception as e:
        logger.error(f"join error in thread: {e}")


# class GameScheduleInfos:
#     def __init__(self, gameSchedule: GameSchedule):
#         self.gameScheduleObj = gameSchedule

# def add_user_to_game(user_id: int, schedule_id: int):
#     print(f"add_user_to_game: {user_id}")
#     user: UserAccount | None = UserAccount.objects.get(pk=user_id)
#     if not user:
#         raise RuntimeError(f"User not found: user_id: {user_id}")
#     if not gameScheduleObj:
#         gameScheduleObj = GameSchedule.objects.get(pk=schedule_id)
#         if not gameScheduleObj:
#             raise RuntimeError(f"Game not found: schedule_id: {schedule_id}")
#     if user in __running_user_sessions:
#         raise RuntimeError("User has already a running game session")
#     # print(f"player_one: {self.gameScheduleObj.player_one.user.pk}, player_two: {self.gameScheduleObj.player_two.user.pk}")
#     # print(f"user: {user.pk}")
#     # print(f"user_id: {user_id}")
#     if gameScheduleObj.player_one.user == user or gameScheduleObj.player_two.user == user:
#         users.add(user)
#         __running_user_sessions[user.pk] = game_group_name
#     else:
#         raise RuntimeError(f"User not in game: user_id: {user_id}")
    





    # async def __quit(self):
    #     print("\n--> GameHandle: __quit the Game")
    #     if self.game and self.game.is_alive():
    #         cmd: msg_client.ClientCommand = {"cmd": "client-leave-game", "id": 0, "payload": None}
    #         try:
    #             self.q.put_nowait(cmd)
    #             # print("GameHandle: stop_game: put cmd done")
    #         except queue.Full:
    #             # print("GameHandle: stop_game: exception: queue full")
    #             with self.q.mutex:
    #                 self.q.queue.clear()
    #                 self.q.put_nowait(cmd)
    #         # print("GameHandle: stop_game: game stopped")
    #         try:
    #             # print("GameHandle: try join game thread")
    #             await sync_to_async(self.game.join)()
    #         except Exception as e:
    #             print(f"GameHandle: stop_game: join error: {e}")
    #         print("GameHandle: stop_game: game joined")
    #         del self.game
    #         self.game = None
    #         self.all_users_joined = False
    #     else:
    #         print("GameHandle: stop_game: Game not started")
    #     for user in self.users:
    #         del self.__running_user_sessions[user.pk]

    #     self.users.clear()





# logger = logging.getLogger(__name__)
# logger.addHandler(logging.StreamHandler(sys.stdout))


# @database_sync_to_async
# def get_game_schedule(self, schedule_id):
#     try:
#         return GameSchedule.objects.get(pk=schedule_id)
#     except GameSchedule.DoesNotExist:
#         return None


# class GameConsumer(AsyncConsumer):

#     def __init__(self) -> None:
#         super().__init__()

#         self.running_user_sessions: dict[int, str] = {}
#         self.games: dict[str, GameHandle] = {}
#         self.channel_layer: RedisChannelLayer | None = get_channel_layer()
#         if not self.channel_layer:
#             raise RuntimeError("Channel layer not found")
#         self.loop = asyncio.get_running_loop()

    
#     async def get_game_room_name(self, event: msg_client.GameEngineMessage):
#         name = event["game_group_name"]
#         print(f"get_game_room_name: {name}")
#         if not name or not isinstance(name, str):
#             raise RuntimeError("Invalid game_group_name for game")
#         print("return name")
#         return name


#     async def send_command_response(self, event: msg_client.GameEngineMessage, success: bool, message: str,
#         status_code: msg_client.WebsocketErrorCode = msg_client.WebsocketErrorCode.OK, payload: dict | None = None):
#         # print(f"send_command_response: {event}")
#         if not isinstance(event["client_command"]["id"], int):
#             raise RuntimeError("Invalid id")
#         if not self.channel_layer:
#             raise RuntimeError("Channel layer not initialized")
#         msg: msg_client.GameEngineMessageResponse = {
#             "type": "handle_command_response",
#             "channel_name": "",
#             "response": {
#                 "success": success,
#                 "id": event["client_command"]["id"],
#                 "cmd": event["client_command"]["cmd"],
#                 "message": message,
#                 "status_code": status_code.value,
#                 "payload": payload
#             }
#         }
#         # async_to_sync(self.channel_layer.send)(event["consumer_channel_name"], msg)
#         await self.send(msg)

#     async def create_game(self, name: str, event: msg_client.ClientCreateGameCommand):
#         print("GameConsumer: handle_command: client-create-game")
#         if name not in self.games:
#             schedule_id = event["payload"]["schedule_id"]
#             client_game_settings = event["payload"]["game_settings"]
#             self.games[name] = GameHandle(schedule_id, PongSettings(), name)

#     async def reconnect_timeout(self, user_id: int, name: str):
#         await asyncio.sleep(10)
#         if name in self.games:
#             try:
#                 await self.quit_game(name)
#             except Exception as e:
#                 print(f"Error in reconnect_timeout: {e}")
#             if self.channel_layer:
#                 # await self.channel_layer.group_send(name, msg_server.OpponentDisconnected(user_id=user_id).to_dict())
#                 await self.send(msg_server.OpponentDisconnected(user_id=user_id).to_dict())

#     async def join_timeout(self, name: str):
#         await asyncio.sleep(3)
#         if len(self.games[name].users) < 2:
#             try:
#                 await self.quit_game(name)
#             except Exception as e:
#                 print(f"Error in reconnect_timeout: {e}")
#             if self.channel_layer:
#                 # await self.channel_layer.group_send(name, msg_server.GameJoinTimeout().to_dict())
#                 await self.send(msg_server.GameJoinTimeout().to_dict())

#     async def join_game(self, name: str, event: msg_client.ClientJoinCommand):
#         print("GameConsumer: handle_command: client-join-game")
#         user_id: int = event["payload"]["user_id"]
#         if name not in self.games:
#             raise RuntimeError("Game not found")
#         if user_id in self.running_user_sessions:
#             raise RuntimeError("User has already a running game session")
#         await self.games[name].player_join(user_id)
#         self.running_user_sessions[user_id] = name
#         self.loop.create_task(self.join_timeout(name))
        


#     async def quit_game(self, name: str):
#         print("GameConsumer: handle_command: client-quit-game")
#         if name not in self.games:
#             raise RuntimeError("Game not found")
#         game_handle = self.games[name]
#         await game_handle.stop_game()
#         for user in game_handle.users:
#             del self.running_user_sessions[user.pk]
#         del self.games[name]


#     async def handle_command(self, event: msg_client.GameEngineMessage):
#         print("GameConsumer: handle_command")
#         payload = None
#         try:
#             name = await self.get_game_room_name(event)
#             print(f"command is: {event['client_command']['cmd']}")
#             match event["client_command"]["cmd"]:

#                 case "client-disconnected":
#                     user_id = event["client_command"]["payload"]["user_id"]
#                     if name in self.games and user_id:
#                         self.loop.create_task(self.reconnect_timeout(user_id, name))
#                         game_handle = self.games[name]
#                         game_handle.users.remove(next(user for user in game_handle.users if user.pk == user_id))

#                 case "client-get-curent-session":
#                     payload = {
#                         "session_name": self.running_user_sessions[event["client_command"]["payload"]["user_id"]]
#                     }
#                 case "client-create-game":
#                     await self.create_game(name, event["client_command"])
#                 case "client-join-game":
#                     await self.join_game(name, event["client_command"])
#                 case "client-quit-game":
#                     await self.quit_game(name)

#                 case "client-move" | "client-pause" | "client-resume":
#                     print("GameConsumer: handle_command: client-move, client-pause, client-resume")
#                     if name not in self.games:
#                         raise RuntimeError("Game not found")
#                     await self.games[name].push_action(event["client_command"])

#                 case _:
#                     raise RuntimeError("Invalid command")

#             await self.send_command_response(event, True, f"command {event['client_command']['cmd']} handled successfully", msg_client.WebsocketErrorCode.OK, payload)

#         except msg_client.CommandError as e:
#             logger.error(f"Error handling message: {e}")
#             await self.send_command_response(event, False, f"Error handling message: {e}", e.error_code)
#         except Exception as e:
#             logger.error(f"Error handling message: {e}")
#             await self.send_command_response(event, False, f"Error handling message: {e}", msg_client.WebsocketErrorCode.DEFAULT_ERROR)




# class GameHandle:
#     def __init__(self, schedule_id: int, settings: PongSettings, game_group_name: str, channel_alias: str | None = None):
        
#         self.gameScheduleObj = GameSchedule.objects.get(pk=schedule_id)
#         if not self.gameScheduleObj:
#             raise RuntimeError(f"Game not found: schedule_id: {schedule_id}")
#         self.q: queue.Queue[msg_client.ClientCommand] = queue.Queue()
#         self.game_group_name = game_group_name
#         self.game = PongGame(settings, game_group_name, self.q, self.gameScheduleObj, channel_alias)
#         self.users: set[UserAccount] = set()

#     async def player_join(self, user_id: int):
#         if self.game.is_alive():
#             raise RuntimeError("player_join: Game already started")
#         user = UserAccount.objects.get(pk=user_id)
#         if not user:
#             raise RuntimeError(f"User not found: user_id: {user_id}")
#         if self.gameScheduleObj.player_one.user == user or self.gameScheduleObj.player_two.user == user:
#             self.users.add(user)
#         else:
#             raise RuntimeError(f"User not in game: user_id: {user_id}")
#         if len(self.users) == 2:
#             await self.start_game()
        


#     async def start_game(self):
#         if self.game.is_alive():
#             raise RuntimeError("start_game: Game already started")
#         print("start game!!")
#         self.game.start()
            

#     async def stop_game(self):
#         if not self.game.is_alive():
#             raise RuntimeError("stop_game: Game not started")
#         self.game.stop_game()
#         self.game.join()
#         print("GameHandle: stop_game: game joined")
#         del self.game


#     async def push_action(self, action: msg_client.ClientCommand):
#         if not self.game.is_alive():
#             raise RuntimeError("push_action: Game not started")
#         self.q.put(action)
