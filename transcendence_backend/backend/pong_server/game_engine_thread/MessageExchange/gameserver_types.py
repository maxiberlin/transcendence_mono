from typing import Literal, TypedDict
from .client_types import ClientResponse, ClientCommand, InternalCommand

    # type: Literal["handle_command"]
    # game_group_name: str
class GameEngineMessage(TypedDict):
    game_channel: str
    consumer_channel: str
    client_command: ClientCommand | InternalCommand


class GameEngineMessageResponse(TypedDict):
    type: Literal["handle_command_response"]
    response: ClientResponse

