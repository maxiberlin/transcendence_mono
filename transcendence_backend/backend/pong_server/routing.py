
# chat/routing.py
from django.urls import re_path

from .pong_threading_new_layout.consumer_player import PlayerConsumer

websocket_urlpatterns = [
    re_path(r"ws/game/(?P<schedule_id>\w+)/$", PlayerConsumer.as_asgi()),
]

# # chat/routing.py
# from django.urls import re_path, path

# from .consumers import ChatConsumer

# websocket_urlpatterns = [
#     path('ws/chat/<uri>/', ChatConsumer.as_asgi()),
# ]

#     # re_path(r"ws/chat/(?P<room_name>\w+)/$", ChatConsumer.as_asgi()),