from enum import Enum

class ServeMode(Enum):
    WINNER = 1
    LOSER = 2
    RANDOM = 3

class InitialServe(Enum):
    LEFT = 1
    RIGHT = 2

class PongSettings:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PongSettings, cls).__new__(cls)
            cls._instance.init()
        return cls._instance

    def init(self) -> None:
        self.width: int = 30000
        self.height: int = 20000
        self.border_width: int = 600
        self.border_height: int = 600
        self.paddle_width: int = 600
        self.paddle_height: int = 2600
        self.paddle_speed: int = 4000
        self.wall_dist: int = 600
        self.ball_width: int = 600
        self.ball_height: int = 600
        self.ball_speed: int = 4000
        self.point_wait_time: float = 1
        self.serve_mode: ServeMode = ServeMode.WINNER
        self.initial_serve_to: InitialServe = InitialServe.LEFT
        self.max_score: int = 10
        self.tick_duration: float = 0.06  # Neue Variable für die Tick-Dauer

    def to_dict(self) -> dict:
        return {
            'width': self.width,
            'height': self.height,
            'border_width': self.border_width / self.width,
            'border_height': self.border_height / self.height,
            'paddle_width': self.paddle_width / self.width,
            'paddle_height': self.paddle_height / self.height,
            'paddle_speed': self.paddle_speed,
            'wall_dist': self.wall_dist / self.width,
            'ball_width': self.ball_width / self.width,
            'ball_height': self.ball_height / self.height,
            'ball_speed': self.ball_speed,
            'point_wait_time': self.point_wait_time,
            'serve_mode': self.serve_mode.name,
            'initial_serve_to': self.initial_serve_to.name,
            'max_score': self.max_score,
            'tick_duration': self.tick_duration
        }
