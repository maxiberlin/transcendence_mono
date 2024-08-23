import os
os.environ["PYTHONASYNCIODEBUG"] = "1"

import logging
from channels.consumer import AsyncConsumer
from game.models import GameSchedule
from channels.db import database_sync_to_async
from user.models import UserAccount
import sys
from typing import Final
import asyncio
import time


GAME_CHANNEL_ALIAS = "default"
JOIN_TIMEOUT = 50
RECONNECT_TIMEOUT = 10
IDLE_TIMEOUT = 20000
START_GAME_TIMEOUT = 20

# logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
logger.setLevel(level=logging.DEBUG)
logHandler = logging.StreamHandler(sys.stdout)
logFormatter = logging.Formatter(fmt='%(levelname)-8s:: Game Engine: %(message)s')
logHandler.setFormatter(logFormatter)
logger.addHandler(logHandler)
logging.getLogger("asyncio").setLevel(logging.WARNING)



class GameConsumer(AsyncConsumer):


    # async def handle_command(self, event: msg_client.GameEngineMessage):
    #     try:
    #         # print(f"GAME ENGINE MESSAGE: {event}")
    #         cmd = event["client_command"]
    #         CMD_NAME: Final = cmd["cmd"]

    #         user_reconnected = False
    #         user_session_group_name = GameHandle.get_user_session_group_name(cmd["user_id"])
    #         if user_session_group_name is not None and user_session_group_name != event['game_group_name']:
    #             raise msg_server.CommandError("User has a running session", error_code=msg_server.WebsocketErrorCode.ALREADY_RUNNING_GAME_SESSION)
    #         if user_session_group_name is not None and CMD_NAME == 'client-join-game':
    #             user_reconnected = True
    #         game_handle = GameHandle.get_handle(event["game_group_name"])
    #         if game_handle is None and CMD_NAME == 'client-join-game':
    #             # print(f"game_handle is None: create handle! {game_handle}")
    #             game_handle = GameHandle.create_handle(event["game_group_name"])
            
                
    #         if game_handle is not None:
    #             if CMD_NAME == 'client-join-game':
    #                 schedule_id: Final = cmd.get("schedule_id")
    #                 # logger.info(f"user {cmd['user_id']} joined game {event['game_group_name']} -> schedule_id: {schedule_id}")
    #                 # print(f"type of schedule id: {type(schedule_id)}")
    #                 if not isinstance(schedule_id, int):
    #                     raise RuntimeError("client-join-game: INVALID SCHEDULE ID")
    #                 await game_handle.player_join(cmd["user_id"], schedule_id, user_reconnected)
    #                 await msg_client.async_send_command_response(event, True, f"command {cmd['cmd']} handled successfully", msg_server.WebsocketErrorCode.OK)

    #             elif CMD_NAME == "client-disconnected":
    #                 # logger.info(f"user {cmd['user_id']} disconnected")
    #                 await game_handle.player_disconnected(cmd["user_id"])
    #                 await msg_client.async_send_command_response(event, True, f"command {cmd['cmd']} handled successfully", msg_server.WebsocketErrorCode.OK)

    #             # elif CMD_NAME == "client-leave-game":
    #             #     logger.info(f"user {cmd['user_id']} attempt to leave game {event['game_group_name']}")
    #             #     await GameHandle.remove_game(game_handle=game_handle, user_id=cmd["user_id"])
    #             #     await msg_client.async_send_command_response(event, True, f"command {cmd['cmd']} handled successfully", msg_server.WebsocketErrorCode.OK)

    #             elif CMD_NAME ==  "client-ready":
    #                 game_handle.player_ready(cmd['user_id'])
    #                 await msg_client.async_send_command_response(event, True, f"command {cmd['cmd']} handled successfully", msg_server.WebsocketErrorCode.OK)

    #             elif CMD_NAME == "client-move" or CMD_NAME == "client-pause" or CMD_NAME == "client-resume" or CMD_NAME == "client-leave-game":
    #                 # logger.info(f"user {cmd['user_id']} make command: {cmd['cmd']}")
    #                 await game_handle.push_action(cmd['user_id'], event)

    #             else:
    #                 logger.error(f"user {cmd['user_id']} invalid command: {cmd['cmd']}")
    #                 raise msg_server.CommandError("Invalid command", msg_server.WebsocketErrorCode.INVALID_COMMAND)
    #         else:
    #             logger.error(f"user {cmd['user_id']} invalid command: {cmd['cmd']}")
    #             raise msg_server.CommandError("Invalid command", msg_server.WebsocketErrorCode.INVALID_COMMAND)

            

    #     except msg_server.CommandError as e:
    #         logger.error(f"CommandError: {e}, code: {e.error_code}")
    #         await msg_client.async_send_command_response(event, False, f"Error handling message: {e}", e.error_code)
    #     except Exception as e:
    #         logger.error(f"Error handling message: {e}")
    #         await msg_client.async_send_command_response(event, False, f"Error handling message: {e}", msg_server.WebsocketErrorCode.DEFAULT_ERROR)


    def __init__(self) -> None:
        super().__init__()
    
    def internal_client_disconnected(self):
        pass

    def client_ready(self, command):
        pass

    def client_move(self):
        pass

    def client_pause(self):
        pass

    def client_resume(self):
        pass

    def client_join(self):
        pass

    def client_leave(self):
        pass    




