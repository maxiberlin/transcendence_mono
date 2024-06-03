from django.urls import re_path
from .consumers import *

websocket_urlpatterns = [
    re_path(r'public_chat/(?P<room_id>\w+)/$', PublicChatConsumer.as_asgi()),
]
