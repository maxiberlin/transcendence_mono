from decimal import Decimal
# from .pong_objs import PongObj
from .game_base_class import GameObjDataClass, Collision
from .pong_settings import InitialServe, PongSettings
from enum import Enum


class PongPaddle(GameObjDataClass):
    class PaddlePos:
        LEFT = 10
        RIGHT = 20

    class Dir(Enum):
        NONE = Decimal(0)
        UP = Decimal(-1)
        DOWN = Decimal(1)

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
        self.speed_y: Decimal = Decimal(
            settings.paddle_speed / settings.height)

    def update_pos_direct(self, y: Decimal):
        self.y = max(self.bound_top, min(y, self.bound_bottom - self.h))

    def update_pos_by_dir(self, tick: float):
        new_y = self.y + Decimal(tick) * self.dy * self.speed_y
        self.update_pos_direct(y=new_y)

    def set_direction(self, dir: Dir, release: bool):
        if release and self.dy == dir:
            self.dy = PongPaddle.Dir.NONE.value
        elif not release:
            self.dy = dir.value
