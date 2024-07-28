from dataclasses import dataclass
from .. import messages_client as msg_client
from .. import messages_server as msg_server
from GameState import GameState

@dataclass(slots=True)
class ClientMoveItem:
    action: msg_client.ClientMoveDirection | None
    new_y: float | None
    timestamp_sec: float
    timediff_curr_sec: float

class ActionProcessor:
    def __init__(self):
        self.paddle_left_actions: list[ClientMoveItem] = []
        self.paddle_right_actions: list[ClientMoveItem] = []

    def add_action(self, user_id, new_y, action, timestamp_sec, gameResults):
        if user_id == gameResults["player_one_pk"]:
            self.paddle_left_actions.append(ClientMoveItem(action=action, new_y=new_y, timestamp_sec=timestamp_sec, timediff_curr_sec=0))
        elif user_id == gameResults["player_two_pk"]:
            self.paddle_right_actions.append(ClientMoveItem(action=action, new_y=new_y, timestamp_sec=timestamp_sec, timediff_curr_sec=0))
        else:
            raise msg_server.CommandError("invalid user_id", msg_server.WebsocketErrorCode.INVALID_COMMAND)

    def process_actions(self, game_state: GameState, game_start_time_unix_sec, last_game_update_perf_sec, duration, update_game_callback):
        all_actions = sorted(self.paddle_left_actions + self.paddle_right_actions, key=lambda x: x.timestamp_sec)
        last_action_time = last_game_update_perf_sec

        for action in all_actions:
            action_time_since_start = action.timestamp_sec - game_start_time_unix_sec
            state_at_action_time = game_state.get_state_at_time(action_time_since_start * 1000)
            game_state.restore_state(state_at_action_time)

            action_duration = (action.timestamp_sec - last_action_time) / 1000.0
            last_action_time = action.timestamp_sec

            self.apply_action(game_state, action)

            update_game_callback(action.timestamp_sec, action_duration, False)

        self.clear_actions()

    def apply_action(self, game_state: GameState, action: ClientMoveItem):
        if action in self.paddle_left_actions:
            paddle = game_state.paddle_left
        else:
            paddle = game_state.paddle_right

        if action.new_y is not None:
            paddle.set_y_position(action.new_y)
        elif action.action is not None:
            paddle.set_direction(action.action)

    def clear_actions(self):
        self.paddle_left_actions.clear()
        self.paddle_right_actions.clear()
