from ..pong_ball import PongBall
from ..pong_paddle import PongPaddle
from .. import messages_client as msg_client
from .. import messages_server as msg_server
from typing import TypedDict
from ..game_timer import GameTimer
from dataclasses import dataclass
from collections import deque
import struct


# class GameStateData(TypedDict):
#     tick: int
#     ball: msg_server.GameObjPositionData
#     paddle_left: msg_server.GameObjPositionData
#     paddle_right: msg_server.GameObjPositionData
    
# @dataclass(slots=True)
# class ClientMoveItem:
#     action: msg_client.ClientMoveDirection | None
#     new_y: float | None
#     tick: int
#     timediff_ms: float
#     paddle: PongPaddle

# class GameState:
#     def __init__(self, ball: PongBall, paddle_left: PongPaddle, paddle_right: PongPaddle):
#         self.ball = ball
#         self.paddle_left = paddle_left
#         self.paddle_right = paddle_right
#         self.state_history: deque[msg_server.GameSnapshotDataclass] = deque(maxlen=20)
#         self.recalculated_snapshots: set[int] = set()
        
#         self.recent_action_remaining_time_s: float | None = None
#         self.temp_snapshot = None


#     def __update(self, duration: float):
#         self.paddle_left.update_pos(duration)
#         self.paddle_right.update_pos(duration)
#         return self.ball.update_pos(duration, self.paddle_left, self.paddle_right)
    
#     # def __safe_state(self, timestamp_ms: float, tickno: int):
#     #     state = msg_server.GameUpdate(
#     #         timestamp_ms=timestamp_ms,
#     #         ball=self.ball.getPositionalDataAsDict(),
#     #         paddle_left=self.paddle_left.getPositionalDataAsDict(),
#     #         paddle_right=self.paddle_right.getPositionalDataAsDict(),
#     #         tickno=tickno,
#     #         invalid_ticks=0
#     #     )
#     #     self.state_history.append(state)

#     def update_and_safe_state(self, game_timer: GameTimer) -> tuple[PongBall.Scored, list[msg_server.GameSnapshotDataclass]]:
#         if self.recent_action_remaining_time_s is not None:
#             duration_sec = self.recent_action_remaining_time_s
#         else:
#             duration_sec = game_timer.get_tick_duration("s")
#         score = self.__update(duration_sec)
        
#         state = msg_server.GameSnapshotDataclass(
#                     timestamp_ms=game_timer.get_tick_time_since_start("ms"),
#                     ball=self.ball.getPositionalDataclass(),
#                     paddle_left=self.paddle_left.getPositionalDataclass(),
#                     paddle_right=self.paddle_right.getPositionalDataclass(),
#                     tickno=game_timer.get_current_tick(),
#                     score=PongBall.Scored.SCORE_NONE.value
#                 )
#         d = [state for state in self.state_history if state.tickno in self.recalculated_snapshots]
#         d.append(state)
#         self.state_history.append(state)
#         self.recalculated_snapshots.clear()
#         return score, d
    

#     def reconcile_list(self, game_timer: GameTimer, move_items: list[ClientMoveItem]):
#         score = PongBall.Scored.SCORE_NONE

#         if len(move_items) == 0:
#             return PongBall.Scored.SCORE_NONE
#         move_items.sort(key=lambda item: (item.tick, item.timediff_ms))
# #         # print(move_items)
#         dur = game_timer.get_tick_duration("s")
#         last_move_tick = move_items[-1].tick

#         for state in self.state_history:
#             relevant_move_items = [item for item in move_items if item.tick == state.tickno]

#             if len(relevant_move_items) > 0:
#                 self.ball.setPositionalDataFromDataclass(state.ball)
#                 self.paddle_left.setPositionalDataFromDataclass(state.paddle_left)
#                 self.paddle_right.setPositionalDataFromDataclass(state.paddle_right)
#                 previous_timediff_s = 0
#                 for move_item in relevant_move_items:
#                     current_timediff_s = move_item.timediff_ms / 1000

