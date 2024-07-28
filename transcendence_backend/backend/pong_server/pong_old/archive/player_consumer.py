import json
import logging

import channels.layers

from channels.generic.websocket import AsyncWebsocketConsumer, AsyncJsonWebsocketConsumer
from game.models import GameSchedule
from .game_manager import GameManager, GameHandle
from .game import PongGame
from .pong_settings import PongSettings
from asgiref.sync import sync_to_async
from channels.db import database_sync_to_async
# from .game_base import PlayerConsumerBase, ClientServerMessages, ClientServerMsgTypes
from .game_base import PlayerConsumerBase, ClientMessage, ChannelMessengerAsync


logger = logging.getLogger(__name__)


@database_sync_to_async
def get_game_schedule(self, schedule_id):
    try:
        return GameSchedule.objects.get(pk=schedule_id)
    except GameSchedule.DoesNotExist:
        return None


# @database_sync_to_async
# def is_user_part_of_game(self, game_schedule, user):
#     return game_schedule.player_one.user == user or game_schedule.player_two.user == user


class PlayerConsumer2(PlayerConsumerBase):

    async def connect(self):
        await super().connect()

        pass

    async def disconnect(self, close_code):
        pass

    async def on_client_message(self, clientMessage: ClientMessage):
        match clientMessage["tag"]:
            case "client-move":
                pass
            case "client_pause":
                pass
            case "client_resume":
                pass
            case "client_quit":
                pass
            case "client_surrender":
                pass
            case "client_disconnect":
                pass


class PlayerConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        try:
            logger.error(f"Scope: {self.scope}")
            self.schedule_id = self.scope['url_route']['kwargs']['schedule_id']
            self.user = self.scope["user"]
            self.room_group_name = f'game_{self.schedule_id}'

            if not self.channel_layer or not self.user.is_authenticated:
                await self.close()
                return

            self.game_schedule: GameSchedule = await get_game_schedule(self.schedule_id)
            if self.game_schedule is None:
                await self.close()
                return

            if self.game_schedule.player_one.user == self.user:
                self.side = 'left'
            elif self.game_schedule.player_two.user == self.user:
                self.side = 'right'
            else:
                await self.close()
                return

            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

            await self.accept()

            self.channel_messenger = ChannelMessengerAsync(
                self.room_group_name)
            self.game_handle = GameManager().getGameHandle(
                PongSettings(), self.room_group_name)

            pong_game: PongGame | None = await sync_to_async(self.game_manager.get_game)(self.room_group_name)
            if not pong_game:
                settings = PongSettings()
                pong_game = await sync_to_async(self.game_manager.add_game)(settings, self.channel_layer, self.room_group_name)

            if not pong_game:
                await self.close()
                return

            logger.error(f"my group name: {self.room_group_name}")
            logger.error(
                f"current game connected players: {pong_game.get_connected_players()}")
            pong_game.players_connected += 1
            settings = pong_game.settings
            await self.pong_message.send_to_channel_layer(
                MessageType.INIT_GAME,
                {
                    # 'settings': settings.to_dict(),
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
            if self.channel_layer:
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
            await sync_to_async(self.game_manager.stop_game)(self.room_group_name)
            logger.error("clearing game data")
        except Exception as e:
            logger.error(f"Error cleaning up game data: {e}")
            await self.pong_message.send_to_channel_layer(MessageType.GAME_ERROR, {'error': e})
