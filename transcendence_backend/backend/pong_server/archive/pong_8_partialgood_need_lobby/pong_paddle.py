# from .pong_objs import PongObj
from .game_base_class import GameObjDataClass, Collision
from .pong_settings import PongSettings
from enum import Enum
from .messages_client import ClientMoveDirection


class PongPaddle(GameObjDataClass):
    class PaddlePos:
        LEFT = 10
        RIGHT = 20

    class Dir(Enum):
        NONE = 0
        UP = -1
        DOWN = 1

    def __init__(self, pos: int, settings: PongSettings) -> None:
        x = settings.wall_dist if pos == PongPaddle.PaddlePos.LEFT else settings.width - \
            (settings.paddle_width + settings.wall_dist)
        super().__init__(
            scaleX=settings.width,
            scaleY=settings.height,
            xU=x,
            yU=(settings.height // 2 - settings.paddle_height // 2),
            wU=settings.paddle_width,
            hU=settings.paddle_height,
            dx=PongPaddle.Dir.NONE.value,
            dy=PongPaddle.Dir.NONE.value,
            speedU=settings.paddle_speed,
        )

    def update_pos_direct(self, y: float):
        self.y = max(self.bound_top, min(y, self.bound_bottom - self.h))

    def update_pos_by_dir(self, tick: float):
        new_y = self.y + tick * self.dy * self.speed_y
        self.update_pos_direct(y=new_y)

    def set_direction(self, dir: Dir, release: bool):
        if release and self.dy == dir.value:
            self.dy = PongPaddle.Dir.NONE.value
        elif not release:
            self.dy = dir.value

    def set_direction2(self, action: ClientMoveDirection):
        match action:
            case "up":
                self.dy = PongPaddle.Dir.UP.value
            case "down":
                self.dy = PongPaddle.Dir.DOWN.value
            case "release_up":
                self.dy = PongPaddle.Dir.NONE.value if self.dy == PongPaddle.Dir.UP.value else self.dy
            case "release_down":
                self.dy = PongPaddle.Dir.NONE.value if self.dy == PongPaddle.Dir.DOWN.value else self.dy
            case _:
                raise ValueError("Invalid action")

