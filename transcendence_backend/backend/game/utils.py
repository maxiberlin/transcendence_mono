from .models import *
from django.contrib.auth import get_user_model


def send_invite(user, invitee, game_id, game_mode, tournament):

    try:
        request = GameRequest.objects.create(
            user=user,
            invitee=invitee,
            game_id=game_id,
            game_mode=game_mode,
            tournament=tournament
        )
        request.save()
        return 'invitation was sent'
    except Exception as e:
        return str(e)


def create_game_request(user: UserAccount, invitee: UserAccount, game_id: int, game_mode: str, tournament: Tournament | None) -> GameRequest | None:

    try:
        request = GameRequest.objects.create(
            user=user,
            invitee=invitee,
            game_id=game_id,
            game_mode=game_mode,
            tournament=tournament
        )
        request.save()
        return request
    except Exception as e:
        return None
