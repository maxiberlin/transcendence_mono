from multiprocessing.pool import ThreadPool
from .game import PongGame
from .pong_settings import PongSettings
import logging


logger = logging.getLogger(__name__)

class GameManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GameManager, cls).__new__(cls)
            cls._instance.init()
        return cls._instance

    def init(self):
        self.games = {}
        self.pool = ThreadPool(processes=4)

    def start_game(self, room_group_name):
        logger.error(f"my games: {self.games}")
        game: PongGame = self.games[room_group_name]
        if not game:
            return False
        
        self.pool.apply_async(game.start_game)
        return True

    def stop_game(self, room_group_name):
        if room_group_name in self.games:
            pong_game = self.games[room_group_name]
            pong_game.stop_game()
            del self.games[room_group_name]

    def add_game(self, settings: PongSettings, channel_layer, group_name):
        game = PongGame(settings, channel_layer, group_name)
        self.games[group_name] = game
        return game

    def get_game(self, room_group_name):
        return self.games.get(room_group_name)
