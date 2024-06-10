import unittest
from pong_server.pong_threading.pong_settings import PongSettings, ServeMode, InitialServe


class TestPongSettings(unittest.TestCase):
    def test_singleton_instance(self):
        settings1 = PongSettings()
        settings2 = PongSettings()
        self.assertIs(settings1, settings2)

    def test_initial_values(self):
        settings = PongSettings()
        self.assertEqual(settings.width, 40000)
        self.assertEqual(settings.height, 20000)
        self.assertEqual(settings.border_width, 600)
        self.assertEqual(settings.border_height, 600)
        self.assertEqual(settings.paddle_width, 600)
        self.assertEqual(settings.paddle_height, 2600)
        self.assertEqual(settings.paddle_speed, 7000)
        self.assertEqual(settings.wall_dist, 600)
        self.assertEqual(settings.ball_width, 600)
        self.assertEqual(settings.ball_height, 600)
        self.assertEqual(settings.ball_speed, 9000)
        self.assertEqual(settings.point_wait_time, 1.0)
        self.assertEqual(settings.serve_mode, ServeMode.WINNER)
        self.assertEqual(settings.initial_serve_to, InitialServe.LEFT)
        self.assertEqual(settings.max_score, 10)
        self.assertEqual(settings.tick_duration, 0.05)

    def test_toJSON(self):
        settings = PongSettings()
        json_str = settings.toJSON()
        self.assertIsInstance(json_str, str)
        # Add more assertions for the JSON string if needed


if __name__ == '__main__':
    unittest.main()
