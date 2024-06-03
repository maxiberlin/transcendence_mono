
from django.urls import re_path, path
from . import views

urlpatterns = [
    path('', views.public_chat_view, name='public-chat'),

]