#                     self.__update(current_timediff_s - previous_timediff_s)
#                     if move_item.action is not None:
#                         move_item.paddle.set_direction(move_item.action)
#                     elif move_item.new_y is not None:
#                         move_item.paddle.set_y_position(move_item.new_y)
#                     previous_timediff_s = current_timediff_s
#                 self.__update(dur - previous_timediff_s)
#                 self.recalculated_snapshots.add(state.tickno)
            
#             elif state.tickno > last_move_tick:
#                 score = self.__update(dur)
#                 self.recalculated_snapshots.add(state.tickno)
#                 state.ball = self.ball.getPositionalDataclass()
#                 state.paddle_left = self.paddle_left.getPositionalDataclass()
#                 state.paddle_right = self.paddle_right.getPositionalDataclass()

#         return score
  
#     def reconcile(self, game_timer: GameTimer, move_item: ClientMoveItem):
#         score = PongBall.Scored.SCORE_NONE
#         tick_duration_s = game_timer.get_tick_duration("s")
#         self.recent_action_remaining_time_s = None
        
#         if (move_item.tick == game_timer.get_current_tick()):
# #             print(f"tick not yet in history -> calc prev update: {move_item.tick}")
#             dur_s = move_item.timediff_ms/1000
#             self.__update(dur_s)
#             if move_item.action is not None:
#                 move_item.paddle.set_direction(move_item.action)
#             elif move_item.new_y is not None:
#                 move_item.paddle.set_y_position(move_item.new_y)
#             self.recent_action_remaining_time_s = tick_duration_s - dur_s
#             return
        
#         for state in self.state_history:
#             if state.tickno > move_item.tick:
# #                 print(f"update tick: {state.tickno}")
#                 score = self.__update(tick_duration_s)
#                 self.recalculated_snapshots.add(state.tickno)
#                 state.ball = self.ball.getPositionalDataclass()
#                 state.paddle_left = self.paddle_left.getPositionalDataclass()
#                 state.paddle_right = self.paddle_right.getPositionalDataclass()
#             elif state.tickno == move_item.tick:
# #                 print(f"recalc tick: {state.tickno}")
#                 self.ball.setPositionalDataFromDataclass(state.ball)
#                 self.paddle_left.setPositionalDataFromDataclass(state.paddle_left)
#                 self.paddle_right.setPositionalDataFromDataclass(state.paddle_right)

#                 diff_s = move_item.timediff_ms / 1000
#                 self.__update(diff_s)
#                 if move_item.action is not None:
#                     move_item.paddle.set_direction(move_item.action)
#                 elif move_item.new_y is not None:
#                     move_item.paddle.set_y_position(move_item.new_y)
#                 score = self.__update(tick_duration_s - diff_s)
                
#                 self.recalculated_snapshots.add(state.tickno)
     
#         return score
    

class GameStateData(TypedDict):
    tick: int
    ball: msg_server.GameObjPositionData
    paddle_left: msg_server.GameObjPositionData
    paddle_right: msg_server.GameObjPositionData
    
@dataclass(slots=True)
class ClientMoveItem:
    action: msg_client.ClientMoveDirection | None
    new_y: float | None
    tick: int
    timediff_ms: float
    paddle: PongPaddle

