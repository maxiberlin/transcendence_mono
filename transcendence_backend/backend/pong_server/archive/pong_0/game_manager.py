from multiprocessing.pool import ThreadPool

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

    def start_game(self, room_group_name, pong_game):
        if room_group_name not in self.games:
            self.games[room_group_name] = pong_game
            self.pool.apply_async(pong_game.start_game)

    def stop_game(self, room_group_name):
        if room_group_name in self.games:
            pong_game = self.games[room_group_name]
            pong_game.stop_game()
            del self.games[room_group_name]

    def get_game(self, room_group_name):
        return self.games.get(room_group_name)