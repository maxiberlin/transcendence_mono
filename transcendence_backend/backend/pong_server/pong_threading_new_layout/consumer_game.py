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
JOIN_TIMEOUT = 15
RECONNECT_TIMEOUT = 7
IDLE_TIMEOUT = 20
START_GAME_TIMEOUT = 3

# logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
logger.setLevel(level=logging.DEBUG)
logHandler = logging.StreamHandler(sys.stdout)
logFormatter = logging.Formatter(fmt='%(levelname)-8s:: Game Engine: %(message)s')
logHandler.setFormatter(logFormatter)
logger.addHandler(logHandler)




# async def send_command_response(event: msg_client.GameEngineMessage, success: bool, message: str,
#     status_code: msg_server.WebsocketErrorCode = msg_server.WebsocketErrorCode.OK):
#     if not isinstance(event["client_command"]["id"], int):
#         logger.error("Error: send_command_response: invalid id")
#     msg: msg_client.GameEngineMessageResponse = {
#         "type": "handle_command_response",
#         "channel_name": "",
#         "response": {
#             "success": success,
#             "id": event["client_command"]["id"],
#             "cmd": event["client_command"]["cmd"],
#             "message": message,
#             "status_code": status_code.value,
#         }
#     }
#     layer = get_channel_layer()
#     if layer:
#         if event["consumer_channel_name"] and isinstance(event["consumer_channel_name"], str):
#             try:
#                 await layer.send(event["consumer_channel_name"], msg)
#             except Exception as e:
#                 logger.error(f"Error: send_command_response: send to channel {event['consumer_channel_name']}: {e}")
#         else:
#             logger.error("Error: send_command_response: Channel name invalid")
#     else:
#         logger.error("Error: send_command_response: Channel layer not initialized")




class GameConsumer(AsyncConsumer):

    async def handle_command(self, event: msg_client.GameEngineMessage):
        try:
            game_handle = await GameHandle.get_or_create_handle(event["game_group_name"])
        
            # internal = event["client_command"].get("internal", None)
            # if internal and internal == 1 and event["client_command"]["cmd"] != "client-join-game":
            #     raise msg_server.CommandError("Invalid command", msg_server.WebsocketErrorCode.INVALID_COMMAND)

            # print(f"GAME ENGINE MESSAGE: {event}")

            match event["client_command"]["cmd"]:

                case "client-disconnected":
                    logger.info(f"user {event['client_command']['user_id']} disconnected")
                    await game_handle.player_disconnected(event["client_command"]["user_id"])
                    await msg_client.async_send_command_response(event, True, f"command {event['client_command']['cmd']} handled successfully", msg_server.WebsocketErrorCode.OK)

                case "client-join-game":
                    logger.info(f"user {event['client_command']['user_id']} joined game {event['game_group_name']} -> schedule_id: {event['client_command']['schedule_id']}")
                    await game_handle.player_join(event["client_command"]["user_id"], event["client_command"]["schedule_id"])
                    await msg_client.async_send_command_response(event, True, f"command {event['client_command']['cmd']} handled successfully", msg_server.WebsocketErrorCode.OK)

                case "client-leave-game":
                    logger.info(f"user {event['client_command']['user_id']} attempt to leave game {event['game_group_name']}")
                    await GameHandle.remove_game(game_handle=game_handle, user_id=event["client_command"]["user_id"])
                    await msg_client.async_send_command_response(event, True, f"command {event['client_command']['cmd']} handled successfully", msg_server.WebsocketErrorCode.OK)

                case  "client-ready":
                    game_handle.player_ready(event['client_command']['user_id'])
                    await msg_client.async_send_command_response(event, True, f"command {event['client_command']['cmd']} handled successfully", msg_server.WebsocketErrorCode.OK)

                case "client-move" | "client-pause" | "client-resume":
                    # logger.info(f"user {event['client_command']['user_id']} make command: {event['client_command']['cmd']}")
                    await game_handle.push_action(event['client_command']['user_id'], event)

                case _:
                    logger.error(f"user {event['client_command']['user_id']} invalid command: {event['client_command']['cmd']}")
                    raise msg_server.CommandError("Invalid command", msg_server.WebsocketErrorCode.INVALID_COMMAND)

            

        except msg_server.CommandError as e:
            logger.error(f"CommandError: {e}, code: {e.error_code}")
            await msg_client.async_send_command_response(event, False, f"Error handling message: {e}", e.error_code)
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            await msg_client.async_send_command_response(event, False, f"Error handling message: {e}", msg_server.WebsocketErrorCode.DEFAULT_ERROR)







