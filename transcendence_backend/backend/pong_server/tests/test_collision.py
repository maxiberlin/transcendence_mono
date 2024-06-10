from django.test import TestCase
from pong_server.pong_threading.pong_objs import PongObj, Collision
from decimal import Decimal
from django.test import TestCase
from pong_server.pong_threading.pong_objs import PongObj, Collision


class TestPongObj(TestCase):
    def test_collision(self):
        # Existing test code

    def test_collision_none(self):
        objA = PongObj(0, 0, 10, 10, 1, 1, 0, 100, 0, 100)
        objB = PongObj(20, 20, 10, 10, 1, 1, 0, 100, 0, 100)
        self.assertEqual(objA.check_collision(objB), Collision.COLL_NONE)

    def test_collision_top(self):
        objA = PongObj(0, 0, 10, 10, 1, -1, 0, 100, 0, 100)
        objB = PongObj(0, 10, 10, 10, 1, 1, 0, 100, 0, 100)
        self.assertEqual(objA.check_collision(objB), Collision.COLL_TOP)

    def test_collision_right(self):
        objA = PongObj(0, 0, 10, 10, 1, 1, 0, 100, 0, 100)
        objB = PongObj(10, 0, 10, 10, -1, 1, 0, 100, 0, 100)
        self.assertEqual(objA.check_collision(objB), Collision.COLL_RIGHT)

    def test_collision_bottom(self):
        objA = PongObj(0, 10, 10, 10, 1, 1, 0, 100, 0, 100)
        objB = PongObj(0, 0, 10, 10, 1, -1, 0, 100, 0, 100)
        self.assertEqual(objA.check_collision(objB), Collision.COLL_BOTTOM)

    def test_collision_left(self):
        objA = PongObj(10, 0, 10, 10, -1, 1, 0, 100, 0, 100)
        objB = PongObj(0, 0, 10, 10, 1, 1, 0, 100, 0, 100)
        self.assertEqual(objA.check_collision(objB), Collision.COLL_LEFT)


class TestPongObj(TestCase):
    def test_collision(self):
