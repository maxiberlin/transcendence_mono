from django.urls import re_path
from .consumers import *

websocket_urlpatterns = [
    re_path('', NotificationConsumer.as_asgi()),
]
# websocket_urlpatterns = [
#     re_path(r'', NotificationConsumer.as_asgi()),
# ]
