#!/bin/sh

python manage.py makemigrations --no-input
python manage.py migrate --no-input


# gunicorn backend.wsgi:application --bind 0.0.0.0:8000
# tail -f /dev/null
# daphne -b 0.0.0.0 -p 8001 django_project.asgi:application

python manage.py runserver 0.0.0.0:8000


# python manage.py shell

# from friends.models import *
# from user.models import UserAccount, Player

# def createDefaultUser(username, email, password):
# 	user = UserAccount.objects.create_user(username, email, password)
# 	Player.objects.create(user=user)
# 	FriendList.objects.create(user=user)
# 	BlockList.objects.create(user=user)

# createDefaultUser("heia", "weofwe3few@web.de", "asd")
# createDefaultUser("hugo", "weofwefewfds@web.de", "asd")
# createDefaultUser("greg", "weofwefewaa@web.de", "asd")
# createDefaultUser("melanie", "weofwefewlp@web.de", "asd")
# createDefaultUser("vera", "weofwefew223@web.de", "asd")
# createDefaultUser("daniel", "weofwefew1@web.de", "asd")
# createDefaultUser("lololo", "weofwefew09@web.de", "asd")
# createDefaultUser("marmeduke", "weofwefew8877@web.de", "asd")
# createDefaultUser("qluee", "weofwefewv7d@web.de", "asd")
# createDefaultUser("heylo", "weofwefe0dsa@web.de", "asd")