class GameHandle:

    __running_user_sessions: dict[int, str] = {}
    __game_handles: dict[str, "GameHandle"] = {}
    __messenger = msg_client.InternalMessenger(game_group_name="engine", consumer_channel_name="engine")

    @classmethod
    def print_sessions(cls):
        
        print("sessions: ", cls.__running_user_sessions)

    @classmethod
    async def get_or_create_handle(cls, game_group_name: str) -> "GameHandle":
        if not game_group_name or not isinstance(game_group_name, str):
            logger.error("Invalid game_group_name for game")
            raise RuntimeError("Invalid game_group_name for game")
        handle = cls.__game_handles.get(game_group_name, None)
        if not handle:
            logger.debug(f"no handle found, create new handle for {game_group_name}")
            handle = cls.__game_handles[game_group_name] = GameHandle(PongSettings(), game_group_name, GAME_CHANNEL_ALIAS)
            handle.join_timeout_task = asyncio.get_running_loop().create_task(handle.__join_timeout())
        return handle


    @classmethod
    async def has_session(cls, user_id: int) -> bool:
        return True if user_id in cls.__running_user_sessions else False

    @classmethod
    def get_user_session_game_handle(cls, user_id: int) -> "GameHandle | None":
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
        self.ready_user_ids: set[int] = set()
        self.reconnect_tasks: dict[int, asyncio.Task] = {}
        self.join_timeout_task: asyncio.Task | None = None
        self.idle_timeout_task: asyncio.Task | None = None
        self.start_game_timeout_task: asyncio.Task | None = None
        self.game: PongGame | None = None
        self.gameScheduleObj: GameSchedule | None = None
        self.last_action = time.time()
        self.removed = False


    async def __start_game_timeout(self):
        logger.debug(f"start game timeout: game: {self.game_group_name}: task started")
        start_time = time.time()
        while True:
            await asyncio.sleep(0.05)
            if self.removed:
                break
            if self.all_players_connected() and (self.all_players_ready() or time.time() - start_time > START_GAME_TIMEOUT):
                await self.__start_game()
                break


    async def __join_timeout(self):
        logger.debug(f"join timeout: game: {self.game_group_name}: task started")
        await asyncio.sleep(JOIN_TIMEOUT)
        logger.debug(f"join timeout: game: {self.game_group_name}: timeout expired")
        logger.debug(f"connected user: {self.connected_user_ids}, all connected?: {self.all_players_connected()}, already removed?: {self.removed}")
        if not self.all_players_connected() and not self.removed:
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
            logger.debug(f"reconnect timeout: game: {self.game_group_name}, user: {user_id}: remove game")
            await GameHandle.remove_game(game_handle=self, user_id=user_id)


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



    def player_ready(self, user_id: int):
        logger.info(f"GameHandle: player_ready: ${user_id}")
        self.ready_user_ids.add(user_id)

    def all_players_ready(self):
        return len(self.ready_user_ids) == 2
    
    def all_players_connected(self):
        return len(self.connected_user_ids) == 2

    async def player_disconnected(self, user_id: int):
        if user_id in self.connected_user_ids:
            if self.game and self.game.is_alive():
                logger.info(f"GameHandle: player_disconnected: user: {user_id}, pause game and trigger pause of the game")
                await self.push_action(user_id, self.__messenger.user_disconnected(user_id=user_id))
                self.reconnect_tasks[user_id] = asyncio.get_running_loop().create_task(self.__reconnect_timeout(user_id))
                if not await msg_server.async_send_to_consumer(
                    msg_server.UserDisconnected(user_id=user_id),
                    group_name=self.game_group_name
                ):
                    logger.error(f"GameHandle: player_disconnected: {self.game_group_name}: unable to send to consumer")
            else:
                logger.info(f"GameHandle: player_disconnected: user: {user_id}, game not started, don't trigger reconnect timeout and pause")
            self.connected_user_ids.remove(user_id)
            if len(self.connected_user_ids) == 0:
                logger.info("GameHandle: remove GameHandle, because all clients are gone")
                await GameHandle.remove_game(game_handle=self)
        else:
            logger.error(f"GameHandle: player_disconnected: user: {user_id}, not in the game: {self.connected_user_ids}")


    @database_sync_to_async
    def __add_user_to_game(self, user_id: int, schedule_id: int):
        logger.debug(f"GameHandle: __add_user_to_game: user {user_id}, game {self.game_group_name}, schedule_id: {schedule_id}")
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
        
        # logger.debug(f"GameHandle: __add_user_to_game: Sessions: {GameHandle.__running_user_sessions}")
        
        # if user_id in self.connected_user_ids:
        #     logger.error(f"__add_user_to_game: user_id: {user_id} already joined the game")
        #     raise msg_server.CommandError(f"join game: user_id: {user_id} already joined the game", error_code=msg_server.WebsocketErrorCode.USER_ALREADY_JOINED_GAME)
        # if user_id in GameHandle.__running_user_sessions:
        #     logger.error(f"__add_user_to_game: user_id: {user_id} has a running game session")
        #     raise msg_server.CommandError(f"join game: user_id: {user_id} has a running game session", error_code=msg_server.WebsocketErrorCode.ALREADY_RUNNING_GAME_SESSION)
        
        if self.gameScheduleObj.player_one.user == user or self.gameScheduleObj.player_two.user == user:
            self.connected_user_ids.add(user.pk)
            self.__running_user_sessions[user.pk] = self.game_group_name
        else:
            logger.error(f"__add_user_to_game: user_id: {user_id} not participant of the game")
            raise msg_server.CommandError(f"join game: user_id: {user_id} not participant of the game", error_code=msg_server.WebsocketErrorCode.USER_NO_PARTICIPANT)
        

    async def __start_game(self):
        logger.debug(f"GameHandle: __start_game")
        logger.debug(f"self.game: {self.game}")
        # logger.debug(f"self.game.is_alive(): {self.game.is_alive()}")
        logger.debug(f"self.gameScheduleObj: {self.gameScheduleObj}")
        if self.game and not self.game.is_alive() and self.gameScheduleObj:
            self.game.start()
            self.last_action = time.time()
            if (self.join_timeout_task):
                self.join_timeout_task.cancel()
            self.join_timeout_task = None
            self.start_game_timeout_task = None
            self.idle_timeout_task = asyncio.get_running_loop().create_task(self.__idle_timeout())
        else:
            logger.error(f"Error starting the game: Game start error!")
            raise RuntimeError("start_game: Game already started")


    async def __player_join_reconnect_game_running(self, user_id: int):
        if user_id in self.reconnect_tasks:
            logger.info(f"GameHandle: player_join: running game: user {user_id} in reconnect_tasks, cancel reconnect timeout")
            task = self.reconnect_tasks.pop(user_id)
            task.cancel()
            self.connected_user_ids.add(user_id)
            if (len(self.reconnect_tasks) == 0):
                logger.info(f"GameHandle: player_join: running game: all reconnections resolved, push cmd to game to resume")
                await self.push_action(user_id, self.__messenger.user_reconnected(user_id=user_id))
            if not await msg_server.async_send_to_consumer(
                msg_server.UserReconnected(user_id=user_id),
                group_name=self.game_group_name
            ):
                logger.error(f"GameHandle: player_disconnected: {self.game_group_name}: unable to send to consumer")
        else:
            logger.error(f"GameHandle: player_join: running game: user {user_id} is not part of the game")
            raise RuntimeError(f"join game: user_id: {user_id} not participant of the game")

    async def __player_join_game_not_running(self, user_id: int, schedule_id: int):
        handle = GameHandle.get_user_session_game_handle(user_id)
        if handle is self:
            if user_id not in self.connected_user_ids:
                logger.info(f"GameHandle: player_join: user: {user_id} reconnected, but game ot started")
                self.connected_user_ids.add(user_id)
            else:
                logger.error(f"Error: GameHandle: player_join: user: {user_id} is already connected")
                raise msg_server.CommandError("User already connected", error_code=msg_server.WebsocketErrorCode.ALREADY_CONNECTED)
        elif handle is not None:
            logger.error(f"Error: GameHandle: player_join: user: {user_id} has a session in a different game")
            raise msg_server.CommandError("User has a running session", error_code=msg_server.WebsocketErrorCode.ALREADY_RUNNING_GAME_SESSION)
        else:
            logger.info(f"GameHandle: player_join: user: {user_id} added new to the game: {self.game_group_name}")
            await self.__add_user_to_game(user_id, schedule_id)

    async def player_join(self, user_id: int, schedule_id: int):
        if self.game and self.game.is_alive():
            await self.__player_join_reconnect_game_running(user_id)
        else:
            await self.__player_join_game_not_running(user_id, schedule_id)
        
        if self.all_players_connected() and self.start_game_timeout_task is None:
            logger.info(f"GameHandle: player_join: all users connected, start start_game_timeout. users: {self.connected_user_ids}")
            self.start_game_timeout_task = asyncio.get_running_loop().create_task(self.__start_game_timeout())
            self.q: queue.Queue[msg_client.GameEngineMessage] = queue.Queue()
            self.game = PongGame(self.settings, self.game_group_name, self.q, self.gameScheduleObj, self.channel_alias)
            jooda = self.game.get_initial_game_data(START_GAME_TIMEOUT)
            # print(f"jodaa", jooda.to_dict())
            await msg_server.async_send_to_consumer(jooda, group_name=self.game_group_name)
            # await self.__start_game()
        

    async def push_action(self, user_id: int, action: msg_client.GameEngineMessage):
        if user_id not in self.connected_user_ids:
            # logger.error(f"GameHandle: push_action: user: {user_id} not part of the game, command: {action}")
            raise RuntimeError(f"unable to push action, user not part of the game")
        elif self.game and self.game.is_alive():
            # logger.info(f"GameHandle: push_action: user: {user_id}, command: {action}")
            self.last_action = time.time()
            self.q.put_nowait(action)
        else:
            logger.error(f"Error: GameHandle: push_action: game not started. user: {user_id}, command: {action}")
            raise RuntimeError(f"Game not started")


    async def __quit(self, user_id: int | None):
        if self.game and self.game.is_alive():
            logger.info(f"GameHandle: __quit: quit the game {self.game_group_name}, user: {user_id}")
            if not user_id:
                cmd = self.__messenger.timeout()
            else:
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

        # self.reconnect_tasks.clear()
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
                future = asyncio.get_running_loop().run_in_executor(executor, 
                functools.partial(join_game_thread_executor, game))
                # future.add_done_callback(lambda future: print("future done: ", future))
                await future
                
            except Exception as e:
                logger.error(f"join error: {e}")


def join_game_thread_executor(game: PongGame):
    try:
        game.join()
    except Exception as e:
        logger.error(f"join error in thread: {e}")

