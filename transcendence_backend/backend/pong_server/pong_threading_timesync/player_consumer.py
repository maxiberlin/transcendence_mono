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

            if not self.user.is_authenticated or not self.channel_layer:
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

            self.pong_message = PongMessage(
                self.channel_layer, self.room_group_name)

            self.game_manager = GameManager()

            pong_game: PongGame | None = await sync_to_async(self.game_manager.get_game)(self.room_group_name)
            if not pong_game:
                settings = PongSettings()
                pong_game = await sync_to_async(self.game_manager.add_game)(settings, self.channel_layer, self.room_group_name)

            if not pong_game:
                await self.close()
                return

            logger.error(f"my group name: {self.room_group_name}")
            logger.error(
                f"current game connected players: {pong_game.players_connected}")
            pong_game.players_connected += 1
            settings = pong_game.settings

            # court: PongGameplayTypes.GameObjData;
            # ball: PongGameplayTypes.GameObjData;
            # paddle_left: PongGameplayTypes.GameObjData;
            # paddle_right: PongGameplayTypes.GameObjData;
            # settings: PongGameplayTypes.GameSettings;
            await self.pong_message.send_to_channel_layer(
                MessageType.INIT_GAME,
                {
                    'settings': settings.to_dict(),
                    'state': pong_game.get_game_state()
                }
            )

            if pong_game.players_connected < 2:
                await self.send(text_data=json.dumps(self.pong_message
                                .create_message(MessageType.WAITING_FOR_OPPONENT)))
            else:
                await self.pong_message.send_to_channel_layer(
                    MessageType.START_GAME
                )
                await sync_to_async(self.game_manager.start_game)(self.room_group_name)

        except Exception as e:
            logger.error(f"Error during connection: {e}")
            await self.pong_message.send_to_channel_layer(MessageType.GAME_ERROR, {'error': e})

    async def disconnect(self, close_code):
        try:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

            pong_game = await sync_to_async(self.game_manager.get_game)(self.room_group_name)
            # pong_game = game_manager.get_game(self.room_group_name)
            if pong_game:
                pong_game.players_connected -= 1
                if pong_game.players_connected == 0:
                    await sync_to_async(self.game_manager.stop_game)(self.room_group_name)
            await self.close()
        except Exception as e:
            logger.error(f"Error during disconnection: {e}")
            await self.pong_message.send_to_channel_layer(MessageType.GAME_ERROR, {'error': e})

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)

            await sync_to_async(self.game_manager.push_action)(self.room_group_name, text_data_json)
            # await sync_to_async(pong_game.process_player_input)(text_data_json)
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            await self.pong_message.send_to_channel_layer(MessageType.GAME_ERROR, {'error': e})

    async def forward_message(self, event):
        try:
            message = event['message']
            await self.send(text_data=json.dumps(message))
        except Exception as e:
            logger.error(f"Error forwarding message: {e}")
            await self.pong_message.send_to_channel_layer(MessageType.GAME_ERROR, {'error': e})

    async def game_end(self, event):
        try:
            message = event['message']
            await self.cleanup_game_data()
            await self.send(text_data=json.dumps(message))
        except Exception as e:
            logger.error(f"Error during game end: {e}")
            await self.pong_message.send_to_channel_layer(MessageType.GAME_ERROR, {'error': e})

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
            # Lösche die Spieldaten
            await sync_to_async(self.game_manager.stop_game)(self.room_group_name)
            logger.error("clearing game data")
        except Exception as e:
            logger.error(f"Error cleaning up game data: {e}")
            await self.pong_message.send_to_channel_layer(MessageType.GAME_ERROR, {'error': e})

    @database_sync_to_async
    def get_game_schedule(self, schedule_id):
        try:
            return GameSchedule.objects.get(pk=schedule_id)
        except GameSchedule.DoesNotExist:
            return None

    @database_sync_to_async
    def is_user_part_of_game(self, game_schedule, user):
        return game_schedule.player_one.user == user or game_schedule.player_two.user == user
