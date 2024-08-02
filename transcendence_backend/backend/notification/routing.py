from django.urls import re_path, path
from .consumers import NotificationConsumer

# websocket_urlpatterns = [
#     path('', NotificationConsumer.as_asgi()),
# ]
websocket_urlpatterns = [
    re_path(r'', NotificationConsumer.as_asgi()),
]
