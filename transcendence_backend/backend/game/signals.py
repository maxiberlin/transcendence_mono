from django.dispatch import receiver
from django.db.models.signals import post_save

from .models import GameRequest, Tournament
# from chat.utils import handle_tournament_chatroom_message_consumer
from notification.utils import create_notification

@receiver(post_save, sender=GameRequest)
def post_save_create_game_request_notification(sender, instance: GameRequest, created, **kwargs):
    if created:
        create_notification(instance, instance.user, instance.invitee, f"{instance.user.username} sent you a game request.")
        # instance._create_notification(instance.invitee, f"{instance.user.username} sent you a game request.")

@receiver(post_save, sender=Tournament)
def create_tournament_chat_room(sender, instance: Tournament, created, **kwargs):
    from chat.models import ChatRoom
    if created:
        ChatRoom.rooms.add_user_to_tournament_chat(instance.name, instance.creator)
        # handle_tournament_chatroom_message_consumer('add_player', instance.name, instance.creator)
        # room = ChatRoom.objects.create(title=instance.name)
        # room.type = 'tournament'
        # room.users.add(instance.creator)
        # room.save()
