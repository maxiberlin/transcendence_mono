from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from .utils import *


class UserAccountManager(BaseUserManager):

    def create_user(self, username, email, password=None):
        if not username:
            raise ValueError('Username cannot be null')
        if not email:
            raise ValueError('email cannot be null')
        user = self.model(
            username=username,
            email=self.normalize_email(email),
        )
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, username, email, password):
        user = self.create_user(
            username=username,
            email=self.normalize_email(email),
            password=password,
        )
        user.is_admin = True
        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)
        return user


class UserAccount(AbstractBaseUser):
    Oauth_Choices = [
        (None, 'None'),
        ('42api', '42api'),
    ]
    username = models.CharField(max_length=30, unique=True)
    email = models.EmailField(max_length=60, verbose_name='email', unique=True)
    first_name = models.CharField(max_length=30, verbose_name='first name')
    last_name = models.CharField(max_length=30, verbose_name='last name')
    avatar = models.ImageField(max_length=255, upload_to=get_avatar_path, null=True, blank=True, default=set_default_avatar)
    status = models.CharField(max_length=10, default='offline')
    is_2fa = models.BooleanField(default=False)
    oauth = models.CharField(max_length=10, choices=Oauth_Choices, null=True, default=None)
    full_profile = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_admin = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    last_login = models.DateTimeField(verbose_name='last login', auto_now=True)
    date_joined = models.DateTimeField(verbose_name='date joined', auto_now_add=True)

    objects = UserAccountManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    def __str__(self):
        return self.username

    def get_avatar_filename(self):
        return str(self.avatar)[str(self.avatar).index(f'avatars/{self.pk}/'):]
    
    def has_perm(self, perm, object=None):
        return self.is_admin
    
    def has_module_perms(self, app_label):
        return True
    


class Player(models.Model):
    user = models.OneToOneField(UserAccount, related_name='player', on_delete=models.CASCADE)
    alias = models.CharField(max_length=30, unique=True)
    games_played = models.PositiveIntegerField(default=0)
    wins = models.PositiveIntegerField(default=0)
    losses = models.PositiveIntegerField(default=0)
    win_loss_margin = models.JSONField(default=list)
    xp = models.PositiveIntegerField(default=10)


    def __str__(self):
        return self.user.username

    def save(self, *args, **kwargs):
        if not self.alias:
            self.alias = self.user.username
        super().save(*args, **kwargs)






# class GameSession(models.Model):
#     class GameID(models.IntegerChoices):
#         Pong = 0, 'Pong'
#         Other = 1, 'Other'
#     players = models.ManyToManyField(Player)
#     player_scores = models.JSONField(default=dict)
#     game_mode = models.CharField(max_length=20)
#     game_id = models.IntegerField(choices=GameID.choices, null=True)


#     def update_score(self, player, score):
#         self.player_scores[player.username] = score
#         self.save()

#     def end_game(self):
#         player_one = self.players.first()
#         player_two = self.players.last()
#         player_one_score = self.player_scores.get(player_one.username, 0)
#         player_two_score = self.player_scores.get(player_two.username, 0)

#         match_history = MatchHistory.objects.create(
#             player_one = player_one,
#             player_two = player_two,
#             player_one_score = player_one_score,
#             player_two_score = player_two_score,
#             game_mode = self.game_mode,
#             game_id = self.game_id
#         )

#         if player_one_score > player_two_score:
#             winner = player_one
#             losser = player_two
#         else:
#             winner = player_two
#             losser = player_one
        
#         # TODO: update the wins and losses in the user profile


# class MatchHistory(models.Model):
#     match_id = models.AutoField(primary_key=True)
#     game_id = models.IntegerField()
#     timestamp = models.DateTimeField(auto_now_add=True)
#     game_mode = models.CharField(max_length=20)
#     player_one = models.ForeignKey(UserAccount, related_name='matches_as_player_one', on_delete=models.CASCADE)
#     player_two = models.ForeignKey(UserAccount, related_name='matches_as_player_two', on_delete=models.CASCADE)
#     player_one_score = models.PositiveIntegerField()
#     player_two_score = models.PositiveIntegerField()
#     result = models.CharField(max_length=50)

#     # custom save fuction for the model to capture the resut field?
#     def save(self, *args, **kwargs):
#         pass



# class TournamentInvite(models.Model):
#     id = models.AutoField(primary_key=True)
#     tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE)
#     sender = models.ForeignKey(UserAccount, related_name='invite_sent', on_delete=models.CASCADE)
#     reciever = models.ForeignKey(UserAccount, related_name='invite_recieved', on_delete=models.CASCADE)
#     status = models.CharField(max_length=20, default='pending')
#     timestamp = models.DateTimeField(auto_now_add=True)



# class Chat(models.Model):
#     sender = models.ForeignKey(UserAccount, related_name='sent_messages', on_delete=models.CASCADE)
#     receiver = models.ForeignKey(UserAccount, related_name='received_messages', on_delete=models.CASCADE)
#     message = models.TextField()
#     timestamp = models.DateTimeField(auto_now_add=True)

