from typing import Literal, TypedDict, TypeAlias
from decimal import Decimal
from user.models import UserAccount
from django.contrib.auth.models import AnonymousUser


class ClientConnectedMsg(TypedDict):
    tag: Literal["client-connected"]
    room_group_name: str
    user: UserAccount | AnonymousUser
    schedule_id: int


class ClientReadyMsg(TypedDict):
    tag: Literal["client-ready"]


class ClientSurrenderMsg(TypedDict):
    tag: Literal["client-surrender"]


class ClientMoveMsg(TypedDict):
    tag: Literal["client-move"]
    player_id: int
    action: Literal["up", "down", "release_up", "release_down"]
    new_y: Decimal


class ClientPauseMsg(TypedDict):
    tag: Literal["client-pause"]


class ClientResumeMsg(TypedDict):
    tag: Literal["client-resume"]


class ClientDisconnectMsg(TypedDict):
    tag: Literal["client-disconnect"]
    moin: int


ClientMessage: TypeAlias = ClientReadyMsg | ClientSurrenderMsg | ClientMoveMsg | ClientPauseMsg | ClientResumeMsg | ClientDisconnectMsg
