from .game import PongGame
from .pong_settings import PongSettings
import logging
import queue
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


logger = logging.getLogger(__name__)
logger.addHandler(logging.StreamHandler(sys.stdout))


@database_sync_to_async
def get_game_schedule(self, schedule_id):
    try:
        return GameSchedule.objects.get(pk=schedule_id)
    except GameSchedule.DoesNotExist:
        return None


class GameConsumer(SyncConsumer):

    def __init__(self) -> None:
        super().__init__()

        self.running_user_sessions: dict[int, str] = {}
        self.games: dict[str, GameHandle] = {}
        self.channel_layer: RedisChannelLayer | None = get_channel_layer()
        if not self.channel_layer:
            raise RuntimeError("Channel layer not found")
        self.loop = asyncio.get_running_loop()

    
    def get_game_room_name(self, event: msg_client.GameEngineMessage):
        name = event["game_group_name"]
        print(f"get_game_room_name: {name}")
        if not name or not isinstance(name, str):
            raise RuntimeError("Invalid room_group_name for game")
        print("return name")
        return name


    def send_command_response(self, event: msg_client.GameEngineMessage, success: bool, message: str,
        status_code: msg_client.WebsocketErrorCode = msg_client.WebsocketErrorCode.OK, payload: dict | None = None):
        # print(f"send_command_response: {event}")
        if not isinstance(event["client_command"]["id"], int):
            raise RuntimeError("Invalid id")
        if not self.channel_layer:
            raise RuntimeError("Channel layer not initialized")
        msg: msg_client.GameEngineMessageResponse = {
            "type": "handle_command_response",
            "channel_name": "",
            "response": {
                "success": success,
                "id": event["client_command"]["id"],
                "cmd": event["client_command"]["cmd"],
                "message": message,
                "status_code": status_code.value,
                "payload": payload
            }
        }
        # async_to_sync(self.channel_layer.send)(event["consumer_channel_name"], msg)
        self.send(msg)

    def create_game(self, name: str, event: msg_client.ClientCreateGameCommand):
        print("GameConsumer: handle_command: client-create-game")
        if name not in self.games:
            schedule_id = event["payload"]["schedule_id"]
            client_game_settings = event["payload"]["game_settings"]
            self.games[name] = GameHandle(schedule_id, PongSettings(), name)

    async def reconnect_timeout(self, user_id: int, name: str):
        await asyncio.sleep(10)
        if name in self.games:
            try:
                self.quit_game(name)
            except Exception as e:
                print(f"Error in reconnect_timeout: {e}")
            if self.channel_layer:
                # await self.channel_layer.group_send(name, msg_server.OpponentDisconnected(user_id=user_id).to_dict())
                await sync_to_async(self.send)(msg_server.OpponentDisconnected(user_id=user_id).to_dict())

    async def join_timeout(self, name: str):
        await asyncio.sleep(3)
        if len(self.games[name].users) < 2:
            try:
                self.quit_game(name)
            except Exception as e:
                print(f"Error in reconnect_timeout: {e}")
            if self.channel_layer:
                # await self.channel_layer.group_send(name, msg_server.GameJoinTimeout().to_dict())
                await sync_to_async(self.send)(msg_server.GameJoinTimeout().to_dict())

    def join_game(self, name: str, event: msg_client.ClientJoinCommand):
        print("GameConsumer: handle_command: client-join-game")
        user_id: int = event["payload"]["user_id"]
        if name not in self.games:
            raise RuntimeError("Game not found")
        if user_id in self.running_user_sessions:
            raise RuntimeError("User has already a running game session")
        self.games[name].player_join(user_id)
        self.running_user_sessions[user_id] = name
        self.loop.create_task(self.join_timeout(name))
        


    def quit_game(self, name: str):
        print("GameConsumer: handle_command: client-quit-game")
        if name not in self.games:
            raise RuntimeError("Game not found")
        game_handle = self.games[name]
        game_handle.stop_game()
        for user in game_handle.users:
            del self.running_user_sessions[user.pk]
        del self.games[name]


    def handle_command(self, event: msg_client.GameEngineMessage):
        print("GameConsumer: handle_command")
        payload = None
        try:
            name = self.get_game_room_name(event)
            print(f"command is: {event['client_command']['cmd']}")
            match event["client_command"]["cmd"]:

                case "client-disconnected":
                    user_id = event["client_command"]["payload"]["user_id"]
                    if name in self.games and user_id:
                        self.loop.create_task(self.reconnect_timeout(user_id, name))
                        game_handle = self.games[name]
                        game_handle.users.remove(next(user for user in game_handle.users if user.pk == user_id))

                case "client-get-curent-session":
                    payload = {
                        "session_name": self.running_user_sessions[event["client_command"]["payload"]["user_id"]]
                    }
                case "client-create-game":
                    self.create_game(name, event["client_command"])
                case "client-join-game":
                    self.join_game(name, event["client_command"])
                case "client-quit-game":
                    self.quit_game(name)

                case "client-move" | "client-pause" | "client-resume":
                    print("GameConsumer: handle_command: client-move, client-pause, client-resume")
                    if name not in self.games:
                        raise RuntimeError("Game not found")
                    self.games[name].push_action(event["client_command"])

                case _:
                    raise RuntimeError("Invalid command")

            self.send_command_response(event, True, f"command {event['client_command']['cmd']} handled successfully", msg_client.WebsocketErrorCode.OK, payload)

        except msg_client.CommandError as e:
            logger.error(f"Error handling message: {e}")
            self.send_command_response(event, False, f"Error handling message: {e}", e.error_code)
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            self.send_command_response(event, False, f"Error handling message: {e}", msg_client.WebsocketErrorCode.DEFAULT_ERROR)




