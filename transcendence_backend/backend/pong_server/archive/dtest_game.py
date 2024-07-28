from django.test import TestCase
from unittest.mock import MagicMock
from pong_server.pong_old.game import PongGame


class TestPongGame(TestCase):
    def setUp(self):
        self.settings = MagicMock()
        self.channel_layer = MagicMock()
        self.group_name = "test_group"
        self.q = MagicMock()
        self.game = PongGame(
            self.settings, self.channel_layer, self.group_name, self.q)

    def test_add_player(self):
        self.assertEqual(self.game.get_connected_players(), 0)
        self.game.add_payer()
        self.assertEqual(self.game.get_connected_players(), 1)

    def test_handle_actions(self):
        self.game.paused = False
        self.game.process_player_input = MagicMock()
        self.game.actions.put("action1")
        self.game.actions.put("action2")
        self.game.handle_actions()
        self.assertEqual(self.game.process_player_input.call_count, 2)

    def test_update_game(self):
        self.game.paddle_left.update_pos_by_dir = MagicMock()
        self.game.paddle_right.update_pos_by_dir = MagicMock()
        self.game.ball.update_pos = MagicMock(
            return_value=PongBall.Scored.SCORE_NONE)
        self.game.publish_game_state = MagicMock()
        self.game.handle_score = MagicMock()
        self.game.update_game(0.1, 0.2)
        self.game.paddle_left.update_pos_by_dir.assert_called_once_with(0.1)
        self.game.paddle_right.update_pos_by_dir.assert_called_once_with(0.1)
        self.game.ball.update_pos.assert_called_once_with(
            0.1, self.game.paddle_left, self.game.paddle_right)
        self.game.publish_game_state.assert_called_once()
        self.game.handle_score.assert_not_called()

    def test_handle_score(self):
        self.game.score_left = 0
        self.game.score_right = 0
        self.game.settings.max_score = 3
        self.game.end_game = MagicMock()
        self.game.reset_ball = MagicMock()
        self.game.handle_score(PongBall.Scored.SCORE_PLAYER_LEFT)
        self.assertEqual(self.game.score_left, 1)
        self.assertEqual(self.game.score_right, 0)
        self.game.handle_score(PongBall.Scored.SCORE_PLAYER_RIGHT)
        self.assertEqual(self.game.score_left, 1)
        self.assertEqual(self.game.score_right, 1)
        self.game.handle_score(PongBall.Scored.SCORE_PLAYER_LEFT)
        self.assertEqual(self.game.score_left, 2)
        self.assertEqual(self.game.score_right, 1)
        self.game.handle_score(PongBall.Scored.SCORE_PLAYER_LEFT)

# class TestPongGame(unittest.TestCase):
#     def setUp(self):
#         self.settings = MagicMock()
#         self.channel_layer = MagicMock()
#         self.group_name = "test_group"
#         self.q = MagicMock()
#         self.game = PongGame(self.settings, self.channel_layer, self.group_name, self.q)

#     def test_add_player(self):
#         self.assertEqual(self.game.get_connected_players(), 0)
#         self.game.add_payer()
#         self.assertEqual(self.game.get_connected_players(), 1)

#     def test_handle_actions(self):
#         self.game.paused = False
#         self.game.process_player_input = MagicMock()
#         self.game.actions.put("action1")
#         self.game.actions.put("action2")
#         self.game.handle_actions()
#         self.assertEqual(self.game.process_player_input.call_count, 2)

#     def test_update_game(self):
#         self.game.paddle_left.update_pos_by_dir = MagicMock()
#         self.game.paddle_right.update_pos_by_dir = MagicMock()
#         self.game.ball.update_pos = MagicMock(return_value=PongBall.Scored.SCORE_NONE)
#         self.game.publish_game_state = MagicMock()
#         self.game.handle_score = MagicMock()
#         self.game.update_game(0.1, 0.2)
#         self.game.paddle_left.update_pos_by_dir.assert_called_once_with(0.1)
#         self.game.paddle_right.update_pos_by_dir.assert_called_once_with(0.1)
#         self.game.ball.update_pos.assert_called_once_with(0.1, self.game.paddle_left, self.game.paddle_right)
#         self.game.publish_game_state.assert_called_once()
#         self.game.handle_score.assert_not_called()

#     def test_handle_score(self):
#         self.game.score_left = 0
#         self.game.score_right = 0
#         self.game.settings.max_score = 3
#         self.game.end_game = MagicMock()
#         self.game.reset_ball = MagicMock()
#         self.game.handle_score(PongBall.Scored.SCORE_PLAYER_LEFT)
#         self.assertEqual(self.game.score_left, 1)
#         self.assertEqual(self.game.score_right, 0)
#         self.game.handle_score(PongBall.Scored.SCORE_PLAYER_RIGHT)
#         self.assertEqual(self.game.score_left, 1)
#         self.assertEqual(self.game.score_right, 1)
#         self.game.handle_score(PongBall.Scored.SCORE_PLAYER_LEFT)
#         self.assertEqual(self.game.score_left, 2)
#         self.assertEqual(self.game.score_right, 1)
#         self.game.handle_score(PongBall.Scored.SCORE_PLAYER_LEFT)
#         self.assertEqual(self.game.score_left, 3)
#         self.assertEqual(self.game.score_right, 1)
#         self.game.end_game.assert_called_once_with("left")
#         self.game.reset_ball.assert_not_called()

