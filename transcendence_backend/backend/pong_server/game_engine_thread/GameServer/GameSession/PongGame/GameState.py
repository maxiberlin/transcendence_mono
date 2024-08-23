from .PongBall import PongBall
from .PongPaddle import PongPaddle, ClientMoveItem
# from . import messages_client as msg_client
# from . import messages_server as msg_server
from .dataclasses import GameSnapshotDataclass
from typing import TypedDict
from .GameTimer import GameTimer
from dataclasses import dataclass
from collections import deque
import struct

class GameState:
    def __init__(self, ball: PongBall, paddle_left: PongPaddle, paddle_right: PongPaddle):
        self.ball = ball
        self.paddle_left = paddle_left
        self.paddle_right = paddle_right
        self.state_history: deque[GameSnapshotDataclass] = deque(maxlen=15)
        self.recalculated_snapshots: set[int] = set()
        
        self.next_snapshot = None


    def __update(self, duration: float):
        self.paddle_left.update_pos(duration)
        self.paddle_right.update_pos(duration)
        self.ball.update_regular(duration, self.paddle_left, self.paddle_right)
        # return self.ball.update_pos(duration, self.paddle_left, self.paddle_right)
    
    # def __safe_state(self, timestamp_ms: float, tickno: int):
    #     state = msg_server.GameUpdate(
    #         timestamp_ms=timestamp_ms,
    #         ball=self.ball.getPositionalDataAsDict(),
    #         paddle_left=self.paddle_left.getPositionalDataAsDict(),
    #         paddle_right=self.paddle_right.getPositionalDataAsDict(),
    #         tickno=tickno,
    #         invalid_ticks=0
    #     )
    #     self.state_history.append(state)

    # def update_and_safe_state(self, game_timer: GameTimer) -> tuple[PongBall.Scored, list[msg_server.GameSnapshotDataclass]]:
    
    def getState(self,tick_duration_s: float, time_since_start_ms: float, current_tick: int):
        self.paddle_left.update_pos(tick_duration_s)
        self.paddle_right.update_pos(tick_duration_s)
        self.ball.update_regular(tick_duration_s, self.paddle_left, self.paddle_right)
        state = GameSnapshotDataclass(
            timestamp_ms=time_since_start_ms,
            ball=self.ball.getPositionalDataclass(),
            paddle_left=self.paddle_left.getPositionalDataclass(),
            paddle_right=self.paddle_right.getPositionalDataclass(),
            tickno=current_tick,
            tick_duration_s=tick_duration_s
        )
        return [state]
    
    def update_and_safe_state(self, tick_duration_s: float, time_since_start_ms: float, current_tick: int) -> list[GameSnapshotDataclass]:

        if self.next_snapshot is None:
            self.__update(tick_duration_s)
            self.state_history.append(GameSnapshotDataclass(
                        timestamp_ms=time_since_start_ms,
                        ball=self.ball.getPositionalDataclass(),
                        paddle_left=self.paddle_left.getPositionalDataclass(),
                        paddle_right=self.paddle_right.getPositionalDataclass(),
                        tickno=current_tick,
                        tick_duration_s=tick_duration_s
                    ))
            self.recalculated_snapshots.add(current_tick)
        else:
            self.recalculated_snapshots.add(self.next_snapshot.tickno)
            # score = PongBall.Scored(self.state_history[-1].score)
        d = [state for state in self.state_history if state.tickno in self.recalculated_snapshots]
        self.recalculated_snapshots.clear()
        # if len(d) > 1:
            # print(f"\n update and safe, returned snapshots: current tick: {game_timer.get_current_tick()}")
            # for s in d:
                # print(f"\ntick: {s.tickno}")
                # print(f"paddle_left: x: {round(s.paddle_left.x*10000)} | y: {(s.paddle_left.y)}")
                # print(f"ball: x: {round(s.ball.x*10000)} | y: {round(s.ball.y*10000)} | dx: {round(s.ball.dx*10000)} | dy: {round(s.ball.dy*10000)}")
                # print(f"paddle_right: x: {round(s.paddle_right.x*10000)} | y: {round(s.paddle_right.y*10000)}")
        # d = [self.state_history[-1]]
        d.sort(key=lambda x: x.tickno)
        
        self.__update(tick_duration_s)
        self.next_snapshot = GameSnapshotDataclass(
                timestamp_ms=time_since_start_ms + tick_duration_s*1000,
                ball=self.ball.getPositionalDataclass(),
                paddle_left=self.paddle_left.getPositionalDataclass(),
                paddle_right=self.paddle_right.getPositionalDataclass(),
                tickno=current_tick + 1,
                tick_duration_s=tick_duration_s
            )
        self.state_history.append(self.next_snapshot)
        # # print(f"\nsave state -> new history:")
        # for i in self.state_history:
        # #     i.print()
        # print(f"states len: {len(d)}")
        return d
    
    def reconcile_list(self, move_items: list[ClientMoveItem]):
        print(f"reconcile_list")
        move_items.sort(key=lambda item: (item.tick, item.timediff_ms))
        tick_duration_s = 0
        last_move_tick = move_items[-1].tick
        first_move_tick = move_items[0].tick

        for state in self.state_history:
            relevant_move_items = [item for item in move_items if item.tick == state.tickno]

            if len(relevant_move_items) > 0:
                self.recalculated_snapshots.add(state.tickno + 1)

                tick_duration_s = state.tick_duration_s
                self.paddle_left.reconcile_tick(state.paddle_left, relevant_move_items, tick_duration_s)
                self.paddle_right.reconcile_tick(state.paddle_right, relevant_move_items, tick_duration_s)
                self.ball.reconcile_tick(state.ball, self.paddle_left, self.paddle_right, tick_duration_s)
            
            elif state.tickno > first_move_tick + 1:
                self.recalculated_snapshots.add(state.tickno)
                self.paddle_left.update_pos(tick_duration_s)
                self.paddle_right.update_pos(tick_duration_s)
                if self.ball.update_after_reconcile(tick_duration_s, self.paddle_left, self.paddle_right):
                    state.ball = self.ball.getPositionalDataclass()
                
                state.paddle_left = self.paddle_left.getPositionalDataclass()
                state.paddle_right = self.paddle_right.getPositionalDataclass()


    def reconcile(self, move_item: ClientMoveItem) -> None:
        tick_duration_s = 0
        # tick_duration_s = game_timer.get_tick_duration("s")
        
        # print(f"\nreconcile -> real current tick: {game_timer.get_current_tick()}")
        # for s in self.state_history:
            # print(f"\ntick: {s.tickno}")
            # print(f"paddle_left: x: {round(s.paddle_left.x*10000)} | y: {(s.paddle_left.y)}")
            # print(f"ball: x: {round(s.ball.x*10000)} | y: {round(s.ball.y*10000)} | dx: {round(s.ball.dx*10000)} | dy: {round(s.ball.dy*10000)}")
            # print(f"paddle_right: x: {round(s.paddle_right.x*10000)} | y: {round(s.paddle_right.y*10000)}")
            # # print(f"paddle_left: x: {s.paddle_left.x} | y: {s.paddle_left.y}")
            # # print(f"ball: x: {s.ball.x} | y: {s.ball.y} | dx: {s.ball.dx} | dy: {s.ball.dy}")
            # # print(f"paddle_right: x: {s.paddle_right.x} | y: {s.paddle_right.y}")
        
        for state in self.state_history:

            if state.tickno > move_item.tick + 1:
                self.recalculated_snapshots.add(state.tickno)

                # print(f"reconcile: update tick: {state.tickno}: current: x: {round(self.ball.x*10000)} | y: {round(self.ball.y*10000)} | dx: {round(self.ball.dx*10000)} | dy: {round(self.ball.dy*10000)}")
                # score = self.__update(tick_duration_s)
                # print(f"reconcile: update tick: {state.tickno}: new: x: {round(self.ball.x*10000)} | y: {round(self.ball.y*10000)} | dx: {round(self.ball.dx*10000)} | dy: {round(self.ball.dy*10000)}")
                self.paddle_left.update_pos(tick_duration_s)
                self.paddle_right.update_pos(tick_duration_s)
                if self.ball.update_after_reconcile(tick_duration_s, self.paddle_left, self.paddle_right):
                    state.ball = self.ball.getPositionalDataclass()
                
                state.paddle_left = self.paddle_left.getPositionalDataclass()
                state.paddle_right = self.paddle_right.getPositionalDataclass()

            elif state.tickno == move_item.tick:
                self.recalculated_snapshots.add(state.tickno + 1)
                tick_duration_s = state.tick_duration_s
                self.paddle_left.reconcile_tick(state.paddle_left, move_item, tick_duration_s)
                self.paddle_right.reconcile_tick(state.paddle_right, move_item, tick_duration_s)
                self.ball.reconcile_tick(state.ball, self.paddle_left, self.paddle_right, tick_duration_s)

                # print(f"reconcile: reset ball position: current: x: {round(self.ball.x*10000)} | y: {round(self.ball.y*10000)} | dx: {round(self.ball.dx*10000)} | dy: {round(self.ball.dy*10000)}")
                # self.ball.setPositionalDataFromDataclass(state.ball)
                # # print(f"reconcile: reset ball position: old at tick: x: {round(self.ball.x*10000)} | y: {round(self.ball.y*10000)} | dx: {round(self.ball.dx*10000)} | dy: {round(self.ball.dy*10000)}")
                # self.paddle_left.setPositionalDataFromDataclass(state.paddle_left)
                # self.paddle_right.setPositionalDataFromDataclass(state.paddle_right)

                # diff_s = move_item.timediff_ms / 1000

                # self.__update(diff_s)
                # print(f"reconcile: ball position: after 1. half update: {diff_s}: x: {round(self.ball.x*10000)} | y: {round(self.ball.y*10000)} | dx: {round(self.ball.dx*10000)} | dy: {round(self.ball.dy*10000)}")

                # if move_item.action is not None:
                #     move_item.paddle.set_direction(move_item.action)
                # elif move_item.new_y is not None:
                #     move_item.paddle.set_y_position(move_item.new_y)

                # score = self.__update(tick_duration_s - diff_s)
                # print(f"reconcile: ball position: after 2. half update: {tick_duration_s - diff_s}: sum time: {(tick_duration_s - diff_s) + diff_s} x: {round(self.ball.x*10000)} | y: {round(self.ball.y*10000)} | dx: {round(self.ball.dx*10000)} | dy: {round(self.ball.dy*10000)}")
                
                
    

    def reconcile2(self, move_item: ClientMoveItem) -> None:
        tick_duration_s = 0
        
        for state in self.state_history:

            if state.tickno > move_item.tick + 1:
                self.recalculated_snapshots.add(state.tickno)

                self.paddle_left.update_pos(tick_duration_s)
                self.paddle_right.update_pos(tick_duration_s)
                if self.ball.update_after_reconcile(tick_duration_s, self.paddle_left, self.paddle_right):
                    state.ball = self.ball.getPositionalDataclass()
                
                state.paddle_left = self.paddle_left.getPositionalDataclass()
                state.paddle_right = self.paddle_right.getPositionalDataclass()

            elif state.tickno == move_item.tick:
                self.recalculated_snapshots.add(state.tickno + 1)
                tick_duration_s = state.tick_duration_s
                self.paddle_left.reconcile_tick(state.paddle_left, move_item, tick_duration_s)
                self.paddle_right.reconcile_tick(state.paddle_right, move_item, tick_duration_s)
                self.ball.reconcile_tick(state.ball, self.paddle_left, self.paddle_right, tick_duration_s)
