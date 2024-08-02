# from .pong_objs import PongObj
from .game_base_class import GameObjDataClass, Collision
from .pong_settings import PongSettings
from enum import Enum
import math
from .messages_client import ClientMoveDirection
from .messages_server import GameObjPositionDataclass
from dataclasses import dataclass

@dataclass(slots=True)
class ClientMoveItem:
    action: ClientMoveDirection | None
    new_y: float | None
    tick: int
    timediff_ms: float
    paddle: "PongPaddle"

class PongPaddle(GameObjDataClass):
    class PaddlePos:
        LEFT = 10
        RIGHT = 20

    class Dir(Enum):
        NONE = 0
        UP = -1
        DOWN = 1

    def __init__(self, pos: int, settings: PongSettings, court: GameObjDataClass) -> None:
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
            boundObj=court
        )






    def update_pos(self, tick: float):
        new_y = self.y + tick * self.dy * self.speed_y
        self.__update_pos(new_y)

    def trigger_action(self, move_item: ClientMoveItem):
        if move_item.action is not None:
            self.__set_direction(move_item.action)
        elif move_item.new_y is not None:
            self.__set_y_position(move_item.new_y)
            
    def reconcile_tick_list(self, oldState: GameObjPositionDataclass, move_item: list[ClientMoveItem], tick_duration_s: float):
        pass

    def reconcile_tick(self, oldState: GameObjPositionDataclass, move_item: ClientMoveItem | list[ClientMoveItem], tick_duration_s: float):
        super().setPositionalDataFromDataclass(oldState)
        if isinstance(move_item, ClientMoveItem):
            if move_item.paddle == self:
                diff_s = move_item.timediff_ms / 1000
                self.update_pos(diff_s)
                self.trigger_action(move_item)
                self.update_pos(tick_duration_s - diff_s)
            else:
                self.update_pos(tick_duration_s)
        else:
            previous_timediff_s = 0
            for item in move_item:
                self.update_pos(current_timediff_s - previous_timediff_s)
                current_timediff_s = item.timediff_ms / 1000
                if item.paddle == self:
                    self.trigger_action(item)
                previous_timediff_s = current_timediff_s
            self.update_pos(tick_duration_s - previous_timediff_s)
                

    def __update_pos(self, y: float):
        self.y = max(self.bound_top, min(y, self.bound_bottom - self.h))

    def __set_y_position(self, y: float):
        self.dy = PongPaddle.Dir.NONE.value
        self.__update_pos(y)

    def __set_direction(self, action: ClientMoveDirection):
        match action:
            case "none":
                self.dy = PongPaddle.Dir.NONE.value
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
