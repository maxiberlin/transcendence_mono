from typing import TypedDict, TypeAlias, Union, Literal, Any

# JSONValue: TypeAlias = str | None | int | float | "JSONArray" | "JSONObject"
JSONValue: TypeAlias = Union[str, None, int, float, "JSONArray", "JSONObject"]
JSONArray: TypeAlias = list[JSONValue]
JSONObject: TypeAlias = dict[str, JSONValue]

class BaseCommand(TypedDict):
    module: str
    command: str

class CommandResponse(BaseCommand):
    success: bool
    payload: Any

class BaseEvent(TypedDict):
    msg_type: str

class ChannelsEvent(TypedDict):
    type: Literal["handle_event"]
    data: Any