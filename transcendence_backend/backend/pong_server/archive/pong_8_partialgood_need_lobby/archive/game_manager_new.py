from .game import PongGame
from .pong_settings import PongSettings
import logging
import threading
import queue
from typing import Tuple, TypedDict, NotRequired
from .messages_client import ClientMessage
from channels.layers import get_channel_layer
from channels.consumer import SyncConsumer
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)


class GameManager(SyncConsumer):

    def __init__(self):
        self.games: dict[str, "GameHandle"] = {}

    # def handle_client_message(self, message: ClientMessage):
    #     room_group_name = message
    #     game_handle = self.getGameHandle()
    #     if game_handle:
    #         game_handle.push_action(message)
    #     else:
    #         logger.error("Game handle not found")

    def _delete_handle(self, room_group_name: str):
        handle = self.games.pop(room_group_name, None)
        del handle

    def getGameHandle(self, gameSettings: PongSettings, room_group_name: str) -> "GameHandle":
        game_handle = self.games.get(room_group_name, None)
        if not game_handle:
            game_handle = self.games[room_group_name] = GameHandle(
                gameSettings, room_group_name, self)
            self.games[room_group_name] = game_handle
        return game_handle


class GameHandle:
    def __init__(self, settings: PongSettings, room_group_name: str, gameManager: GameManager, channel_alias: str | None = None):
        channel_layer = get_channel_layer(
        ) if not channel_alias else get_channel_layer(alias=channel_alias)
        if not channel_layer:
            raise RuntimeError("Channel layer not found")
        self.q: queue.Queue[ClientMessage] = queue.Queue()
        self.game_thread = PongGame(settings, channel_layer,
                                    room_group_name, self.q)

        self.room_group_name = room_group_name
        self.started = False

    def __del__(self):
        self.quit_game()

    def start_game(self):
        if not self.started:
            self.game_thread.start()
            self.started = True
        else:
            logger.error("Game already started")

    def quit_game(self):
        if self.started:
            self.game_thread.stop_game()
            self.game_thread.join()
            if self.game_thread.is_alive():
                logger.error("Game thread could not be stopped")
            self.started = False
            del self.game_thread
            self.gameManager._delete_handle(self.room_group_name)
        else:
            logger.error("Game not started")

    def push_action(self, action: ClientMessage):
        if self.started:
            try:
                self.q.put(action)
            except queue.Full:
                logger.error("Action queue is full")
        else:
            logger.error("Game not started")


# class GameManager(SyncConsumer):

#     def __init__(self):
#         self.games: dict[str, "GameHandle"] = {}

#     # def handle_client_message(self, message: ClientMessage):
#     #     room_group_name = message
#     #     game_handle = self.getGameHandle()
#     #     if game_handle:
#     #         game_handle.push_action(message)
#     #     else:
#     #         logger.error("Game handle not found")

#     def _delete_handle(self, room_group_name: str):
#         handle = self.games.pop(room_group_name, None)
#         del handle

#     def getGameHandle(self, gameSettings: PongSettings, room_group_name: str) -> "GameHandle":
#         game_handle = self.games.get(room_group_name, None)
#         if not game_handle:
#             game_handle = self.games[room_group_name] = GameHandle(
#                 gameSettings, room_group_name, self)
#             self.games[room_group_name] = game_handle
#         return game_handle


# class GameHandle:
#     def __init__(self, settings: PongSettings, room_group_name: str, gameManager: GameManager, channel_alias: str | None = None):
#         channel_layer = get_channel_layer(
#         ) if not channel_alias else get_channel_layer(alias=channel_alias)
#         if not channel_layer:
#             raise RuntimeError("Channel layer not found")
#         self.q: queue.Queue[ClientMessage] = queue.Queue()
#         self.game_thread = PongGame(settings, channel_layer,
#                                     room_group_name, self.q)

#         self.room_group_name = room_group_name
#         self.started = False

#     def __del__(self):
#         self.quit_game()

#     def start_game(self):
#         if not self.started:
#             self.game_thread.start()
#             self.started = True
#         else:
#             logger.error("Game already started")

#     def quit_game(self):
#         if self.started:
#             self.game_thread.stop_game()
#             self.game_thread.join()
#             if self.game_thread.is_alive():
#                 logger.error("Game thread could not be stopped")
#             self.started = False
#             del self.game_thread
#             self.gameManager._delete_handle(self.room_group_name)
#         else:
#             logger.error("Game not started")

#     def push_action(self, action: ClientMessage):
#         if self.started:
#             try:
#                 self.q.put(action)
#             except queue.Full:
#                 logger.error("Action queue is full")
#         else:
#             logger.error("Game not started")


# class GameManager:
#     _instance = None

