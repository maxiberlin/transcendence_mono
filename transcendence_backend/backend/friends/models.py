from django.contrib.contenttypes.fields import GenericRelation
from django.contrib.contenttypes.models import ContentType
from django.db import models
from user.models import UserAccount
from django.conf import settings
from django.utils import timezone
from notification.models import Notification
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.exceptions import PermissionDenied
from django.http import Http404
from user.utils import ConflictExcept    
from django.shortcuts import get_object_or_404       
from django.contrib.contenttypes.fields import ReverseGenericManyToOneDescriptor
from typing import TypedDict, Literal
from datetime import datetime

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
#             #Update notification for RECEIVER
#             receiver_notification = Notification.objects.get(target=self.receiver, content_type=content_type, object_id=self.pk)
#             # receiver_notification.is_active = False
#             receiver_notification.read = True
#             receiver_notification.redirect_url = f"profile/{self.sender.pk}"
#             receiver_notification.description = f"You accepted {self.sender.username}'s friend request."
#             receiver_notification.timestamp = timezone.now()
#             receiver_notification.save()

#             receiver_list.add_friend(self.sender)
#             sender_list = get_object_or_404(FriendList, user=self.sender)
#             if sender_list:
#                 #Create notification for SENDER
#                 self.notifications.create(
# 					target=self.sender,
# 					from_user=self.receiver,
# 					redirect_url=f"profile/{self.receiver.pk}",
# 					description=f"{self.receiver.username} accepted your friend request.",
# 					content_type=content_type,
# 				)
#                 sender_list.add_friend(self.receiver)
#                 self.is_active = False
#                 self.save()
#         return receiver_notification


#     def reject(self):
#         self.is_active = False
#         self.save()

#         content_type = ContentType.objects.get_for_model(self)
# 		#Update notification for RECEIVER
#         notification = Notification.objects.get(target=self.receiver, content_type=content_type, object_id=self.pk)
#         # notification.content_object.is_active = False
#         notification.read = True
#         notification.redirect_url = f"profile/{self.sender.pk}"
#         notification.description = f"You declined {self.sender}'s friend request."
#         notification.from_user = self.sender
#         notification.timestamp = timezone.now()
#         notification.save()
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
#         notification = Notification.objects.get(target=self.receiver, content_type=content_type, object_id=self.pk)
#         notification.description = f"{self.sender.username} cancelled the friend request."
#         notification.read = False
#         notification.save()

#     @property
#     def get_cname(self):
#         return 'FriendRequest'


class FriendRequestUserdata(TypedDict):
    id: int
    username: str
    avatar: str

class FriendRequestData(TypedDict):
    request_id: int
    updated_at: datetime
    sender: FriendRequestUserdata
    receiver: FriendRequestUserdata

class FriendRequestActionData(TypedDict):
    request_id: int
    id: int
    username: str
    avatar: str



