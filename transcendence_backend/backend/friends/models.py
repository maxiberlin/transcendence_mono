from django.db import models
from user.models import UserAccount
from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.http import Http404
from user.utils import ConflictExcept    
from django.shortcuts import get_object_or_404                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

# Create your models here.

class FriendRequest(models.Model):
    sender = models.ForeignKey(UserAccount, related_name='sent_requests', on_delete=models.CASCADE)
    receiver = models.ForeignKey(UserAccount, related_name='received_requests', on_delete=models.CASCADE)
    is_active = models.BooleanField(blank=True, null=False, default=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def accept(self):
        receiver_list = get_object_or_404(FriendList, user=self.receiver)
        sender_list = get_object_or_404(FriendList, user=self.sender)
        receiver_list.add_friend(self.sender)
        sender_list.add_friend(self.receiver)
        self.is_active = False
        self.save()


    def reject(self):
        self.is_active = False
        self.save()

    def cancel(self):
        self.is_active = False
        self.save()

    # def accept(self, receiver: UserAccount):
    #     receiver_list = FriendList.objects.get(user=self.receiver)
    #     if receiver_list:
    #         receiver_list.add_friend(self.sender)
    #         sender_list = FriendList.objects.get(user=self.sender)
    #         if sender_list:
    #             sender_list.add_friend(self.receiver)
    #             self.is_active = False
    #             self.save()

    # def reject(self):
    #     self.is_active = False
    #     self.save()

    # def cancel(self):
    #     self.is_active = False
    #     self.save()


class FriendList(models.Model):
    user = models.OneToOneField(UserAccount, on_delete=models.CASCADE)
    friends = models.ManyToManyField(UserAccount, blank=True, related_name='friends')

    def __str__(self):
        return self.user.username
    
    def add_friend(self, account: UserAccount):
        if account in self.friends.all():
            raise ConflictExcept("User is already your friend")
        if account == self.user:
            raise ConflictExcept("You can not add yourself to your friendlist")
        self.friends.add(account)
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
    
    def is_mutual_friend(self, friend: UserAccount):
        if friend in self.friends.all():
            return True
        return False


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
