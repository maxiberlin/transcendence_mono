import json
import threading
import time

from channels.generic.websocket import AsyncWebsocketConsumer

from channels.consumer import AsyncConsumer, SyncConsumer

from typing import TypeAlias, TypedDict

from game.models import GameSchedule
from user.models import UserAccount
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser


JSON: TypeAlias = dict[str, "JSON"] | list["JSON"] | str | int | float | bool | None
JSONObj: TypeAlias = dict[str, "JSON"]

class ObjPos:
    x: int
    y: int
    dx: int
    dy: int

class GameState:
    def __init__(self):
        pass

    ball_pos: ObjPos
    paddle_pos_left: ObjPos
    paddle_pos_right: ObjPos





class PlayerConsumer(AsyncWebsocketConsumer):


    @database_sync_to_async
    def get_game_session(schedule_id):
        try:
            return GameSchedule.objects.get(id=schedule_id)
        except:
            return None

    async def connect(self):

        schedule_id = self.scope["url_route"]["kwargs"]["schedule_id"]
        self.user : UserAccount | AnonymousUser = self.scope['user']

        game_session : GameSchedule | None = await self.get_game_session(schedule_id)
        if (type(self.user) != UserAccount or not game_session
            or not (game_session.player_one.user == self.user or game_session.player_two.user == self.user)):
            return
        self.group_name = f"pong_game_match_{schedule_id}"



        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()



    async def disconnect(self):
        pass

    async def game_update(self, event):
        state = event["state"]
        await self.send(json.dumps(state))

    async def receive(self, text_data=None, bytes_data=None):
        content = json.loads(text_data)
        msg_type = content["type"]
        msg = content["msg"]
        if msg_type == "direction":
            return await self.direction(msg)
        elif msg_type == "join":
            return await self.join(msg)
        
    async def join(msg):
        pass

    async def direction(self, msg: dict):
        await self.channel_layer.send(
            "game_engine",
            {
                "type": "player.direction", 
                "player": self.username, 
                "direction": msg["direction"]
            },
        )





class GameEngine(threading.Thread):
    def __init__(self, *args, **kwargs):
        self.tick_rate = 123

    def run(self) -> None:
        while True:
            self.state = self.tick()
            self.broadcast_state(self.state)
            time.sleep(self.tick_rate)

  

    def tick(self):
        pass


class GameConsumer(SyncConsumer):
    def __init__(self, *args, **kwargs):
        """
        Created on demand when the first player joins.
        """
        super().__init__(*args, **kwargs)
        self.group_name = "snek_game"
        self.engine = GameEngine(self.group_name)
        self.engine.start()

      

