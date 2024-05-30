from typing import Iterable
from django.db import models
from user.models import *
from user.utils import *



class Tournament(models.Model):
	class GameID(models.IntegerChoices):
		Pong = 0, 'Pong'
		Other = 1, 'Other'
	name = models.CharField(max_length=30, default='Tournament')
	game_id = models.IntegerField(choices=GameID.choices, null=True)
	mode = models.CharField(max_length=50, blank=False)
	creator = models.ForeignKey(UserAccount, related_name='tournament_creator', on_delete=models.CASCADE)
	players = models.ManyToManyField(Player, related_name='tournament_players')
	nb_player = models.IntegerField()
	nb_rounds = models.IntegerField()
	status = models.CharField(max_length=20, default='waiting')
	started = models.DateTimeField(null=True, blank=True)
	ended = models.DateTimeField(null=True, blank=True)
	winner = models.ForeignKey(UserAccount, related_name='tournament_winner', on_delete=models.SET_NULL, null=True, blank=True)



class TournamentLobby(models.Model):
	tournament = models.ForeignKey(Tournament, related_name='tournament_tl', on_delete=models.CASCADE)
	player_one = models.ForeignKey(UserAccount, related_name='tournament_as_player_one', on_delete=models.CASCADE)
	player_two = models.ForeignKey(UserAccount, related_name='tournament_as_player_two', on_delete=models.CASCADE)
	round = models.CharField(max_length=30, default='First Round')
	status = models.CharField(max_length=20, default='not started')
	result = models.CharField(max_length=50)



class GameResults(models.Model): #TODO: change on_delete to SET_DEFAULT and set user to disbaled user
	game_id = models.CharField(max_length=10, null=False)
	game_mode = models.CharField(max_length=20, null=False)
	tournament = models.ForeignKey(Tournament, related_name='tournament_name', on_delete=models.SET_NULL, null=True, blank=True)
	player_one = models.ForeignKey(UserAccount, related_name='player_one', on_delete=models.SET_NULL, null=True)
	player_two = models.ForeignKey(UserAccount, related_name='player_two', on_delete=models.SET_NULL, null=True)
	player_one_score = models.IntegerField()
	player_two_score = models.IntegerField()
	winner = models.ForeignKey(UserAccount, related_name='winner', on_delete=models.SET_NULL, null=True)
	loser = models.ForeignKey(UserAccount, related_name='loser', on_delete=models.SET_NULL, null=True)
	timestamp = models.DateTimeField(auto_now_add=True)

	def save(self, *args, **kwargs):
		if not self.winner or not self.loser:
			if self.player_one_score > self.player_two_score:
				self.winner = self.player_one
				self.loser = self.player_two
			elif self.player_two_score > self.player_one_score:
				self.winner = self.player_two
				self.loser = self.player_one
		super().save(*args, **kwargs)



class GameSchedule(models.Model):
	class GameID(models.IntegerChoices):
		Pong = 0, 'Pong'
		Other = 1, 'Other'
	game_id = models.IntegerField(choices=GameID.choices, null=True)
	game_mode = models.CharField(max_length=20, null=True)
	tournament = models.ForeignKey(Tournament, related_name='tournament_gs', on_delete=models.SET_NULL, null=True, blank=True)
	player_one = models.ForeignKey(Player, related_name='player_one', on_delete=models.CASCADE)
	player_two = models.ForeignKey(Player, related_name='player_two', on_delete=models.CASCADE)
	is_active = models.BooleanField(blank=True, null=False, default=True)
	scheduled = models.DateTimeField(blank=True, null=True)
	timestamp = models.DateTimeField(auto_now_add=True)



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
	timestamp = models.DateTimeField(auto_now_add=True)

	def accept(self):
		player_one = Player.objects.get(user=self.user)
		player_two = Player.objects.get(user=self.invitee)
		game = GameSchedule.objects.create(
			player_one=player_one,
			player_two=player_two,
			game_id=self.game_id,
			game_mode=self.game_mode,
			tournament=self.tournament
		)
		game.save()
		self.is_active = False
		self.save()

	def reject(self):
		self.is_active = False
		self.save()

	def cancel(self):
		self.is_active = False
		self.save()





