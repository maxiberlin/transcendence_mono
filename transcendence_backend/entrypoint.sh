#!/bin/sh

python manage.py makemigrations --no-input
python manage.py migrate --no-input

python manage.py runworker game_engine &
# python manage.py runserver 0.0.0.0:8000
daphne -b 0.0.0.0 -p 8000 backend.asgi:application

