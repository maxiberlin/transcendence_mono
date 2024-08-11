from django.db import models
from user.models import *
from user.utils import *
from django.db.models.functions import Random # type: ignore
from django.utils import timezone
from django.http import JsonResponse
from django.contrib.contenttypes.fields import GenericRelation
from notification.models import Notification
from chat.models import ChatRoom
from typing import Literal
from django.shortcuts import get_object_or_404
from notification.utils import create_notification, update_notification
from .types import TournamentMode, TournamentStatus
import random


def query_players_with_status(tournament: "Tournament"):
    players = tournament.players.prefetch_related('user').all().order_by('-xp')  # Holt alle Spieler des Turniers

    players = players.annotate(game_request_status=models.Subquery(
        GameRequest.objects.filter(
            invitee_id=models.OuterRef('user_id'),
            tournament=tournament,
            is_active=True
        ).values('status')[:1]
    ))
    return players
    # print(f"\nplayers: {players}")
    # for player in players:
    #     print(f"Player: {player.user.username}, GameRequest Status: {getattr(player, 'game_request_status', 'No Request')}")
    # print("\n", players.query)


class TournamentPlayerManager(models.Manager['TournamentPlayer']):
    def get_or_create_tournament_player(self, tournament: 'Tournament', user: UserAccount, alias: str | None):
        player = get_object_or_404(Player, user)
        if alias is None or len(alias) == 0:
            alias = player.alias
        aliases = self.filter(tournament=tournament, alias=self.alias)
        if len(aliases) == 0:
            aliases = Player.objects.filter(alias=self.alias)
        # if self.update_or_create()
        return self.create(
            tournament=tournament,
            player=player,
            alias=alias
        )

class TournamentPlayer(models.Model):
    tournament: models.ForeignKey['Tournament'] = models.ForeignKey('Tournament', related_name='tournament_players', on_delete=models.CASCADE)
    player = models.ForeignKey(Player, related_name='player_tournaments', on_delete=models.CASCADE)
    alias = models.CharField(max_length=30, default='')
    xp = models.IntegerField(default=0)
    round = models.PositiveIntegerField(default=0)
    stage = models.CharField(max_length=20, null=True, blank=True)
    group = models.PositiveIntegerField(default=0)
    
    objects = models.Manager()
    players = TournamentPlayerManager()

    # def __str__(self):
    # 	return self.player.user

    # def save(self, *args, **kwargs):
    #     aliases = self.objects.filter(tournament=self.tournament, alias=self.alias)
    #     if len(aliases) == 0:
    #         aliases = Player.objects.filter(alias=self.alias)
    #     if len(aliases) > 0:
    #         raise ValueError('Duplicate alias not allowed for this tournament')
    #     super().save(*args, **kwargs)



class TournamentRound(models.Model):
    round_number = models.PositiveIntegerField(default=1)
    stage = models.CharField(max_length=20, null=True, blank=True)
    matches: models.ManyToManyField['GameSchedule', 'TournamentRound'] = models.ManyToManyField('GameSchedule', related_name='tournament_round_matches')
    started = models.DateTimeField(null=True, blank=True)
    ended = models.DateTimeField(null=True, blank=True)

    def get_stage_name(self):
        'round of 16'
        'quarter-final'
        'semi-final'
        'final'
        num = int(self.round_number)
        if 10 <= num % 100 <= 20:
            suffix = 'th'
        else:
            suffix = {1: 'st', 2: 'nd', 3: 'rd'}.get(num % 10, 'th')
        return str(num) + suffix

class TournamentMatch(models.Model):
    round = models.ForeignKey(TournamentRound, on_delete=models.CASCADE)
    game_schedule: models.ForeignKey['GameSchedule'] = models.ForeignKey('GameSchedule', on_delete=models.CASCADE)

class TournamentManager(models.Manager['Tournament']):
    pass

