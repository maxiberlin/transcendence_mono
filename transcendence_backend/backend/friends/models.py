from django.contrib.contenttypes.fields import GenericRelation
from django.db import models
from user.models import UserAccount
from chat.models import ChatRoom
from notification.models import Notification
from user.utils import ConflictExcept
from django.shortcuts import get_object_or_404       
from notification.utils import create_notification, update_notification
from django.db.models import Q

class FriendRequest(models.Model):
    
    sender = models.ForeignKey(UserAccount, related_name='sent_requests', on_delete=models.CASCADE)
    receiver = models.ForeignKey(UserAccount, related_name='received_requests', on_delete=models.CASCADE)
    is_active = models.BooleanField(blank=True, null=False, default=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    notifications = GenericRelation(Notification)

    def _update_state(self):
        self.is_active = False
        self.save()

    def accept(self):
        receiver_list = get_object_or_404(FriendList, user=self.receiver)
        sender_list = get_object_or_404(FriendList, user=self.sender)
        receiver_list.add_friend(self.sender)
        sender_list.add_friend(self.receiver)
        self._update_state()
        update_notification(self, f"You accepted {self.sender.username}'s friend request.")
        ChatRoom.rooms.create_private_chat(self.sender, self.receiver)
        return create_notification(self, self.receiver, self.sender, f"{self.receiver.username} accepted your friend request.")

    def reject(self):
        self._update_state()
        update_notification(self, f"You declined {self.sender}'s friend request.")
        return create_notification(self, self.receiver,self.sender, f"{self.receiver.username} declined your friend request.")

    def cancel(self):
        self._update_state()
        update_notification(self, f"{self.sender.username} cancelled the friend request.")
        return create_notification(self, self.receiver, self.sender, f"You cancelled the friend request to {self.receiver.username}.")


# class FriendRequestManager(models.Manager['FriendList']):
#     def get_friendlist_by_user(self, user: UserAccount | int):
#         return self.get(user=user)

class FriendList(models.Model):
    user = models.OneToOneField(UserAccount, on_delete=models.CASCADE)
    friends = models.ManyToManyField(UserAccount, blank=True, related_name='friends')
    notifications = GenericRelation(Notification)

    def __str__(self):
        return self.user.username
    
    # def _handle_chat_room(self, account: UserAccount, remove: bool):
    #     room = get_private_room_or_create(self.user, account)
    #     room.is_active = False if remove else True
    #     room.save()
    
    def add_friend(self, account: UserAccount):
        if account in self.friends.all():
            raise ConflictExcept("User is already your friend")
        if account == self.user:
            raise ConflictExcept("You can not add yourself to your friendlist")
        self.friends.add(account)
        self.save()
        # handle_private_chatroom_message_consumers('create', account, self.user)
        # self._handle_chat_room(account, False)
        create_notification(self, account, self.user, f"You are now friends with {account.username}.")

    def _remove_friend(self, account: UserAccount):
        if not (account in self.friends.all()):
            raise ConflictExcept("you cannot remove from friendlist, because you are not befriended")
        if account == self.user:
            raise ConflictExcept("You can not remove yourself from your friendlist")
        self.friends.remove(account)
        self.save()
        
        # handle_private_chatroom_message_consumers('inactivate', account, self.user)
        # self._handle_chat_room(account, False)
        
    
    def unfriend(self, friend: UserAccount):
        self._remove_friend(friend)
        get_object_or_404(FriendList, user=friend)._remove_friend(self.user)
        ChatRoom.rooms.toggle_private_chat('inactivate', friend, self.user)
        cancel_game_request_schedules(self.user, friend)
        create_notification(self, self.user, friend, f"You are no longer friends with {self.user.username}.")
        create_notification(self, friend, self.user, f"You are no longer friends with {friend.username}.")
        
    
    def is_mutual_friend(self, friend: UserAccount):
        if friend in self.friends.all():
            return True
        return False
    
    def get_friends_public_groups(self):
        friends = self.friends.all()
        return [u.get_friends_user_room() for u in friends if isinstance(u, UserAccount)]
    
    @property
    def get_cname(self):
        return 'FriendList'


class BlockList(models.Model):
    user = models.OneToOneField(UserAccount, on_delete=models.CASCADE)
    blocked = models.ManyToManyField(UserAccount, blank=True, related_name='blocked')

    def __str__(self):
        return self.user.username
    
    def block_user(self, account: UserAccount):
        if account in self.blocked.all():
            raise ConflictExcept("User is already blocked")
        if account == self.user:
            raise ConflictExcept("You can not block yourself")
        self.blocked.add(account)
        self.save()
        print('@@@@@@@@---> BLocked')
        ChatRoom.rooms.toggle_private_chat('inactivate', self.user, account)
        cancel_game_request_schedules(self.user, account)
        # room = get_private_room_or_create(self.user, account)
        # if room.is_active:
        #     room.is_active = False
        #     room.save()
        print('Room deactivated @@@@@@@@---')

    def unblock_user(self, account: UserAccount):
        if not (account in self.blocked.all()):
            raise ConflictExcept("you cannot remove from blocklist, because the user is not blocked")
        if account == self.user:
            raise ConflictExcept("You can not remove yourself from your blocklist")
        self.blocked.remove(account)
        other_list = BlockList.objects.get(user=account)
        if self.user not in other_list.blocked.all():
            print(f'<<<---------->>>')
            ChatRoom.rooms.toggle_private_chat('activate', self.user, account)
            # room = get_private_room_or_create(self.user, account)
            # if not room.is_active:
            #     room.is_active = True
            #     room.save()

    def is_blocked(self, account: UserAccount):
        if account in self.blocked.all():
            return True
        return False
    
    @staticmethod
    def is_either_blocked(auth_user, that_user):
        block_list = BlockList.objects.get(user=auth_user)
        other_block_list = BlockList.objects.get(user=that_user)
        if (block_list and block_list.is_blocked(that_user)) or (other_block_list and other_block_list.is_blocked(auth_user)):
            return True
        return False



def cancel_game_request_schedules(user, friend):
    from game.models import GameSchedule, GameRequest
    from user.models import Player
    
    #  player_two=Player.objects.get(user=friend))
    p1 = Player.objects.get(user=user)
    p2 = Player.objects.get(user=friend)
    print(f"p1: {p1}")
    print(f"p1: {p2}")
    schedules=GameSchedule.objects.filter(( ( Q(player_one=p1) & Q(player_two=p2) ) | ( Q(player_one=p2) & Q(player_two=p1) ) ), game_mode='1vs1', is_active=True)
    # schedules=GameSchedule.objects.filter(
    #     (
    #         ( Q(player_one=Player.objects.get(user=user))   & Q(player_two=Player.objects.get(user=friend)) ) |
    #         ( Q(player_one=Player.objects.get(user=friend)) & Q(player_one=Player.objects.get(user=user))   )
    #     ), 
    #     game_mode='1vs1',
    #     is_active=True
    # )
    
    print(f"cancel_game_request_schedules schedule: {schedules}")
    if len(schedules) > 0:
        for schedule in schedules:
            schedule.is_active = False
            schedule.save()
    requests = GameRequest.objects.filter(Q(user=user, invitee=friend) | Q(user=friend, invitee=user), is_active=True)
    if len(requests) > 0:
        for request in requests:
            request.is_active = False
            request.save()
# class FriendRequest(models.Model):
    
#     sender = models.ForeignKey(UserAccount, related_name='sent_requests', on_delete=models.CASCADE)
#     receiver = models.ForeignKey(UserAccount, related_name='received_requests', on_delete=models.CASCADE)
#     is_active = models.BooleanField(blank=True, null=False, default=True)
#     timestamp = models.DateTimeField(auto_now_add=True)
#     notifications = GenericRelation(Notification)


    
#     def accept(self):

#         receiver_list = get_object_or_404(FriendList, user=self.receiver)
#         if receiver_list:
#             content_type = ContentType.objects.get_for_model(self)
#             update_notification(self, f"You accepted {self.sender.username}'s friend request.")
#             #Update notification for RECEIVER
#             try:
#                 receiver_notification = Notification.objects.get(target=self.receiver, content_type=content_type, object_id=self.pk)
#                     # receiver_notification.is_active = False
#                 receiver_notification.read = True
#                 receiver_notification.redirect_url = f"profile/{self.sender.pk}"
#                 receiver_notification.description = f"You accepted {self.sender.username}'s friend request."
#                 receiver_notification.timestamp = timezone.now()
#                 receiver_notification.save()
#             except Exception:
#                 pass
            
#             #Add requester to user friendlist, then add to sender's friendlist
#             receiver_list.add_friend(self.sender)
#             sender_list = get_object_or_404(FriendList, user=self.sender)
#             if sender_list:
#                 sender_list.add_friend(self.receiver)
#                 self.is_active = False
#                 self.save()
#                 #Create notification for SENDER
#                 self.notifications.create(
# 					target=self.sender,
# 					from_user=self.receiver,
# 					redirect_url=f"profile/{self.receiver.pk}",
# 					description=f"{self.receiver.username} accepted your friend request.",
# 					content_type=content_type,
# 				)
#         return receiver_notification


#     def reject(self):
#         self.is_active = False
#         self.save()
#         content_type = ContentType.objects.get_for_model(self)
# 		#Update notification for RECEIVER
#         try:
#             notification = Notification.objects.get(target=self.receiver, content_type=content_type, object_id=self.pk)
#             # notification.is_active = False
#             notification.read = True
#             notification.redirect_url = f"profile/{self.sender.pk}"
#             notification.description = f"You declined {self.sender}'s friend request."
#             notification.from_user = self.sender
#             notification.timestamp = timezone.now()
#             notification.save()
#         except Exception:
#             pass
        
# 		#Create notification for SENDER
#         self.notifications.create(
#             target=self.sender,
#             description=f"{self.receiver.username} declined your friend request.",
#             from_user=self.receiver,
#             redirect_url=f"profile/{self.receiver.pk}",
#             content_type=content_type,
#         )
#         return notification

#     def cancel(self):
#         self.is_active = False
#         self.save()
#         content_type = ContentType.objects.get_for_model(self)
#         # Create notification for SENDER
#         self.notifications.create(
#             target=self.sender,
#             description=f"You cancelled the friend request to {self.receiver.username}.",
#             from_user=self.receiver,
#             redirect_url=f"profile/{self.receiver.pk}",
#             content_type=content_type,
#         )
#         try:
#             notification = Notification.objects.get(target=self.receiver, content_type=content_type, object_id=self.pk)
#             notification.description = f"{self.sender.username} cancelled the friend request."
#             notification.read = False
#             notification.save()
#         except Exception:
#             pass

#     @property
#     def get_cname(self):
#         return 'FriendRequest'

#     # def get_sender_data(self) -> "FriendRequestActionData":
#     #     return {
#     #         "request_id": self.pk,
#     #         "id": self.sender.pk,
#     #         "username": self.sender.username,
#     #         "avatar": self.sender.avatar.url
#     #     }
#     # def get_receiver_data(self) -> "FriendRequestActionData":
#     #     return {
#     #         "request_id": self.pk,
#     #         "id": self.receiver.pk,
#     #         "username": self.receiver.username,
#     #         "avatar": self.receiver.avatar.url
#     #     }
#     # def get_request_data(self) -> "FriendRequestData":
#     #     return {
#     #         "request_id": self.pk,
#     #         "updated_at": self.timestamp,
#     #         "sender": {
#     #             "id": self.sender.pk,
#     #             "username": self.sender.username,
#     #             "avatar": self.sender.avatar.url
#     #         },
#     #         "receiver": {
#     #             "id": self.sender.pk,
#     #             "username": self.sender.username,
#     #             "avatar": self.sender.avatar.url
#     #         }
#     #     }
    
    
#     # def get_notification_data(self, notification: Notification) -> "FriendRequestActionData":
#     #     return self.get_receiver_data() if notification.target == self.sender else self.get_sender_data()
        




# @receiver(post_save, sender=FriendRequest)
# def create_notification(sender: type[FriendRequest], instance: FriendRequest, created: bool, **kwargs):
# 	if created:
# 		instance.notifications.create(
# 			target=instance.receiver,
# 			from_user=instance.sender,
# 			redirect_url=f"profile/{instance.sender.pk}",
# 			description=f"{instance.sender.username} sent you a friend request.",
# 			content_type=instance,
# 		)


# class FriendList(models.Model):
#     user = models.OneToOneField(UserAccount, on_delete=models.CASCADE)
#     friends = models.ManyToManyField(UserAccount, blank=True, related_name='friends')
#     notifications = GenericRelation(Notification)

#     def __str__(self):
#         return self.user.username
    
#     def add_friend(self, account: UserAccount):
#         if account in self.friends.all():
#             raise ConflictExcept("User is already your friend")
#         if account == self.user:
#             raise ConflictExcept("You can not add yourself to your friendlist")
#         self.friends.add(account)
#         self.save()
#         room = get_private_room_or_create(self.user, account)
#         if not room.is_active:
#             room.is_active = True
#             room.save()
#         content_type = ContentType.objects.get_for_model(self)
#         self.notifications.create(
#             target=self.user,
#             from_user=account,
#             redirect_url=f"profile/{account.pk}",
#             description=f"You are now friends with {account.username}.",
#             content_type=content_type,
#         )
#         self.save()

#     def remove_friend(self, account: UserAccount):
#         if not (account in self.friends.all()):
#             raise ConflictExcept("you cannot remove from friendlist, because you are not befriended")
#         if account == self.user:
#             raise ConflictExcept("You can not remove yourself from your friendlist")
#         self.friends.remove(account)
#         self.save()
#         room = get_private_room_or_create(self.user, account)
#         if room.is_active:
#             room.is_active = False
#             room.save()
    
#     def unfriend(self, friend: UserAccount):
#         user = self
#         user.remove_friend(friend)
#         friendList = FriendList.objects.get(user=friend)
#         friendList.remove_friend(self.user)
#         content_type = ContentType.objects.get_for_model(self)
# 		# Create notification for removee
#         self.notifications.create(
# 			target=friend,
# 			from_user=self.user,
# 			redirect_url=f"profile/{self.user.pk}",
# 			description=f"You are no longer friends with {self.user.username}.",
# 			content_type=content_type,
# 		)
# 		# Create notification for remover
#         self.notifications.create(
# 			target=self.user,
# 			from_user=friend,
# 			redirect_url=f"profile/{friend.pk}",
# 			description=f"You are no longer friends with {friend.username}.",
# 			content_type=content_type,
# 		)
    
#     def is_mutual_friend(self, friend: UserAccount):
#         if friend in self.friends.all():
#             return True
#         return False
    
#     @property
#     def get_cname(self):
#         return 'FriendList'


# class BlockList(models.Model):
#     user = models.OneToOneField(UserAccount, on_delete=models.CASCADE)
#     blocked = models.ManyToManyField(UserAccount, blank=True, related_name='blocked')

#     def __str__(self):
#         return self.user.username
    
#     def block_user(self, account: UserAccount):
#         if account in self.blocked.all():
#             raise ConflictExcept("User is already blocked")
#         if account == self.user:
#             raise ConflictExcept("You can not block yourself")
#         self.blocked.add(account)
#         self.save()
#         print('@@@@@@@@---> BLocked')
#         room = get_private_room_or_create(self.user, account)
#         if room.is_active:
#             room.is_active = False
#             room.save()
#         print('Room deactivated @@@@@@@@---')

#     def unblock_user(self, account: UserAccount):
#         if not (account in self.blocked.all()):
#             raise ConflictExcept("you cannot remove from blocklist, because the user is not blocked")
#         if account == self.user:
#             raise ConflictExcept("You can not remove yourself from your blocklist")
#         self.blocked.remove(account)
#         other_list = BlockList.objects.get(user=account)
#         if self.user not in other_list.blocked.all():
#             print(f'<<<---------->>>')
#             room = get_private_room_or_create(self.user, account)
#             if not room.is_active:
#                 room.is_active = True
#                 room.save()

#     def is_blocked(self, account: UserAccount):
#         if account in self.blocked.all():
#             return True
#         return False
    
#     @staticmethod
#     def is_either_blocked(auth_user, that_user):
#         block_list = BlockList.objects.get(user=auth_user)
#         other_block_list = BlockList.objects.get(user=that_user)
#         if (block_list and block_list.is_blocked(that_user)) or (other_block_list and other_block_list.is_blocked(auth_user)):
#             return True
#         return False

