#!/bin/sh

python manage.py makemigrations --no-input
python manage.py migrate --no-input

# python manage.py shell <<EOF
# from friends.models import *
# from user.models import UserAccount, Player

# def createDefaultUser(username, email, password):
#     user = UserAccount.objects.create_user(username, email, password)
#     Player.objects.create(user=user)
#     FriendList.objects.create(user=user)
#     BlockList.objects.create(user=user)

# createDefaultUser("hugo", "weofwefewfds@web.de", "asd")
# createDefaultUser("greg", "weofwefewaa@web.de", "asd")
# createDefaultUser("melanie", "weofwefewlp@web.de", "asd")
# createDefaultUser("vera", "weofwefew223@web.de", "asd")
# createDefaultUser("daniel", "weofwefew1@web.de", "asd")
# createDefaultUser("max", "weofwefew09@web.de", "asd")
# createDefaultUser("peter", "weofwefew8877@web.de", "asd")
# createDefaultUser("jacob", "weofwefewv7d@web.de", "asd")
# createDefaultUser("constantin", "weofwefe0dsa@web.de", "asd")
# EOF

# gunicorn backend.wsgi:application --bind 0.0.0.0:8000
# tail -f /dev/null
# daphne -b 0.0.0.0 -p 8001 django_project.asgi:application

# python manage.py runworker game_engine
python manage.py runserver 0.0.0.0:8000
# daphne -b 0.0.0.0 -p 8000 backend.asgi:application


# python manage.py shell

# from friends.models import *
# from user.models import UserAccount, Player

# def createDefaultUser(username, email, password):
# 	user = UserAccount.objects.create_user(username, email, password)
# 	Player.objects.create(user=user)
# 	FriendList.objects.create(user=user)
# 	BlockList.objects.create(user=user)

# createDefaultUser("hugo", "weofwefewfds@web.de", "asd")
# createDefaultUser("greg", "weofwefewaa@web.de", "asd")
# createDefaultUser("melanie", "weofwefewlp@web.de", "asd")
# createDefaultUser("vera", "weofwefew223@web.de", "asd")
# createDefaultUser("daniel", "weofwefew1@web.de", "asd")
# createDefaultUser("max", "weofwefew09@web.de", "asd")
# createDefaultUser("peter", "weofwefew8877@web.de", "asd")
# createDefaultUser("jacob", "weofwefewv7d@web.de", "asd")
# createDefaultUser("constantin", "weofwefe0dsa@web.de", "asd")
