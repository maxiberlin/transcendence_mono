import json
import logging

from channels.generic.websocket import AsyncWebsocketConsumer
from game.models import GameSchedule
from .game_manager import GameManager
from .game import PongGame
from .pong_settings import PongSettings
from asgiref.sync import sync_to_async
from .messages import PongMessage, MessageType
from channels.db import database_sync_to_async


logger = logging.getLogger(__name__)

class PlayerConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
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

            self.pong_message = PongMessage(self.channel_layer, self.room_group_name)

            game_manager = GameManager()

            pong_game: PongGame = game_manager.get_game(self.room_group_name)
            if not pong_game:
                settings = PongSettings()
                pong_game = game_manager.add_game(settings, self.channel_layer, self.room_group_name)

            
            logger.error(f"my group name: {self.room_group_name}")
            logger.error(f"current game connected players: {pong_game.players_connected}")
            pong_game.players_connected += 1
            settings = pong_game.settings
            await self.pong_message.send_to_channel_layer(
                MessageType.INIT_GAME,
                {'settings': settings.to_dict()}
            )
            await self.pong_message.send_to_channel_layer(
                MessageType.GAME_UPDATE,
                {'state': pong_game.get_game_state()}
            )

            if pong_game.players_connected < 2:
                await self.send(text_data=json.dumps(self.pong_message
                                .create_message(MessageType.WAITING_FOR_OPPONENT)))
            else:
                await self.pong_message.send_to_channel_layer(
                    MessageType.START_GAME
                )
                game_manager.start_game(self.room_group_name)
                
        except Exception as e:
            logger.error(f"Error during connection: {e}")
            self.pong_message.send_to_channel_layer(MessageType.GAME_ERROR, {'error': e})
            

    async def disconnect(self, close_code):
        try:
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
        except Exception as e:
            logger.error(f"Error during disconnection: {e}")
            self.pong_message.send_to_channel_layer(MessageType.GAME_ERROR, {'error': e})

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)

            game_manager = GameManager()
            pong_game = game_manager.get_game(self.room_group_name)

            await sync_to_async(pong_game.process_player_input)(text_data_json)
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            self.pong_message.send_to_channel_layer(MessageType.GAME_ERROR, {'error': e})


    async def forward_message(self, event):
        try:
            message = event['message']
            await self.send(text_data=json.dumps(message))
        except Exception as e:
            logger.error(f"Error forwarding message: {e}")
            self.pong_message.send_to_channel_layer(MessageType.GAME_ERROR, {'error': e})


    async def game_end(self, event):
        try:
            message = event['message']
            await self.cleanup_game_data()
            await self.send(text_data=json.dumps(message))
        except Exception as e:
            logger.error(f"Error during game end: {e}")
            self.pong_message.send_to_channel_layer(MessageType.GAME_ERROR, {'error': e})

    async def game_error(self, event):
        try:
            message = event['message']
            logger.error(f"received error: {message}")
            await self.cleanup_game_data()
            await self.send(text_data=json.dumps(message))
        except Exception as e:
            logger.error(f"Error during game error: {e}")


    async def cleanup_game_data(self):
        try:
            game_manager = GameManager()
            game_manager.stop_game(self.room_group_name)  # Lösche die Spieldaten
            logger.error("clearing game data")
        except Exception as e:
            logger.error(f"Error cleaning up game data: {e}")
            self.pong_message.send_to_channel_layer(MessageType.GAME_ERROR, {'error': e})

    @database_sync_to_async
    def get_game_schedule(self, schedule_id):
        try:
            return GameSchedule.objects.get(pk=schedule_id)
        except GameSchedule.DoesNotExist:
            return None

    @database_sync_to_async
    def is_user_part_of_game(self, game_schedule, user):
        return game_schedule.player_one.user == user or game_schedule.player_two.user == user
