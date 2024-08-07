from .models import *
from user.utils import *
from django.db.models import Count
from typing import Literal
# from websocket_server.utils import sync_send_consumer_internal_command
# from websocket_server import constants as c


# def get_private_room_or_create(user1, user2):
#     # alternate_title = '-'.join(title.split('-')[::-1])
#     try:
#         # room = ChatRoom.objects.get(Q(users=user1) & Q(users=user2), type='private')
#         room = ChatRoom.objects.annotate(num_users=Count('users')).filter(
#             users=user1
#         ).filter(users=user2).filter(
#             num_users=2,
#             type='private'
#         ).get()
#     except ChatRoom.DoesNotExist:
#         # from friends.models import FriendList
#         # try:
#         #     friend_list = FriendList.objects.get(user=user1)
#         # except Exception as e:
#         #     InternalServerError500(message=str(e))
#         # if not friend_list.is_mutual_friend(user2):
#         #     return None
#         room = check_private_room_by_title(str(user1) + '.' + str(user2))
#         if room == None:
#             try:
#                 room = ChatRoom.objects.create(
#                     title = str(user1.username + '.' + user2.username),
#                     type='private'
#                 )
#                 room.users.add(user1)
#                 room.users.add(user2)
#                 room.save()
#                 print(f'--->>> get_private_room created')
#             except Exception as e:
#                 raise RuntimeError(str(e))
#     return room

# def check_private_room_by_title(title):
#     try:
#         room = ChatRoom.objects.get(title=title)
#         return room
#     except ChatRoom.DoesNotExist:
#         try:
#             # room = ChatRoom.objects.get(title='-'.join(title.split('.')[::-1]))
#             room = ChatRoom.objects.get(title='.'.join(title.split('.')[::-1]))
#             return room
#         except ChatRoom.DoesNotExist:
#             return None



# def handle_private_chatroom_message_consumers(action: Literal['create', 'inactivate'], user1: UserAccount, user2: UserAccount):
#     try:
#         room = get_private_room_or_create(user1, user2)
#         room.is_active = False if action == 'inactivate' else True
#         room.save()
#         act = 'remove' if action == 'inactivate' else 'add'
#         message_chat_consumer(user1, room, act)
#         message_chat_consumer(user2, room, act)
#     except Exception as e:
#         print(f"error {action} private chatroom for {user1} and {user2}: {e}")

# def handle_tournament_chatroom_message_consumer(action: Literal['add_player', 'remove_player', 'inactivate'], tournament_name: str, user: UserAccount | None):
#     try:
#         room, created = ChatRoom.objects.get_or_create(title=tournament_name, type="tournament")
#         room.is_active = False if action == 'inactivate' else True
#         if user and action == 'add_player':
#             room.users.add(user)
#             room.is_active = True
#             room.save()
#             message_chat_consumer(user, room, 'add')
#         elif user and action == 'remove_player':
#             room.users.remove(user)
#             room.is_active = True if len(room.users) > 0 else False
#             room.save()
#             message_chat_consumer(user, room, 'remove')
#         elif action == 'inactivate':
#             room.users.clear()
#             room.is_active = False
#             room.save()
#             for u in room.users:
#                 message_chat_consumer(u, room, 'remove')
#     except Exception as e:
#         print(f"error creating tournament chatroom: {e}")



# def message_chat_consumer(user: UserAccount, chatroom: ChatRoom, action: Literal['add', 'remove']):
#     # room = get_user_notification_room(user)
#     try:
#         sync_send_consumer_internal_command(user.get_user_room(), {
#             'type': 'chat.room.add' if action == 'add' else 'chat.room.remove',
#             'group_name': chatroom.group_name,
#             'data': chatroom.get_room_data()
#         })
#     except Exception as e:
#         print(f"error {action} chat, send to consumer: {e}")
        
#         # if isinstance(layer, RedisChannelLayer):
#         #     msg: InternalCommandChatRoom = {
#         #             "type": msg_type,
#         #             "group_name": chatroom.group_name,
#         #             "data": chatroom.get_room_data()
#         #         }
#         #     async_to_sync(layer.group_send)( room, msg )