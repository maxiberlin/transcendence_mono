from .game import PongGame
from .pong_settings import PongSettings
import logging
import threading
import queue
from typing import Tuple


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
        self.lock = threading.Lock()

    def start_game(self, room_group_name):
        if room_group_name in self.games:
            with self.lock:
                game_thread_dict: PongGame = self.games[room_group_name]
                try:
                    game_thread: PongGame = game_thread_dict["game_thread"]
                    game_thread.start()
                    game_thread_dict["running"] = True
                    print(f"Game {room_group_name} started.")
                    return True
                except Exception as e:
                    logger.error(f"Error starting game: {e}")
                    return False
        return False


    def stop_game(self, room_group_name):
        with self.lock:
            game_thread_dict: PongGame = self.games.pop(room_group_name, None)
            if game_thread_dict:
                game_thread: PongGame = game_thread_dict["game_thread"]
                game_thread.stop_game()
                game_thread.join()
                game_thread_dict["game_thread"] = None
                print(f"Game {room_group_name} stopped.")
                return True
        return False


    def add_game(self, settings: PongSettings, channel_layer, room_group_name):
        if room_group_name not in self.games:
            q = queue.Queue()
            game_thread = PongGame(settings, channel_layer, room_group_name, q)
            self.games[room_group_name] = {"game_thread": game_thread, "queue": q, "running": False}
            # self.games[room_group_name] = (game_thread, q, False)
            return game_thread
        return None

    def get_game(self, room_group_name):
        with self.lock:
            game_thread_dict = self.games.get(room_group_name, None)
            game_thread = game_thread_dict["game_thread"] if game_thread_dict else None
            if game_thread:
                return game_thread
        return None

    def push_action(self, room_group_name, action):
        game_thread_dict = self.games.get(room_group_name, None)
        # print("push_action")
        # print(action)
        # print("dict")
        # print(game_thread_dict)
        if game_thread_dict and game_thread_dict["running"]:
            q: queue.Queue = game_thread_dict["queue"]
            # print("queue")
            # print(q)
            try: 
                q.put(action)
                return True 
            except queue.Full:
                logger.error("Action queue is full")
        return False