class FriendRequest(models.Model):
    
    sender = models.ForeignKey(UserAccount, related_name='sent_requests', on_delete=models.CASCADE)
    receiver = models.ForeignKey(UserAccount, related_name='received_requests', on_delete=models.CASCADE)
    is_active = models.BooleanField(blank=True, null=False, default=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    notifications = GenericRelation(Notification)

    def accept(self):

        receiver_list = get_object_or_404(FriendList, user=self.receiver)
        if receiver_list:
            content_type = ContentType.objects.get_for_model(self)
            #Update notification for RECEIVER
            receiver_notification = Notification.objects.get(target=self.receiver, content_type=content_type, object_id=self.pk)
            # receiver_notification.is_active = False
            receiver_notification.read = True
            receiver_notification.redirect_url = f"profile/{self.sender.pk}"
            receiver_notification.description = f"You accepted {self.sender.username}'s friend request."
            receiver_notification.timestamp = timezone.now()
            receiver_notification.save()

            receiver_list.add_friend(self.sender)
            sender_list = get_object_or_404(FriendList, user=self.sender)
            if sender_list:
                #Create notification for SENDER
                self.notifications.create(
					target=self.sender,
					from_user=self.receiver,
					redirect_url=f"profile/{self.receiver.pk}",
					description=f"{self.receiver.username} accepted your friend request.",
					content_type=content_type,
				)
                sender_list.add_friend(self.receiver)
                self.is_active = False
                self.save()
        return receiver_notification


    def reject(self):
        self.is_active = False
        self.save()

        content_type = ContentType.objects.get_for_model(self)
		#Update notification for RECEIVER
        notification = Notification.objects.get(target=self.receiver, content_type=content_type, object_id=self.pk)
        notification.content_object
        # notification.content_object.is_active = False
        notification.read = True
        notification.redirect_url = f"profile/{self.sender.pk}"
        notification.description = f"You declined {self.sender}'s friend request."
        notification.from_user = self.sender
        notification.timestamp = timezone.now()
        notification.save()
		#Create notification for SENDER
        self.notifications.create(
            target=self.sender,
            description=f"{self.receiver.username} declined your friend request.",
            from_user=self.receiver,
            redirect_url=f"profile/{self.receiver.pk}",
            content_type=content_type,
        )
        return notification

    def cancel(self):
        self.is_active = False
        self.save()

        content_type = ContentType.objects.get_for_model(self)
        # Create notification for SENDER
        self.notifications.create(
            target=self.sender,
            description=f"You cancelled the friend request to {self.receiver.username}.",
            from_user=self.receiver,
            redirect_url=f"profile/{self.receiver.pk}",
            content_type=content_type,
        )
        notification = Notification.objects.get(target=self.receiver, content_type=content_type, object_id=self.pk)
        notification.description = f"{self.sender.username} cancelled the friend request."
        notification.read = False
        notification.save()

    @property
    def get_cname(self):
        return 'FriendRequest'
    
    def get_sender_data(self) -> "FriendRequestActionData":
        return {
            "request_id": self.pk,
            "id": self.sender.pk,
            "username": self.sender.username,
            "avatar": self.sender.avatar.url
        }
    def get_receiver_data(self) -> "FriendRequestActionData":
        return {
            "request_id": self.pk,
            "id": self.receiver.pk,
            "username": self.receiver.username,
            "avatar": self.receiver.avatar.url
        }
    def get_request_data(self) -> "FriendRequestData":
        return {
            "request_id": self.pk,
            "updated_at": self.timestamp,
            "sender": {
                "id": self.sender.pk,
                "username": self.sender.username,
                "avatar": self.sender.avatar.url
            },
            "receiver": {
                "id": self.sender.pk,
                "username": self.sender.username,
                "avatar": self.sender.avatar.url
            }
        }
    
    
    def get_notification_data(self, notification: Notification) -> "FriendRequestActionData":
        return self.get_receiver_data() if notification.target == self.sender else self.get_sender_data()
        




@receiver(post_save, sender=FriendRequest)
def create_notification(sender: type[FriendRequest], instance: FriendRequest, created: bool, **kwargs):
	if created:
		instance.notifications.create(
			target=instance.receiver,
			from_user=instance.sender,
			redirect_url=f"profile/{instance.sender.pk}",
			description=f"{instance.sender.username} sent you a friend request.",
			content_type=instance,
		)


class FriendList(models.Model):
    user = models.OneToOneField(UserAccount, on_delete=models.CASCADE)
    friends = models.ManyToManyField(UserAccount, blank=True, related_name='friends')
    notifications = GenericRelation(Notification)

    def __str__(self):
        return self.user.username
    
    def add_friend(self, account: UserAccount):
        if account in self.friends.all():
            raise ConflictExcept("User is already your friend")
        if account == self.user:
            raise ConflictExcept("You can not add yourself to your friendlist")
        self.friends.add(account)
        self.save()

        content_type = ContentType.objects.get_for_model(self)
        self.notifications.create(
            target=self.user,
            from_user=account,
            redirect_url=f"profile/{account.pk}",
            description=f"You are now friends with {account.username}.",
            content_type=content_type,
        )
        self.save()

    def remove_friend(self, account: UserAccount):
        if not (account in self.friends.all()):
            raise ConflictExcept("you cannot remove from friendlist, because you are not befriended")
        if account == self.user:
            raise ConflictExcept("You can not remove yourself from your friendlist")
        self.friends.remove(account)
        self.save()
    
    def unfriend(self, friend: UserAccount):
        user = self
        user.remove_friend(friend)
        friendList = FriendList.objects.get(user=friend)
        friendList.remove_friend(self.user)

        content_type = ContentType.objects.get_for_model(self)

		# Create notification for removee
        self.notifications.create(
			target=friend,
			from_user=self.user,
			redirect_url=f"profile/{self.user.pk}",
			description=f"You are no longer friends with {self.user.username}.",
			content_type=content_type,
		)

		# Create notification for remover
        self.notifications.create(
			target=self.user,
			from_user=friend,
			redirect_url=f"profile/{friend.pk}",
			description=f"You are no longer friends with {friend.username}.",
			content_type=content_type,
		)
    
    def is_mutual_friend(self, friend: UserAccount):
        if friend in self.friends.all():
            return True
        return False
    
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

    def unblock_user(self, account: UserAccount):
        if not (account in self.blocked.all()):
            raise ConflictExcept("you cannot remove from blocklist, because the user is not blocked")
        if account == self.user:
            raise ConflictExcept("You can not remove yourself from your blocklist")
        self.blocked.remove(account)

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

