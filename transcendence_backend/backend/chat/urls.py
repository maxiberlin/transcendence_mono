from django.urls import re_path, path
from . import views

    # path('', views.chat_view, name='chat'),
    # path('room/<user_id>', views.chat_room_get, name='room-get'),
urlpatterns = [
    path('rooms', views.ChatRoomView.as_view(), name='rooms-list-get'),
    path('messages', views.ChatMessageView.as_view(), name='messages-list-get'),
]