#     def test_determine_serve(self):
#         self.game.settings.serve_mode = ServeMode.WINNER
#         self.assertEqual(self.game.determine_serve(PongBall.Scored.SCORE_PLAYER_LEFT), InitialServe.LEFT)
#         self.assertEqual(self.game.determine_serve(PongBall.Scored.SCORE_PLAYER_RIGHT), InitialServe.RIGHT)
#         self.game.settings.serve_mode = ServeMode.LOSER
#         self.assertEqual(self.game.determine_serve(PongBall.Scored.SCORE_PLAYER_LEFT), InitialServe.RIGHT)
#         self.assertEqual(self.game.determine_serve(PongBall.Scored.SCORE_PLAYER_RIGHT), InitialServe.LEFT)
#         self.game.settings.serve_mode = ServeMode.RANDOM
#         serve = self.game.determine_serve(PongBall.Scored.SCORE_PLAYER_LEFT)
#         self.assertIn(serve, [InitialServe.LEFT, InitialServe.RIGHT])
#         serve = self.game.determine_serve(PongBall.Scored.SCORE_PLAYER_RIGHT)
#         self.assertIn(serve, [InitialServe.LEFT, InitialServe.RIGHT])

#     def test_reset_ball(self):
#         self.game.channelMessenger = MagicMock()
#         self.game.channelMessenger.push_to_channel = MagicMock()
#         self.game.ball.reset_position = MagicMock()
#         self.game.reset_ball(InitialServe.LEFT)
#         self.game.channelMessenger.push_to_channel.assert_called_once_with(msgServer.GamePaused())
#         self.game.ball.reset_position.assert_called_once_with(InitialServe.LEFT)
#         self.game.channelMessenger.push_to_channel.assert_called_with(msgServer.GameResumed())

#     def test_end_game(self):
#         self.game.channelMessenger = MagicMock()
#         self.game.channelMessenger.push_to_channel = MagicMock()
#         self.game.stop_game = MagicMock()
#         self.game.end_game("left")
#         self.game.channelMessenger.push_to_channel.assert_called_once_with(msgServer.GameEnd("left", "right"))
#         self.game.stop_game.assert_called_once()

#     def test_pause_game(self):
#         self.game.paused = False
#         self.game.pause_game()
#         self.assertTrue(self.game.paused)

#     def test_resume_game(self):
#         self.game.paused = True
#         self.game.resume_game()
#         self.assertFalse(self.game.paused)

#     def test_set_paddle_direction(self):
#         self.game.paddle_left.set_direction = MagicMock()
#         self.game.paddle_right.set_direction = MagicMock()
#         self.game.set_paddle_direction("left", PongPaddle.Dir.UP, False)
#         self.game.paddle_left.set_direction.assert_called_once_with(PongPaddle.Dir.UP, False)
#         self.game.set_paddle_direction("right", PongPaddle.Dir.DOWN, True)
#         self.game.paddle_right.set_direction.assert_called_once_with(PongPaddle.Dir.DOWN, True)

#     def test_move_paddle(self):
#         self.game.set_paddle_direction = MagicMock()
#         self.game.move_paddle({"action": "up"})
#         self.game.set_paddle_direction.assert_called_once_with("left", PongPaddle.Dir.UP, False)
#         self.game.move_paddle({"action": "down"})
#         self.game.set_paddle_direction.assert_called_with("left", PongPaddle.Dir.DOWN, False)

#     def test_process_player_input(self):
#         self.game.move_paddle = MagicMock()
#         self.game.process_player_input({"tag": "client-move"})
#         self.game.move_paddle.assert_called_once()

#     def test_publish_game_state(self):
#         self.game.channelMessenger = MagicMock()
#         self.game.channelMessenger.push_to_channel = MagicMock()
#         self.game.ball.getPositionalDataAsDict = MagicMock(return_value={"x": 0, "y": 0})
#         self.game.paddle_left.getPositionalDataAsDict = MagicMock(return_value={"x": 0, "y": 0})
#         self.game.paddle_right.getPositionalDataAsDict = MagicMock(return_value={"x": 0, "y": 0})
#         self.game.publish_game_state()
#         self.game.channelMessenger.push_to_channel.assert_called_once_with(msgServer.GameUpdate(
#             timestamp=MagicMock(),
#             ball={"x": 0, "y": 0},
#             paddle_left={"x": 0, "y": 0},
#             paddle_right={"x": 0, "y": 0},
#         ))

#     def test_handle_error(self):
#         self.game.channelMessenger = MagicMock()
#         self.game.channelMessenger.push_to_channel = MagicMock()
#         self.game.stop_game = MagicMock()
#         self.game.handle_error("Error message")
#         self.game.channelMessenger.push_to_channel.assert_called_once_with(msgServer.Error("Error message"))
#         self.game.stop_game.assert_called_once()

# if __name__ == '__main__':
#     unittest.main()
