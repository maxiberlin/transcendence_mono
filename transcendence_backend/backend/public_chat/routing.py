from django.urls import re_path
from .consumers import PublicChatConsumer

websocket_urlpatterns = [
    re_path(r'chat/(?P<room_type>\w+)/(?P<room_id>\d+)/$', PublicChatConsumer.as_asgi()),
]