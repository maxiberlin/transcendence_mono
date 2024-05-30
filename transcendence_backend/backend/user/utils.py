from .models import *
from django.contrib.auth import get_user_model


def set_default_avatar():
    return 'avatars/default_avatar.png'


def get_avatar_path(self, filename):
    return f"avatars/{self.pk}/{'avatar.png'}"

def get_default_user():
    return get_user_model().objects.get(username='root')


def model_object_serializer(object):
    data = {}
    for field in object._meta.fields:
        field_value = getattr(object, field.name)
        if hasattr(field_value, 'serialize'):
            field_value = field_value.serialize()
        elif hasattr(field_value, 'pk'):
            field_value = field_value.pk
        data[field.name] = field_value
    return data

def calculate_user_xp(margin, winner):
    xp_map = {
        range(1, 4): 1,
        range(4, 7): 2,
        range(7, 10): 3
    }

    xp = 0
    for margin_range, xp_value in xp_map.items():
        if margin in margin_range:
            xp = xp_value if winner else -xp_value
    return xp

    