class GameState:
    def __init__(self, ball: PongBall, paddle_left: PongPaddle, paddle_right: PongPaddle):
        self.ball = ball
        self.paddle_left = paddle_left
        self.paddle_right = paddle_right
        self.state_history: deque[msg_server.GameSnapshotDataclass] = deque(maxlen=6)
        self.recalculated_snapshots: set[int] = set()
        
        self.next_snapshot = None


    def __update(self, duration: float):
        self.paddle_left.update_pos(duration)
        self.paddle_right.update_pos(duration)
        return self.ball.update_pos(duration, self.paddle_left, self.paddle_right)
    
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

    def update_and_safe_state(self, game_timer: GameTimer) -> tuple[PongBall.Scored, list[msg_server.GameSnapshotDataclass]]:

        if self.next_snapshot is None:
            score = self.__update(game_timer.get_tick_duration("s"))
            self.state_history.append(msg_server.GameSnapshotDataclass(
                        timestamp_ms=game_timer.get_tick_time_since_start("ms"),
                        ball=self.ball.getPositionalDataclass(),
                        paddle_left=self.paddle_left.getPositionalDataclass(),
                        paddle_right=self.paddle_right.getPositionalDataclass(),
                        tickno=game_timer.get_current_tick(),
                        score=score.value
                    ))
            self.recalculated_snapshots.add(game_timer.get_current_tick())
        else:
            self.recalculated_snapshots.add(self.next_snapshot.tickno)
            score = PongBall.Scored(self.state_history[-1].score)
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
        
        score_next = self.__update(game_timer.get_tick_duration("s"))
        self.next_snapshot = msg_server.GameSnapshotDataclass(
                timestamp_ms=game_timer.get_tick_time_since_start("ms") + game_timer.get_tick_duration("ms"),
                ball=self.ball.getPositionalDataclass(),
                paddle_left=self.paddle_left.getPositionalDataclass(),
                paddle_right=self.paddle_right.getPositionalDataclass(),
                tickno=game_timer.get_current_tick() + 1,
                score=score_next.value
            )
        self.state_history.append(self.next_snapshot)
        # # print(f"\nsave state -> new history:")
        # for i in self.state_history:
        # #     i.print()
        return score, d
    

    def reconcile(self, game_timer: GameTimer, move_item: ClientMoveItem):
        score = PongBall.Scored.SCORE_NONE
        tick_duration_s = game_timer.get_tick_duration("s")
        
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
                score = self.__update(tick_duration_s)
                # print(f"reconcile: update tick: {state.tickno}: new: x: {round(self.ball.x*10000)} | y: {round(self.ball.y*10000)} | dx: {round(self.ball.dx*10000)} | dy: {round(self.ball.dy*10000)}")
                state.ball = self.ball.getPositionalDataclass()
                state.paddle_left = self.paddle_left.getPositionalDataclass()
                state.paddle_right = self.paddle_right.getPositionalDataclass()

            elif state.tickno == move_item.tick:
                self.recalculated_snapshots.add(state.tickno)

                # print(f"reconcile: reset ball position: current: x: {round(self.ball.x*10000)} | y: {round(self.ball.y*10000)} | dx: {round(self.ball.dx*10000)} | dy: {round(self.ball.dy*10000)}")
                self.ball.setPositionalDataFromDataclass(state.ball)
                # print(f"reconcile: reset ball position: old at tick: x: {round(self.ball.x*10000)} | y: {round(self.ball.y*10000)} | dx: {round(self.ball.dx*10000)} | dy: {round(self.ball.dy*10000)}")
                self.paddle_left.setPositionalDataFromDataclass(state.paddle_left)
                self.paddle_right.setPositionalDataFromDataclass(state.paddle_right)

                diff_s = move_item.timediff_ms / 1000

                self.__update(diff_s)
                # print(f"reconcile: ball position: after 1. half update: {diff_s}: x: {round(self.ball.x*10000)} | y: {round(self.ball.y*10000)} | dx: {round(self.ball.dx*10000)} | dy: {round(self.ball.dy*10000)}")

                if move_item.action is not None:
                    move_item.paddle.set_direction(move_item.action)
                elif move_item.new_y is not None:
                    move_item.paddle.set_y_position(move_item.new_y)

                score = self.__update(tick_duration_s - diff_s)
                # print(f"reconcile: ball position: after 2. half update: {tick_duration_s - diff_s}: sum time: {(tick_duration_s - diff_s) + diff_s} x: {round(self.ball.x*10000)} | y: {round(self.ball.y*10000)} | dx: {round(self.ball.dx*10000)} | dy: {round(self.ball.dy*10000)}")
                
                
        return score
    
    

    # def reconcile(self, game_timer: GameTimer, move_item: ClientMoveItem):
    #     score = PongBall.Scored.SCORE_NONE
    #     tick_duration_s = game_timer.get_tick_duration("s")
        
    # #     # print(f"reconcile history")
    #     # for i in self.state_history:
    # #     #     i.print()
    #     update_ball = True
    #     for state in self.state_history:
    #         if state.tickno > move_item.tick:
    # #             # print(f"update tick: {state.tickno}")
    #             # score = self.__update(tick_duration_s)
    #             self.paddle_left.update_pos(tick_duration_s)
    #             self.paddle_right.update_pos(tick_duration_s)
    #             self.recalculated_snapshots.add(state.tickno)
    #             # state.ball = self.ball.getPositionalDataclass()
    #             state.paddle_left = self.paddle_left.getPositionalDataclass()
    #             state.paddle_right = self.paddle_right.getPositionalDataclass()
    #         elif state.tickno == move_item.tick:
    # #             # print(f"recalc tick: {state.tickno}")
    #             if (state.ball.x + self.ball.w < self.ball.bound_left
    #                 or state.ball.x > self.ball.bound_right
    #                 or (state.ball.x > self.paddle_left.right and state.ball.x + self.ball.w < self.paddle_right.left)):
    #                 update_ball = False
    #             # self.ball.setPositionalDataFromDataclass(state.ball)
    #             self.paddle_left.setPositionalDataFromDataclass(state.paddle_left)
    #             self.paddle_right.setPositionalDataFromDataclass(state.paddle_right)

    #             diff_s = move_item.timediff_ms / 1000
    #             # self.__update(diff_s)
    #             self.paddle_left.update_pos(diff_s)
    #             self.paddle_right.update_pos(diff_s)
    #             if move_item.action is not None:
    #                 move_item.paddle.set_direction(move_item.action)
    #             elif move_item.new_y is not None:
    #                 move_item.paddle.set_y_position(move_item.new_y)
    #             # score = self.__update(tick_duration_s - diff_s)
    #             self.paddle_left.update_pos(tick_duration_s - diff_s)
    #             self.paddle_right.update_pos(tick_duration_s - diff_s)
                
    #             self.recalculated_snapshots.add(state.tickno)
     
    #     return score
    
    

            

