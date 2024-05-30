from django.db import models
from user.models import UserAccount
from django.conf import settings                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 

# Create your models here.

class FriendRequest(models.Model):
    sender = models.ForeignKey(UserAccount, related_name='sent_requests', on_delete=models.CASCADE)
    receiver = models.ForeignKey(UserAccount, related_name='received_requests', on_delete=models.CASCADE)
    is_active = models.BooleanField(blank=True, null=False, default=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def accept(self):
        receiver_list = FriendList.objects.get(user=self.receiver)
        if receiver_list:
            receiver_list.add_friend(self.sender)
            sender_list = FriendList.objects.get(user=self.sender)
            if sender_list:
                sender_list.add_friend(self.receiver)
                self.is_active = False
                self.save()


    def reject(self):
        self.is_active = False
        self.save()

    def cancel(self):
        self.is_active = False
        self.save()


class FriendList(models.Model):
    user = models.OneToOneField(UserAccount, on_delete=models.CASCADE)
    friends = models.ManyToManyField(UserAccount, blank=True, related_name='friends')

    def __str__(self):
        return self.user.username
    
    def add_friend(self, account):
        if not account in self.friends.all():
            self.friends.add(account)
            self.save()

    def remove_friend(self, account):
        if account in self.friends.all():
            self.friends.remove(account)
    
    def unfriend(self, friend):
        user = self
        user.remove_friend(friend)
        friendList = FriendList.objects.get(user=friend)
        friendList.remove_friend(self.user)
    
    def is_mutual_friend(self, friend):
        if friend in self.friends.all():
            return True
        return False


class BlockList(models.Model):
    user = models.OneToOneField(UserAccount, on_delete=models.CASCADE)
    blocked = models.ManyToManyField(UserAccount, blank=True, related_name='blocked')

    def __str__(self):
        return self.user.username
    
    def block_user(self, account):
        if not account in self.blocked.all() and account != self.user:
            self.blocked.add(account)
            self.save()

    def unblock_user(self, account):
        if account in self.blocked.all() and account != self.user:
            self.blocked.remove(account)

    def is_blocked(self, account):
        if account in self.blocked.all():
            return True
        return False
    
    @staticmethod
    def is_either_blocked(auth_user, that_user):
        block_list = BlockList.objects.get(user=auth_user)
        other_block_list = BlockList.objects.get(user=that_user)

        if block_list and block_list.is_blocked(that_user) or other_block_list and other_block_list.is_blocked(auth_user):
            return True
        return False
