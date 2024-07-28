import json
from django.conf import settings
from datetime import datetime
from user.models import UserAccount
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.core.paginator import Paginator, InvalidPage, Page
from django.core.serializers import serialize
from channels.db import database_sync_to_async
from django.contrib.contenttypes.models import ContentType
from friends.models import FriendRequest, FriendList
from game.models import GameRequest
from notification.utils import LazyNotificationEncoder
from django.contrib.auth.decorators import login_required
from notification.constants import *
from notification.models import Notification, NotificationData
from typing import TypedDict, Literal, Unpack, Union
import time
from django.db.models.query import QuerySet
from chat_handler import ChatHandler
from chat_types import ChatCommands
from base_types import CommandResponse


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    
    def init_handlers(self):
        self.modules = {
            "chat": ChatHandler()
        }

    async def connect(self) -> None:
        print("NotificationConsumer: connect: " + str(self.scope["user"]) )
        self.newest_timestamp = time.time()
        self.user: UserAccount | None = self.scope["user"] if "user" in self.scope else None
        if not isinstance(self.user, UserAccount):
            await self.close()
        self.init_handlers()
        await self.accept()


    async def disconnect(self, code):
        print("NotificationConsumer: disconnect")
        
    async def send_command_error(self, module_name: str | None, command_name: str | None, error: str | None):
        res: CommandResponse = {
            "command": command_name if command_name else "unknown",
            "module": module_name if module_name else "unknown",
            "success": False,
            "payload": {
                "error": error
            }
        }
        await self.send_json(res)

    async def receive_json(self, content: ChatCommands):
        print(f"NotificationConsumer: receive_json. Command: {content}")
        command_name = content.get("command", None)
        module = content.get("module")
        handler = self.modules.get(module)
        if module is None or command_name is None or handler is None:
            await self.send_command_error(module, command_name, "does not exist")
        else:
            try:
                data: CommandResponse = await handler.execute_command(content)
                await self.send_json(data)
            except Exception as e:
                await self.send_command_error(module, command_name, str(e))