# class GameStateData(TypedDict):
#     tick: int
#     ball: msg_server.GameObjPositionData
#     paddle_left: msg_server.GameObjPositionData
#     paddle_right: msg_server.GameObjPositionData
    
# @dataclass(slots=True)
# class ClientMoveItem:
#     action: msg_client.ClientMoveDirection | None
#     new_y: float | None
#     tick: int
#     timediff_ms: float
#     paddle: PongPaddle

# class GameState:
#     def __init__(self, ball: PongBall, paddle_left: PongPaddle, paddle_right: PongPaddle):
#         self.ball = ball
#         self.paddle_left = paddle_left
#         self.paddle_right = paddle_right
#         self.state_history: deque[msg_server.GameUpdate] = deque(maxlen=20)
#         self.recalculated_snapshots: set[int] = set()


#     def __update(self, duration: float):
#         self.paddle_left.update_pos(duration)
#         self.paddle_right.update_pos(duration)
#         return self.ball.update_pos(duration, self.paddle_left, self.paddle_right)
    
#     def __safe_state(self, timestamp_ms: float, tickno: int):
#         state = msg_server.GameUpdate(
#             timestamp_ms=timestamp_ms,
#             ball=self.ball.getPositionalDataAsDict(),
#             paddle_left=self.paddle_left.getPositionalDataAsDict(),
#             paddle_right=self.paddle_right.getPositionalDataAsDict(),
#             tickno=tickno,
#             invalid_ticks=0
#         )
#         self.state_history.append(state)

#     def update_and_safe_state(self, game_timer: GameTimer) -> tuple[PongBall.Scored, msg_server.GameUpdate]:
#         duration_sec = game_timer.get_tick_duration("s")
#         score = self.__update(duration_sec)
#         state = msg_server.GameUpdate(
#             timestamp_ms=game_timer.get_tick_time_since_start("ms"),
#             ball=self.ball.getPositionalDataAsDict(),
#             paddle_left=self.paddle_left.getPositionalDataAsDict(),
#             paddle_right=self.paddle_right.getPositionalDataAsDict(),
#             tickno=game_timer.get_current_tick(),
#             invalid_ticks=0
#         )
# #         # print(f"safe state: {state}")
#         self.state_history.append(state)
#         self.recalculated_snapshots.clear()
#         return score, state

  
#     def reconcile(self, game_timer: GameTimer, move_item: ClientMoveItem):
#         score = PongBall.Scored.SCORE_NONE
#         for state in self.state_history:
#             if state.tickno > move_item.tick:
#                 score = self.__update(dur)
#                 self.recalculated_snapshots.add(state.tickno)
#                 state.ball = self.ball.getPositionalDataAsDict()
#                 state.paddle_left = self.paddle_left.getPositionalDataAsDict()
#                 state.paddle_right = self.paddle_right.getPositionalDataAsDict()
#             elif state.tickno == move_item.tick:
#                 self.ball.setPositionalData(state.ball)
#                 self.paddle_left.setPositionalData(state.paddle_left)
#                 self.paddle_right.setPositionalData(state.paddle_right)