class GameHandle:
    def __init__(self, schedule_id: int, settings: PongSettings, room_group_name: str, channel_alias: str | None = None):
        
        self.gameScheduleObj = GameSchedule.objects.get(pk=schedule_id)
        if not self.gameScheduleObj:
            raise RuntimeError(f"Game not found: schedule_id: {schedule_id}")
        self.q: queue.Queue[msg_client.ClientCommand] = queue.Queue()
        self.room_group_name = room_group_name
        self.game = PongGame(settings, room_group_name, self.q, self.gameScheduleObj, channel_alias)
        self.users: set[UserAccount] = set()


    def player_join(self, user_id: int):
        if self.game.is_alive():
            raise RuntimeError("player_join: Game already started")
        user = UserAccount.objects.get(pk=user_id)
        if not user:
            raise RuntimeError(f"User not found: user_id: {user_id}")
        if self.gameScheduleObj.player_one.user == user or self.gameScheduleObj.player_two.user == user:
            self.users.add(user)
        else:
            raise RuntimeError(f"User not in game: user_id: {user_id}")
        if len(self.users) == 2:
            self.start_game()
        


    def start_game(self):
        if self.game.is_alive():
            raise RuntimeError("start_game: Game already started")
        print("start game!!")
        self.game.start()
            

    def stop_game(self):
        if not self.game.is_alive():
            raise RuntimeError("stop_game: Game not started")
        self.game.stop_game()
        self.game.join()
        print("GameHandle: stop_game: game joined")
        del self.game


    def push_action(self, action: msg_client.ClientCommand):
        if not self.game.is_alive():
            raise RuntimeError("push_action: Game not started")
        self.q.put(action)


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
#             raise RuntimeError("Invalid room_group_name for game")
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
#     def __init__(self, schedule_id: int, settings: PongSettings, room_group_name: str, channel_alias: str | None = None):
        
#         self.gameScheduleObj = GameSchedule.objects.get(pk=schedule_id)
#         if not self.gameScheduleObj:
#             raise RuntimeError(f"Game not found: schedule_id: {schedule_id}")
#         self.q: queue.Queue[msg_client.ClientCommand] = queue.Queue()
#         self.room_group_name = room_group_name
#         self.game = PongGame(settings, room_group_name, self.q, self.gameScheduleObj, channel_alias)
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
