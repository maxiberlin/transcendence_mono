from .client_types import ClientCommand, InternalCommand
from channels.layers import get_channel_layer
from .gameserver_types import GameEngineMessage
import logging

class InternalMessenger:

    def __init__(self, game_group_name: str, consumer_channel_name: str):
        self.channel_layer = get_channel_layer()
        self.game_group_name = game_group_name
        self.consumer_channel_name = consumer_channel_name

    

    async def push_to_game_engine(self, msg: GameEngineMessage | ClientCommand | InternalCommand) -> bool:
        if self.channel_layer:
            try:
                if "client_command" in msg:
                    await self.channel_layer.send("game_engine", msg)
                else:
                    await self.channel_layer.send("game_engine", self.__create_cmd(msg))
                return True
            except Exception as e:
                logging.error(f"Error Internal Messenger: push_to_game_engine: {e}")
        else:
            logging.error("Error Internal Messenger: push_to_game_engine: Channel Layer not configured")
        return False

    def __create_cmd(self, cmd: ClientCommand | InternalCommand) -> GameEngineMessage:
        return {
            "type": "handle_command",
            "game_group_name": self.game_group_name,
            "consumer_channel_name": self.consumer_channel_name,
            "client_command": cmd
        }

    def is_internal_command(self, command: ClientCommand | InternalCommand) -> bool:
        if "internal" not in command:
            return False
        return command["internal"] == 1

    def join_game(self, user_id: int, schedule_id: int) -> GameEngineMessage:
        return self.__create_cmd({
            "cmd": "client-join-game",
            "id": 0,
            "internal": 1,
            "user_id": user_id,
            "schedule_id": schedule_id
        })

    def leave_game(self, user_id: int) -> GameEngineMessage:
        return self.__create_cmd({
            "cmd": "client-leave-game",
            "id": 0,
            "user_id": user_id,
            "internal": 1,
        })

    def user_disconnected(self, user_id: int) -> GameEngineMessage:
        return self.__create_cmd({
            "cmd": "client-disconnected",
            "id": 0,
            "user_id": user_id,
            "internal": 1
        })

    def user_reconnected(self, user_id: int) -> GameEngineMessage:
        return self.__create_cmd({
            "cmd": "client-reconnected",
            "id": 0,
            "user_id": user_id,
            "internal": 1
        })
    
    def timeout(self) -> GameEngineMessage:
        return self.__create_cmd({
            "cmd": "client-timeout",
            "id": 0,
            "user_id": 0,
            "internal": 1
        })



async def async_send_command_response(event: GameEngineMessage, success: bool, message: str,
    status_code: WebsocketErrorCode = WebsocketErrorCode.OK, payload: Any = None) -> None:

    if not isinstance(event["client_command"]["id"], int):
        logging.error("Error: send_command_response: invalid id")
    msg: GameEngineMessageResponse = {
        "type": "handle_command_response",
        "response": {
            "success": success,
            "id": event["client_command"]["id"],
            "cmd": event["client_command"]["cmd"],
            "message": message,
            "status_code": status_code.value,
            "payload": payload
        }
    }
    layer = get_channel_layer()
    channel_name = event.get("consumer_channel_name", None)
    if layer:
        if channel_name and isinstance(channel_name, str):
            try:
                await layer.send(channel_name, msg)
            except Exception as e:
                logging.error(f"Error: send_command_response: send to channel {channel_name}: {e}")
        else:
            logging.error("Error: send_command_response: Channel name invalid")
    else:
        logging.error("Error: send_command_response: Channel layer not initialized")


@async_to_sync
async def sync_send_command_response(event: GameEngineMessage, success: bool, message: str,
    status_code: WebsocketErrorCode = WebsocketErrorCode.OK, payload: Any = None):
    await async_send_command_response(event, success, message, status_code, payload)