#     def __new__(cls):
#         if cls._instance is None:
#             cls._instance = super(GameManager, cls).__new__(cls)
#             cls._instance.init()
#         return cls._instance

#     def init(self):
#         self.games: dict[str, "GameHandle"] = {}
#         self.lock = threading.Lock()

#     def _delete_handle(self, room_group_name: str):
#         with self.lock:
#             handle = self.games.pop(room_group_name, None)
#             del handle

#     def getGameHandle(self, gameSettings: PongSettings, room_group_name: str) -> "GameHandle":
#         with self.lock:
#             game_handle = self.games.get(room_group_name, None)
#             if not game_handle:
#                 game_handle = self.games[room_group_name] = GameHandle(
#                     gameSettings, room_group_name, self)
#             return game_handle


# class GameHandle:
#     def __init__(self, settings: PongSettings, room_group_name: str, gameManager: GameManager, channel_alias: str | None = None):
#         channel_layer = get_channel_layer(
#         ) if not channel_alias else get_channel_layer(alias=channel_alias)
#         if not channel_layer:
#             raise RuntimeError("Channel layer not found")
#         self.q: queue.Queue[ClientMessage] = queue.Queue()
#         self.game_thread = PongGame(settings, channel_layer,
#                                     room_group_name, self.q)

#         self.room_group_name = room_group_name
#         self.gameManager = gameManager
#         self.started = False

#     def __del__(self):
#         self.quit_game()

#     def start_game(self):
#         if not self.started:
#             self.game_thread.start()
#             self.started = True
#         else:
#             logger.error("Game already started")

#     def quit_game(self):
#         if self.started:
#             self.game_thread.stop_game()
#             self.game_thread.join()
#             if self.game_thread.is_alive():
#                 logger.error("Game thread could not be stopped")
#             self.started = False
#             del self.game_thread
#             self.gameManager._delete_handle(self.room_group_name)
#         else:
#             logger.error("Game not started")

#     def push_action(self, action: ClientMessage):
#         if self.started:
#             try:
#                 self.q.put(action)
#             except queue.Full:
#                 logger.error("Action queue is full")
#         else:
#             logger.error("Game not started")


# class GameThreadDict(TypedDict):
#     game_thread: PongGame
#     queue: queue.Queue
#     running: bool


# logger = logging.getLogger(__name__)


# class GameManager:
#     _instance = None

#     def __new__(cls):
#         if cls._instance is None:
#             cls._instance = super(GameManager, cls).__new__(cls)
#             cls._instance.init()
#         return cls._instance

#     def init(self):
#         self.games = {}
#         self.lock = threading.Lock()

#     def start_game(self, room_group_name):
#         if room_group_name in self.games:
#             with self.lock:
#                 game_thread_dict: GameThreadDict = self.games[room_group_name]
#                 try:
#                     game_thread: PongGame = game_thread_dict['game_thread']
#                     game_thread.start()
#                     game_thread_dict["running"] = True
#                     print(f"Game {room_group_name} started.")
#                     return True
#                 except Exception as e:
#                     logger.error(f"Error starting game: {e}")
#                     return False
#         return False

#     def stop_game(self, room_group_name):
#         with self.lock:
#             game_thread_dict: GameThreadDict = self.games.pop(
#                 room_group_name, None)
#             if game_thread_dict:
#                 if game_thread_dict["running"] == False:
#                     print(f"Game {room_group_name} was not running.")
#                     return True
#                 game_thread: PongGame = game_thread_dict["game_thread"]
#                 game_thread.stop_game()
#                 game_thread.join()
#                 del game_thread_dict
#                 print(f"Game {room_group_name} stopped.")
#                 return True
#         return False

#     def add_game(self, settings: PongSettings, channel_layer, room_group_name):
#         if room_group_name not in self.games:
#             q = queue.Queue()
#             game_thread = PongGame(settings, channel_layer, room_group_name, q)
#             self.games[room_group_name] = {
#                 "game_thread": game_thread, "queue": q, "running": False}
#             # self.games[room_group_name] = (game_thread, q, False)
#             return game_thread
#         return None

#     def get_game(self, room_group_name):
#         with self.lock:
#             game_thread_dict = self.games.get(room_group_name, None)
#             game_thread = game_thread_dict["game_thread"] if game_thread_dict else None
#             if game_thread:
#                 return game_thread
#         return None

#     def push_action(self, room_group_name, action):
#         game_thread_dict = self.games.get(room_group_name, None)
#         # print("push_action")
#         # print(action)
#         # print("dict")
#         # print(game_thread_dict)
#         if game_thread_dict and game_thread_dict["running"]:
#             q: queue.Queue = game_thread_dict["queue"]
#             # print("queue")
#             # print(q)
#             try:
#                 q.put(action)
#                 return True
#             except queue.Full:
#                 logger.error("Action queue is full")
#         return False