#                 dur = game_timer.get_tick_duration("s")
#                 diff_s = move_item.timediff_ms / 1000
#                 self.__update(diff_s)
#                 if move_item.action is not None:
#                     move_item.paddle.set_direction(move_item.action)
#                 elif move_item.new_y is not None:
#                     move_item.paddle.set_y_position(move_item.new_y)
#                 score = self.__update(dur - diff_s)
                
#                 self.recalculated_snapshots.add(state.tickno)
     
#         return score


# class GameStateData(TypedDict):
#     tick: int
#     ball: msg_server.GameObjPositionData
#     paddle_left: msg_server.GameObjPositionData
#     paddle_right: msg_server.GameObjPositionData
    
# @dataclass(slots=True)
# class ClientMoveItem:
#     action: msg_client.ClientMoveDirection | None
#     new_y: float | None
#     tick: int
#     timediff_ms: float
#     paddle: PongPaddle

# class GameState:
#     def __init__(self, ball: PongBall, paddle_left: PongPaddle, paddle_right: PongPaddle):
#         self.ball = ball
#         self.paddle_left = paddle_left
#         self.paddle_right = paddle_right
#         self.state_history: deque[msg_server.GameUpdate] = deque(maxlen=20)


#     def __update(self, duration: float):
#         self.paddle_left.update_pos(duration)
#         self.paddle_right.update_pos(duration)
#         return self.ball.update_pos(duration, self.paddle_left, self.paddle_right)
    
#     def __safe_state(self, timestamp_ms: float, tickno: int):
#         state = msg_server.GameUpdate(
#             timestamp_ms=timestamp_ms,
#             ball=self.ball.getPositionalDataAsDict(),
#             paddle_left=self.paddle_left.getPositionalDataAsDict(),
#             paddle_right=self.paddle_right.getPositionalDataAsDict(),
#             tickno=tickno,
#             invalid_ticks=0
#         )
#         self.state_history.append(state)

#     def update_and_safe_state(self, game_timer: GameTimer) -> tuple[PongBall.Scored, msg_server.GameUpdate]:
#         duration_sec = game_timer.get_tick_duration("s")
#         score = self.__update(duration_sec)
#         state = msg_server.GameUpdate(
#             timestamp_ms=game_timer.get_tick_time_since_start("ms"),
#             ball=self.ball.getPositionalDataAsDict(),
#             paddle_left=self.paddle_left.getPositionalDataAsDict(),
#             paddle_right=self.paddle_right.getPositionalDataAsDict(),
#             tickno=game_timer.get_current_tick(),
#             invalid_ticks=0
#         )
# #         # print(f"safe state: {state}")
#         self.state_history.append(state)
#         return score, state
  
#     def reconcile(self, game_timer: GameTimer, move_item: ClientMoveItem):
#         state = next(i for i in self.state_history if i.tickno == move_item.tick)
# #         # print(f"reconcile: tick: {move_item.tick} state found: {state}")
#         self.ball.setPositionalData(state.ball)
#         self.paddle_left.setPositionalData(state.paddle_left)
#         self.paddle_right.setPositionalData(state.paddle_right)
        
#         dur = game_timer.get_tick_duration("s")
#         diff_s = move_item.timediff_ms / 1000
#         self.__update(diff_s)
#         if move_item.action is not None:
#             move_item.paddle.set_direction(move_item.action)
#         elif move_item.new_y is not None:
#             move_item.paddle.set_y_position(move_item.new_y)
#         score = self.__update(dur - diff_s)
#         last_tick = move_item.tick + 1
#         curr_tick = game_timer.get_current_tick()
#         while last_tick < curr_tick:
# #             # print(f"tick: {last_tick}, curr tick: {curr_tick}")
#             score = self.__update(dur)
#             last_tick += 1
#         return score
            