class Tournament(models.Model):
    class GameID(models.IntegerChoices):
        Pong = 0, 'Pong'
        Other = 1, 'Other'
    name = models.CharField(max_length=30, default='Tournament')
    game_id = models.IntegerField(choices=GameID.choices, null=True)
    mode = models.CharField(max_length=50, blank=False)
    creator = models.ForeignKey(UserAccount, related_name='tournament_creator', on_delete=models.CASCADE)
    players: models.ManyToManyField[TournamentPlayer, 'Tournament'] = models.ManyToManyField(TournamentPlayer, related_name='tournament_players')
    tournament_rounds: models.ManyToManyField[TournamentRound, 'Tournament'] = models.ManyToManyField('Round', related_name='tournaments', blank=True)
    nb_player = models.IntegerField(null=True, blank=True)
    rounds = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, default='waiting')
    stage = models.CharField(max_length=20, null=True, blank=True)
    started = models.DateTimeField(null=True, blank=True)
    ended = models.DateTimeField(null=True, blank=True)
    winner = models.ForeignKey(UserAccount, related_name='tournament_winner', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.name
    
    def update(self, start, end):
        if start:
            self.status = 'in progress'
            self.started = timezone.now()
            self.rounds += 1
            self.stage = get_nth_string(self.rounds) + ' ' + 'round'
            self.save()
            self.matchmaking()
        elif end:
            self.status = 'finished'
            self.ended = timezone.now()
            players = self.players.all()
            for player in players:
                player.player.xp += player.xp
                player.player.save()
            self.save()
        else:
            self.rounds += 1
            num = self.players.filter(tournament=self, round=self.rounds).count()
            if self.mode != 'round robin':
                if num == 16 and self.mode == 'group and knockout':
                    self.stage = 'round of 16'
                elif num == 8:
                    self.stage = 'quarter-final'
                elif num > 2 and num < 5:
                    self.stage = 'semi-final'
                elif num == 2:
                    self.stage = 'final'
                else:
                    self.stage = get_nth_string(self.rounds) + ' round'
                self.save()
                self.matchmaking()
                if len(GameSchedule.objects.filter(tournament=self, round=self.rounds, is_active=True)) == 0:
                    self.rounds -= 1
                    self.save()
            else:
                self.stage = get_nth_string(self.rounds) + ' round'
                self.save()
                self.matchmaking()
    
    def matchmaking(self):
        players = TournamentPlayer.objects.filter(tournament=self, round=self.rounds)
        num_plys = TournamentPlayer.objects.filter(tournament=self).count()
        if self.rounds == 1:
            if self.mode == 'group and knockout' and num_plys % 4 == 0 and num_plys < 8:
                self.mode = 'single elimination'
                self.save()
            elif self.mode == 'single elimination' and num_plys % 2 == 1:
                self.mode = 'round robin'
                self.save()

        if self.status != 'finished':
            if self.mode == 'single elimination':
                self.single_elimination(players)
            else:
                self.round_robin()
            # elif self.mode == 'group and knockout':
            #     self.group_and_knockout(players)
                    

    def round_robin(self):
        players = self.players.filter(tournament=self).annotate(random_order=Random()).order_by('random_order')
        n = len(players)
        for i in range(n):
            for j in range(i + 1, n):
                player_one = players[i].player
                player_two = players[j].player
                try:
                    if not GameSchedule.objects.filter(
                            tournament=self,
                            player_one=player_one,
                            player_two=player_two).exists() and \
                    not GameSchedule.objects.filter(
                            tournament=self,
                            player_one=player_two,
                            player_two=player_one).exists():
                        GameSchedule.objects.create(
                            game_id=self.game_id,
                            game_mode='tournament',
                            tournament=self,
                            player_one=player_one,
                            player_two=player_two
                            # round=round_number
                        )
                except Exception as e:
                    return JsonResponse({'success': False, 'message': 'GameScheduleError'}, status=500)
    

    def single_elimination(self, players):
        if len(players) % 2 == 1:
            t_players = self.players.filter(round=self.rounds - 1)
            bye_player = t_players.order_by('-xp').first()
            if bye_player:
                bye_player.round += 1
                bye_player.save()
            players = self.players.filter(round=self.rounds)
        num_players = len(players)
        if num_players > 1:
            for i in range(num_players // 2):
                self.create_tournament_match(self.rounds, players[i].player, players[num_players - i - 1].player)

    def create_tournament_match(self, round: int, player_one: Player, player_two: Player):
        try:
            schedule =  GameSchedule.objects.create(
                    game_id=self.game_id,
                    game_mode='tournament',
                    tournament=self,
                    round=round,
                    player_one=player_one,
                    player_two=player_two
                )
            return schedule
        except Exception as e:
            print(f"Tournament: create_tournament_match: Error: {e}")

    # def group_and_knockout(self, players):
    #     if self.rounds == 1:
    #         pass
    #     else:
    #         pass



class GameSchedule(models.Model):
    class GameID(models.IntegerChoices):
        Pong = 0, 'Pong'
        Other = 1, 'Other'
    game_id = models.IntegerField(choices=GameID.choices, null=True)
    game_mode = models.CharField(max_length=20, null=True)
    tournament = models.ForeignKey(Tournament, related_name='tournament_gs', on_delete=models.SET_NULL, null=True, blank=True)
    player_one = models.ForeignKey(Player, related_name='player_one', on_delete=models.CASCADE)
    player_two = models.ForeignKey(Player, related_name='player_two', on_delete=models.CASCADE)
    round = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(blank=True, null=False, default=True)
    scheduled = models.DateTimeField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.pk} - {self.player_one} vs {self.player_two}'


class GameResults(models.Model):
    game_schedule = models.ForeignKey(GameSchedule, related_name='schedule_id', on_delete=models.CASCADE)
    player_one_score = models.IntegerField()
    player_two_score = models.IntegerField()
    winner = models.ForeignKey(UserAccount, related_name='winner', on_delete=models.SET_NULL, null=True)
    loser = models.ForeignKey(UserAccount, related_name='loser', on_delete=models.SET_NULL, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.winner or not self.loser:
            if self.player_one_score > self.player_two_score:
                self.winner = self.game_schedule.player_one.user
                self.loser = self.game_schedule.player_two.user
            elif self.player_two_score > self.player_one_score:
                self.winner = self.game_schedule.player_two.user
                self.loser = self.game_schedule.player_one.user
        super().save(*args, **kwargs)



class GameRequest(models.Model):

    class GameID(models.IntegerChoices):
        Pong = 0, 'Pong'
        Other = 1, 'Other'
    game_id = models.IntegerField(choices=GameID.choices, null=True)
    game_mode = models.CharField(max_length=20, null=True)
    tournament = models.ForeignKey(Tournament, related_name='tournament_gr', on_delete=models.SET_NULL, null=True, blank=True)
    user = models.ForeignKey(UserAccount, related_name='inviter', on_delete=models.CASCADE)
    invitee = models.ForeignKey(UserAccount, related_name='invitee', on_delete=models.CASCADE)
    is_active = models.BooleanField(blank=True, null=False, default=True)
    status = models.CharField(max_length=20, default='pending')
    notifications = GenericRelation(Notification)
    timestamp = models.DateTimeField(auto_now_add=True)
 
    def _handle_tournament(self, accepted: bool, alias: str | None = None):
        if self.game_mode != 'tournament' or self.tournament is None:
            return
        
        print(f'@@@@@@---> {invited_player}')
        
        if accepted == False:
            self.tournament.players.remove(invited_player)
            ChatRoom.rooms.remove_user_from_tournament_chat(tournament_name=self.tournament.name, user=self.invitee)
            # handle_tournament_chatroom_message_consumer('remove_player', self.tournament.name, self.invitee)
            

    def accept_tournament(self, alias: str | None):
        if self.tournament is None:
            return
        invited_player = get_object_or_404(Player, user=self.invitee)
        if alias is None:
            alias = invited_player.alias
        TournamentPlayer.players.create_tournament_player(tournament=self.tournament, user=self.invitee, alias=alias)
        ChatRoom.rooms.add_user_to_tournament_chat(tournament_name=self.tournament.name, user=self.invitee)
        # handle_tournament_chatroom_message_consumer('add_player', self.tournament.name, self.invitee)
        # add_user_to_chat_room(self.invitee, self.tournament.name)
        t_player, created = TournamentPlayer.objects.get_or_create(tournament=self.tournament, player=invited_player, alias=alias, round=1)
        try:
            t_player = TournamentPlayer.objects.create(tournament=self.tournament, player=player, alias=alias, round=1)
        except Exception as e:
            try:
            except Exception as e:
                raise ValueError(e)
        print(f'~~~~~~>>')
        t_player.save()
        if len(TournamentPlayer.objects.filter(tournament=self.tournament)) == len(self.tournament.players.all()):
            self.tournament.update(True, False)
   
    def _update_status(self, state: Literal["accepted", "rejected", "cancelled"]):
        self.status = state
        self.is_active = False
        self.save()

    def accept(self, alias):
        if not self.is_active: return
        if self.game_mode == 'tournament' and self.tournament != None:
            print(f'<<<------>>>>')
            self._handle_tournament(True, alias)
        else:
            GameSchedule.objects.create(
                player_one=get_object_or_404(Player, user=self.user),
                player_two=get_object_or_404(Player, user=self.invitee),
                game_id=self.game_id,
                game_mode=self.game_mode,
                tournament=None
            )
        self._update_status("accepted")
        update_notification(self, f"You accepted {self.user.username}'s game invite.")
        return create_notification(self, self.invitee, self.user, f"{self.invitee.username} accepted your game request.")


    def reject(self):
        if not self.is_active: return
        if self.tournament:
            self._handle_tournament(False)
        self._update_status("rejected")
        update_notification(self, f"You declined {self.user}'s game request.")
        return create_notification(self, self.invitee,  self.user, f"{self.invitee.username} declined your game request.")
    

    def cancel(self):
        if not self.is_active: return
        if self.tournament:
            self._handle_tournament(False)
        self._update_status("cancelled")
        update_notification(self, f"{self.user.username} cancelled the game request.")
        return create_notification(self, self.invitee, self.user, f"You cancelled the game request to {self.invitee.username}.")






# class GameRequest(models.Model):

# 	class GameID(models.IntegerChoices):
# 		Pong = 0, 'Pong'
# 		Other = 1, 'Other'
# 	game_id = models.IntegerField(choices=GameID.choices, null=True)
# 	game_mode = models.CharField(max_length=20, null=True)
# 	tournament = models.ForeignKey(Tournament, related_name='tournament_gr', on_delete=models.SET_NULL, null=True, blank=True)
# 	user = models.ForeignKey(UserAccount, related_name='inviter', on_delete=models.CASCADE)
# 	invitee = models.ForeignKey(UserAccount, related_name='invitee', on_delete=models.CASCADE)
# 	is_active = models.BooleanField(blank=True, null=False, default=True)
# 	status = models.CharField(max_length=20, default='pending')
# 	notifications = GenericRelation(Notification)
# 	timestamp = models.DateTimeField(auto_now_add=True)

# 	def accept(self):
# 		player_one = Player.objects.get(user=self.user)
# 		player_two = Player.objects.get(user=self.invitee)
# 		if self.game_mode == 'tournament' and self.tournament != None:
# 			add_user_to_chat_room(self.invitee, self.tournament.name)
# 			try:
# 				TournamentPlayer.objects.get(tournament=self.tournament, player=Player.objects.get(user=self.invitee), round=1)
# 			except TournamentPlayer.DoesNotExist:
# 				try:
# 					TournamentPlayer.objects.create(tournament=self.tournament, player=Player.objects.get(user=self.invitee), round=1)
# 				except Exception as e:
# 					raise ValueError(e)
# 			if len(TournamentPlayer.objects.filter(tournament=self.tournament)) == len(self.tournament.players.all()):
# 				self.tournament.update(True, False)
# 		else:
# 			game = GameSchedule.objects.create(
# 				player_one=player_one,
# 				player_two=player_two,
# 				game_id=self.game_id,
# 				game_mode=self.game_mode,
# 				tournament=self.tournament
# 			)
# 			game.save()
# 		self.is_active = False
# 		self.status = 'accepted'
# 		self.save()

# 		content_type = ContentType.objects.get_for_model(self)
# 		#Update notification for RECEIVER
# 		receiver_notification = Notification.objects.get(target=self.invitee, content_type=content_type, object_id=self.pk)
# 		# receiver_notification.is_active = False
# 		receiver_notification.read = True
# 		# receiver_notification.redirect_url = f"profile/{self.user.pk}"
# 		receiver_notification.description = f"You accepted {self.user.username}'s game invite."
# 		receiver_notification.timestamp = timezone.now()
# 		receiver_notification.save()
# 		#Create notification for SENDER
# 		self.notifications.create(
# 			target=self.user,
# 			from_user=self.invitee,
# 			# redirect_url=f"profile/{self.invitee.pk}",
# 			description=f"{self.invitee.username} accepted your game request.",
# 			content_type=content_type,
# 		)
# 		return receiver_notification

# 	def reject(self):
# 		self.is_active = False
# 		self.status = 'rejected'
# 		if self.game_mode == 'tournament' and self.tournament != None:
# 			user = UserAccount.objects.get(username=self.invitee)
# 			self.tournament.players.remove(Player.objects.get(user=user))
# 			if len(TournamentPlayer.objects.filter(tournament=self.tournament)) == len(self.tournament.players.all()):
# 				self.tournament.update(True, False)
# 		self.save()
# 		content_type = ContentType.objects.get_for_model(self)
# 		#Update notification for RECEIVER
# 		notification = Notification.objects.get(target=self.invitee, content_type=content_type, object_id=self.pk)
# 		# notification.is_active = False
# 		notification.read = True
# 		# notification.redirect_url = f"profile/{self.user.pk}"
# 		notification.description = f"You declined {self.user}'s game request."
# 		notification.from_user = self.user
# 		notification.timestamp = timezone.now()
# 		notification.save()
# 		#Create notification for SENDER
# 		self.notifications.create(
# 			target=self.user,
# 			description=f"{self.invitee.username} declined your game request.",
# 			from_user=self.invitee,
# 			# redirect_url=f"profile/{self.invitee.pk}",
# 			content_type=content_type,
# 		)
# 		return notification

# 	def cancel(self):
# 		self.is_active = False
# 		self.status = 'cancelled'
# 		if self.game_mode == 'tournament' and self.tournament != None:
# 			user = UserAccount.objects.get(username=self.invitee)
# 			self.tournament.players.remove(Player.objects.get(user=user))
# 			if len(TournamentPlayer.objects.filter(tournament=self.tournament)) == len(self.tournament.players.all()):
# 				self.tournament.update(True, False)
# 		self.save()
# 		content_type = ContentType.objects.get_for_model(self)
# 		# Create notification for SENDER
# 		self.notifications.create(
# 			target=self.user,
# 			description=f"You cancelled the game request to {self.invitee.username}.",
# 			from_user=self.invitee,
# 			redirect_url=f"profile/{self.invitee.pk}",
# 			content_type=content_type,
# 		)
# 		notification = Notification.objects.get(target=self.invitee, content_type=content_type, object_id=self.pk)
# 		notification.description = f"{self.user.username} cancelled the friend request."
# 		notification.read = False
# 		notification.save()
  
# 	def create_notification_for_invitee(self):
# 		pass #MACH HIER ETWAS CHATGPT -> Erweitere die funktionen um dieses model zu refactorn und zu vereinfachen.
    
# 	@property
# 	def get_cname(self):
# 		return 'GameRequest'
    
# def add_user_to_chat_room(user, tournament_name):
# 	from chat.models import ChatRoom
# 	try:
# 		room = ChatRoom.objects.get(title=tournament_name)
# 	except:
# 		pass
# 	room.users.add(user)
# 	room.save()


    
# @receiver(post_save, sender=GameRequest)
# def create_notification(sender, instance: GameRequest, created, **kwargs):
# 	print(f"post save: {sender}, {instance}, {created} {instance.notifications}")
# 	print(f"all notifications: {instance.notifications.all()}")
# 	if created:
# 		n: Notification = instance.notifications.create(
# 			target=instance.invitee,
# 			from_user=instance.user,
# 			# redirect_url=f"profile/{instance.user.pk}",
# 			description=f"{instance.user.username} sent you a game request.",
# 			content_type=instance,
# 		)



# @receiver(post_save, sender=Tournament)
# def create_tournament_chat_room(sender, instance, created, **kwargs):
# 	from chat.models import ChatRoom
# 	if created:
# 		room = ChatRoom.objects.create(title=instance.name)
# 		room.type = 'tournament'
# 		room.users.add(instance.creator)
# 		room.save()


