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

        self.border_size: int = 600

        self.paddle_width: int = 600
        self.paddle_height: int = 2600
        self.paddle_speed: int = 2000
        self.wall_dist: int = 600

        self.ball_width: int = 600
        self.ball_height: int = 600
        self.ball_speed: int = 2000
        self.point_wait_time: float = 1
        self.serve_mode: ServeMode = ServeMode.WINNER
        self.initial_serve_to: InitialServe = InitialServe.LEFT
        self.max_score: int = 10  # Neue Variable für die maximale Punktzahl

        self.tick_duration: float = 0.05

    def to_dict(self) -> dict:
        return {
            'width': self.width,
            'height': self.height,
            'border_size': self.border_size,
            'paddle_width': self.paddle_width,
            'paddle_height': self.paddle_height,
            'paddle_speed': self.paddle_speed,
            'wall_dist': self.wall_dist,
            'ball_width': self.ball_width,
            'ball_height': self.ball_height,
            'ball_speed': self.ball_speed,
            'point_wait_time': self.point_wait_time,
            'serve_mode': self.serve_mode.name,
            'initial_serve_to': self.initial_serve_to.name,
            'max_score': self.max_score,
            'tick_duration': self.tick_duration
        }