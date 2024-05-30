import json
from channels.generic.websocket import AsyncWebsocketConsumer
from game.models import GameSchedule
from .game_manager import GameManager  # Importiere GameManager aus einer passenden Datei
from .game_engine_old import PongGame, PongPaddle  # Importiere GameManager aus einer passenden Datei
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

        game_manager = GameManager()

        if not game_manager.get_game(self.room_group_name):
            pong_game = PongGame(800, 600, self.channel_layer, self.room_group_name)
            game_manager.start_game(self.room_group_name, pong_game)
        
        pong_game = game_manager.get_game(self.room_group_name)
        pong_game.players_connected += 1

        if pong_game.players_connected < 2:
            await self.send(text_data=json.dumps({
                'message': 'waiting for opponent'
            }))
        else:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'start_game',
                    'message': 'both players connected'
                }
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
        message = text_data_json['message']

        game_manager = GameManager()
        pong_game : PongGame = game_manager.get_game(self.room_group_name)

        if message == 'up':
            pong_game.set_paddle_direction('left', PongPaddle.Dir.UP, False)
        elif message == 'down':
            pong_game.set_paddle_direction('left', PongPaddle.Dir.DOWN, False)
        elif message == 'w':
            pong_game.set_paddle_direction('right', PongPaddle.Dir.UP, False)
        elif message == 's':
            pong_game.set_paddle_direction('right', PongPaddle.Dir.DOWN, False)
        elif message == 'release_up':
            pong_game.set_paddle_direction('left', PongPaddle.Dir.UP, True)
        elif message == 'release_down':
            pong_game.set_paddle_direction('left', PongPaddle.Dir.DOWN, True)
        elif message == 'release_w':
            pong_game.set_paddle_direction('right', PongPaddle.Dir.UP, True)
        elif message == 'release_s':
            pong_game.set_paddle_direction('right', PongPaddle.Dir.DOWN, True)

        state = pong_game.get_state()
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_update',
                'message': state
            }
        )

    async def game_update(self, event):
        state = event['message']
        await self.send(text_data=json.dumps({
            'message': state
        }))

    async def hide_ball(self, event):
        await self.send(text_data=json.dumps({
            'type': 'hide_ball'
        }))

    async def show_ball(self, event):
        state = event['message']
        await self.send(text_data=json.dumps({
            'type': 'show_ball',
            'message': state
        }))

    async def start_game(self, event):
        game_manager = GameManager()
        pong_game = game_manager.get_game(self.room_group_name)
        state = pong_game.get_state()
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'state': state
        }))


    @database_sync_to_async
    def get_game_schedule(self, schedule_id):
        try:
            return GameSchedule.objects.get(pk=schedule_id)
        except GameSchedule.DoesNotExist:
            return None

    @database_sync_to_async
    def is_user_part_of_game(self, game_schedule, user):
        return game_schedule.player_one.user == user or game_schedule.player_two.user == user
