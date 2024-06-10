from channels.testing import WebsocketCommunicator
from channels.routing import URLRouter
from pong_server import routing as ps_routing
from django.test import TestCase, Client
from pong_server import consumers
from asgiref.sync import async_to_sync, sync_to_async

from user.models import UserAccount
from game.models import GameSchedule, GameRequest, Player
from game.utils import create_game_request
import time


def createUsersAndGameScheduleObject():
    user_one = UserAccount.objects.create_user(
        username="testuser1",
        password="testpassword",
        email="bla1@web.de",
    )
    player_one = Player.objects.create(user=user_one)
    user_two = UserAccount.objects.create_user(
        username="testuser2",
        password="testpassword",
        email="bla2@web.de",
    )
    player_two = Player.objects.create(user=user_two)
    game_request = create_game_request(
        user_one, user_two, 0, "1vs1", None)

    if game_request:
        game_request.accept()
        return user_one, user_two
    return None, None


class TestConsumer(TestCase):

    def setUp(self):
        self.user_one, self.user_two = createUsersAndGameScheduleObject()
        # self.user_one, self.user_two = await sync_to_async(createUsersAndGameScheduleObject)()

        # self.client = Client()
        # self.client.login(username="testuser1", password="testpassword")
        # await sync_to_async(self.client.login)(username="testuser1", password="testpassword")

        # application = URLRouter(ps_routing.websocket_urlpatterns)

        # self.communicator = WebsocketCommunicator(application, "/ws/game/1/")

    async def test_connect(self):

        application = URLRouter(ps_routing.websocket_urlpatterns)

        self.communicator1 = WebsocketCommunicator(application, "/ws/game/1/")
        self.communicator1.scope['user'] = self.user_one
        self.communicator2 = WebsocketCommunicator(application, "/ws/game/1/")
        self.communicator2.scope['user'] = self.user_two

        connected1, subprotocol = await self.communicator1.connect()
        self.assertEqual(connected1, True)
        time.sleep(2)
        connected2, subprotocol = await self.communicator2.connect()
        self.assertEqual(connected2, True)
        time.sleep(2)

        await self.communicator1.disconnect()
        await self.communicator2.disconnect()
