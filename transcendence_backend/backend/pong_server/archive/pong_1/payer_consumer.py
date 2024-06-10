import json
from channels.generic.websocket import AsyncWebsocketConsumer
from .pong_objs import GameSchedule
from .game_manager import GameManager
from .game import PongGame
from .pong_settings import PongSettings
from asgiref.sync import async_to_sync
from .messages import PongMessage, MessageType
from channels.db import database_sync_to_async



class PlayerConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.schedule_id = self.scope['url_route']['kwargs']['schedule_id']
        self.user = self.scope["user"]

        if not self.user.is_authenticated:
            await self.close()
            return

        game_schedule = await self.get_game_schedule(self.schedule_id)
        if game_schedule is None or not await self.is_user_part_of_game(game_schedule, self.user):
            await self.close()
            return

        self.game_schedule = game_schedule
        self.room_group_name = f'game_{self.schedule_id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        settings = PongSettings()
        await PongMessage.send_to_websocket(
            self,
            MessageType.START_GAME,
            {'settings': settings.to_dict()}
        )

        game_manager = GameManager()

        if not game_manager.get_game(self.room_group_name):
            pong_game = PongGame(settings, self.channel_layer, self.room_group_name)
            game_manager.start_game(self.room_group_name, pong_game)

        pong_game = game_manager.get_game(self.room_group_name)
        pong_game.players_connected += 1

        if pong_game.players_connected < 2:
            await PongMessage.send_to_websocket(
                self,
                MessageType.WAITING_FOR_OPPONENT,
                {'message': 'waiting for opponent'}
            )
        else:
            await PongMessage.send_to_channel_layer(
                self.channel_layer,
                self.room_group_name,
                MessageType.START_GAME,
                {'message': 'both players connected', 'state': pong_game.get_state()}
            )


    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

        game_manager = GameManager()
        pong_game = game_manager.get_game(self.room_group_name)
        if pong_game:
            pong_game.players_connected -= 1
            if pong_game.players_connected == 0:
                game_manager.stop_game(self.room_group_name)


    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        player_id = self.user.username
        input_data = text_data_json['data']

        game_manager = GameManager()
        pong_game = game_manager.get_game(self.room_group_name)

        pong_game.process_player_input(player_id, input_data)


    async def forward_message(self, event):
        message = event['message']
        await PongMessage.send_to_websocket(self, message)


    async def game_end(self, event):
        data = event['message']['data']
        await PongMessage.send_to_websocket(
            self,
            MessageType.GAME_END,
            data
        )
        await self.cleanup_game_data()


    async def cleanup_game_data(self):
        game_manager = GameManager()
        game_manager.stop_game(self.room_group_name)  # Lösche die Spieldaten


    @database_sync_to_async
    def get_game_schedule(self, schedule_id):
        try:
            return GameSchedule.objects.get(pk=schedule_id)
        except GameSchedule.DoesNotExist:
            return None


    @database_sync_to_async
    def is_user_part_of_game(self, game_schedule, user):
        return game_schedule.player_one.user == user or game_schedule.player_two.user == user
