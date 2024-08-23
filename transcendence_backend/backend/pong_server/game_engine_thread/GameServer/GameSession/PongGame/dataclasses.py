import struct
from dataclasses import dataclass 

@dataclass(slots=True)
class DataclassBin:
    def tobin(self):
        pass

@dataclass(slots=True)
class GameObjPositionDataclass(DataclassBin):
    x: float
    y: float
    dx: float
    dy: float
    
    def tobin(self):
        return struct.pack("ff", self.x, self.y)

@dataclass
class GameSnapshotDataclass(DataclassBin):
    tickno: int
    timestamp_ms: float
    tick_duration_s: float
    ball: GameObjPositionDataclass
    paddle_left: GameObjPositionDataclass
    paddle_right: GameObjPositionDataclass
    
    def print(self):
        print(f"tickno: {self.tickno}")
        print(f"ball x: {self.ball.x}")
        print(f"ball y: {self.ball.y}")
    
    def tobin(self):
        return struct.pack("If", self.tickno, self.timestamp_ms) + self.ball.tobin() + self.paddle_left.tobin() + self.paddle_right.tobin()

@dataclass
class GameSnapshotListDataclass(DataclassBin):
    list: list[GameSnapshotDataclass]
    
    def tobin(self):
        data = bytes()
        for i in self.list:
            data += i.tobin()
        return struct.pack("I", len(self.list)) + data
