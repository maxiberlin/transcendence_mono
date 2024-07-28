from typing import Iterable
from django.db import models
from user.models import *
from user.utils import *
from django.db.models import Q
from django.db.models.functions import Random # type: ignore
from django.db.models import Max
from django.utils import timezone
from django.http import JsonResponse
from django.contrib.contenttypes.fields import GenericRelation
from django.contrib.contenttypes.models import ContentType
from django.dispatch import receiver
from django.db.models.signals import post_save
from notification.models import Notification
from typing import Type



class Tournament(models.Model):
	class GameID(models.IntegerChoices):
		Pong = 0, 'Pong'
		Other = 1, 'Other'
	name = models.CharField(max_length=30, default='Tournament')
	game_id = models.IntegerField(choices=GameID.choices, null=True)
	mode = models.CharField(max_length=50, blank=False)
	creator = models.ForeignKey(UserAccount, related_name='tournament_creator', on_delete=models.CASCADE)
	players = models.ManyToManyField(Player, related_name='tournament_players')
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
			players = TournamentPlayer.objects.filter(tournament=self)
			for player in players:
				player.player.xp += player.xp
				player.player.save()
			self.save()
		else:
			self.rounds += 1
			num = TournamentPlayer.objects.filter(tournament=self, round=self.rounds).count()
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
			elif self.mode == 'group and knockout':
				self.group_and_knockout(players)
			else:
				self.round_robin()
					

	def round_robin(self):
		try:
			players = TournamentPlayer.objects.filter(tournament=self).annotate(random_order=Random()).order_by('random_order')
		except Exception as e:
			return JsonResponse({'success': False, 'message': 'TournamentPlayer: ' + str(e)}, status=500)
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
			t_players = TournamentPlayer.objects.filter(tournament=self, round=self.rounds - 1)
			bye_player = t_players.order_by('-xp').first()
			if bye_player:
				bye_player.round += 1
				bye_player.save()
			players = TournamentPlayer.objects.filter(tournament=self, round=self.rounds)
		num_players = len(players)
		if num_players > 1:
			for i in range(num_players // 2):
				try:
					schedule = GameSchedule.objects.create(
						game_id=self.game_id,
						game_mode='tournament',
						tournament=self,
						round=self.rounds,
						player_one=players[i].player,
						player_two=players[num_players - i - 1].player
					)
				except Exception as e:
					return JsonResponse({'success': False, 'message': 'GameScheduleError'}, status=500)


	def group_and_knockout(self, players):
		if self.rounds == 1:
			pass
		else:
			pass



class TournamentPlayer(models.Model):
	tournament = models.ForeignKey(Tournament, related_name='tournament_players', on_delete=models.CASCADE)
	player = models.ForeignKey(Player, related_name='player_tournaments', on_delete=models.CASCADE)
	xp = models.IntegerField(default=0)
	round = models.PositiveIntegerField(default=0)
	stage = models.CharField(max_length=20, null=True, blank=True)
	group = models.PositiveIntegerField(default=0)

	# def __str__(self):
	# 	return self.player.user



class TournamentLobby(models.Model):
	tournament = models.ForeignKey(Tournament, related_name='tournament_tl', on_delete=models.CASCADE)
	winners = models.ManyToManyField(Player, related_name='winners')
	losers = models.ManyToManyField(Player, related_name='losers')


class GameResults(models.Model):
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
	round = models.PositiveIntegerField(default=0)
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
	status = models.CharField(max_length=20, default='pending')
	notifications = GenericRelation(Notification)
	timestamp = models.DateTimeField(auto_now_add=True)

	def accept(self):
		player_one = Player.objects.get(user=self.user)
		player_two = Player.objects.get(user=self.invitee)
		if self.game_mode == 'tournament' and self.tournament != None:
			try:
				TournamentPlayer.objects.get(tournament=self.tournament, player=Player.objects.get(user=self.invitee), round=1)
			except TournamentPlayer.DoesNotExist:
				try:
					TournamentPlayer.objects.create(tournament=self.tournament, player=Player.objects.get(user=self.invitee), round=1)
				except Exception as e:
					raise ValueError(e)
			if len(TournamentPlayer.objects.filter(tournament=self.tournament)) == len(self.tournament.players.all()):
				self.tournament.update(True, False)
		else:
			game = GameSchedule.objects.create(
				player_one=player_one,
				player_two=player_two,
				game_id=self.game_id,
				game_mode=self.game_mode,
				tournament=self.tournament
			)
			game.save()
		self.is_active = False
		self.status = 'accepted'
		self.save()
		content_type = ContentType.objects.get_for_model(self)
		#Update notification for RECEIVER
		receiver_notification = Notification.objects.get(target=self.invitee, content_type=content_type, object_id=self.pk)
		# receiver_notification.is_active = False
		receiver_notification.content_object
		receiver_notification.read = True
		# receiver_notification.redirect_url = f"profile/{self.user.pk}"
		receiver_notification.description = f"You accepted {self.user.username}'s game invite."
		receiver_notification.timestamp = timezone.now()
		receiver_notification.save()
		#Create notification for SENDER
		self.notifications.create(
			target=self.user,
			from_user=self.invitee,
			# redirect_url=f"profile/{self.invitee.pk}",
			description=f"{self.invitee.username} accepted your game request.",
			content_type=content_type,
		)
		return receiver_notification

	def reject(self):
		self.is_active = False
		self.status = 'rejected'
		if self.game_mode == 'tournament' and self.tournament != None:
			user = UserAccount.objects.get(username=self.invitee)
			self.tournament.players.remove(Player.objects.get(user=user))
			if len(TournamentPlayer.objects.filter(tournament=self.tournament)) == len(self.tournament.players.all()):
				self.tournament.update(True, False)
		self.save()
		content_type = ContentType.objects.get_for_model(self)
		#Update notification for RECEIVER
		notification = Notification.objects.get(target=self.invitee, content_type=content_type, object_id=self.pk)
		# notification.is_active = False
		notification.read = True
		# notification.redirect_url = f"profile/{self.user.pk}"
		notification.description = f"You declined {self.user}'s game request."
		notification.from_user = self.user
		notification.timestamp = timezone.now()
		notification.save()
		#Create notification for SENDER
		self.notifications.create(
            target=self.user,
            description=f"{self.invitee.username} declined your game request.",
            from_user=self.invitee,
            # redirect_url=f"profile/{self.invitee.pk}",
            content_type=content_type,
        )
		return notification

	def cancel(self):
		self.is_active = False
		self.status = 'cancelled'
		if self.game_mode == 'tournament' and self.tournament != None:
			user = UserAccount.objects.get(username=self.invitee)
			self.tournament.players.remove(Player.objects.get(user=user))
			if len(TournamentPlayer.objects.filter(tournament=self.tournament)) == len(self.tournament.players.all()):
				self.tournament.update(True, False)
		self.save()
		content_type = ContentType.objects.get_for_model(self)
        # Create notification for SENDER
		self.notifications.create(
            target=self.user,
            description=f"You cancelled the game request to {self.invitee.username}.",
            from_user=self.invitee,
            redirect_url=f"profile/{self.invitee.pk}",
            content_type=content_type,
        )
		notification = Notification.objects.get(target=self.invitee, content_type=content_type, object_id=self.pk)
		notification.description = f"{self.user.username} cancelled the friend request."
		notification.read = False
		notification.save()
	
	@property
	def get_cname(self):
		return 'GameRequest'
	
@receiver(post_save, sender=GameRequest)
def create_notification(sender, instance: GameRequest, created, **kwargs):
	if created:
		instance.notifications.create(
			target=instance.invitee,
			from_user=instance.user,
			# redirect_url=f"profile/{instance.user.pk}",
			description=f"{instance.user.username} sent you a game request.",
			content_type=instance,
		)



# from typing import Iterable
# from django.db import models
# from user.models import *
# from user.utils import *
# from django.db.models import Q
# from django.db.models import Max
# from django.utils import timezone
# from django.http import JsonResponse

# class Tournament(models.Model):
# 	class GameID(models.IntegerChoices):
# 		Pong = 0, 'Pong'
# 		Other = 1, 'Other'
# 	name = models.CharField(max_length=30, default='Tournament')
# 	game_id = models.IntegerField(choices=GameID.choices, null=True)
# 	mode = models.CharField(max_length=50, blank=False)
# 	creator = models.ForeignKey(UserAccount, related_name='tournament_creator', on_delete=models.CASCADE)
# 	players = models.ManyToManyField(Player, related_name='tournament_players')
# 	nb_player = models.IntegerField(null=True, blank=True)
# 	rounds = models.PositiveIntegerField(default=0)
# 	status = models.CharField(max_length=20, default='waiting')
# 	stage = models.CharField(max_length=20, null=True, blank=True)
# 	started = models.DateTimeField(null=True, blank=True)
# 	ended = models.DateTimeField(null=True, blank=True)
# 	winner = models.ForeignKey(UserAccount, related_name='tournament_winner', on_delete=models.SET_NULL, null=True, blank=True)

# 	def __str__(self):
# 		return self.name
	
# 	def update(self, start, end):
# 		if start:
# 			self.status = 'in progress'
# 			self.started = timezone.now()
# 			self.rounds += 1
# 			self.stage = get_nth_string(self.rounds) + ' ' + 'round'
# 			self.save()
# 			self.matchmaking()
# 		elif end:
# 			self.status = 'finished'
# 			self.ended = timezone.now()
# 			players = TournamentPlayer.objects.filter(tournament=self)
# 			for player in players:
# 				player.player.xp += player.xp
# 				player.player.save()
# 			self.save()
# 		else:
# 			self.rounds += 1
# 			num = TournamentPlayer.objects.filter(tournament=self, round=self.rounds).count()
# 			print(f'@@@@@>>>>> {num}')
# 			if self.mode != 'round robin':
# 				if num == 16 and self.mode == 'group and knockout':
# 					self.stage = 'round of 16'
# 				elif num == 8:
# 					self.stage = 'quarter-final'
# 				elif num == 4:
# 					self.stage = 'semi-final'
# 				elif num == 2:
# 					self.stage = 'final'
# 				else:
# 					self.stage = get_nth_string(self.rounds) + ' round'
# 				self.save()
# 				self.matchmaking()
# 				if len(GameSchedule.objects.filter(tournament=self, round=self.rounds, is_active=True)) == 0:
# 					self.rounds -= 1
# 					self.save()
# 			else:
# 				self.stage = get_nth_string(self.rounds) + ' round'
# 				self.save()
# 				self.matchmaking()
	
# 	def matchmaking(self):
# 		players = TournamentPlayer.objects.filter(tournament=self, round=self.rounds)
# 		num_plys = TournamentPlayer.objects.filter(tournament=self).count()
# 		if self.rounds == 1:
# 			if self.mode == 'group and knockout' and num_plys % 4 == 0 and num_plys < 8:
# 				self.mode = 'single elimination'
# 				self.save()
# 			elif self.mode == 'single elimination' and num_plys % 4 == 1:
# 				self.mode = 'round robin'
# 				self.save()

# 		if self.status != 'finished':
# 			if self.mode == 'single elimination':
# 				self.single_elimination(players)
# 			elif self.mode == 'group and knockout':
# 				self.group_and_knockout(players)
# 			else:
# 				self.round_robin()
# 				# if len(GameSchedule.objects.filter(tournament=self, is_active=True)) == len(GameSchedule.objects.filter(tournament=self, is_active=True, round=0)):
# 				# 	players = TournamentPlayer.objects.filter(tournament=self)
# 				# 	schedules = GameSchedule.objects.filter(tournament=self, is_active=True)
# 				# 	print(f' >>>> num schedule {len(schedules)}')
# 				# 	i = 0
# 				# 	for player in players:
# 				# 		num_round = len(players) - 1
# 				# 		if i == 0:
# 				# 			schedule = schedules.filter(Q(player_one=player.player) | Q(player_two=player.player))
# 				# 			for game in schedule:
# 				# 				game.round = num_round
# 				# 				game.save()
# 				# 				num_round -= 1
# 				# 		else:
# 				# 			print(f'---> Begint')
# 				# 			match_as_player_one = schedules.filter(player_one=player.player)
# 				# 			match_as_player_two = schedules.filter(player_two=player.player)
# 				# 			print(f'<--> {player.player} MAPO ---> {match_as_player_one} \n MAPT ---> {match_as_player_two}')
# 				# 			ply1_rounds = []
# 				# 			ply2_rounds = []
# 				# 			print(f'---> <---')
# 				# 			schedule = schedules.filter(Q(player_one=player.player) | Q(player_two=player.player))

# 				# 			print(f'---> 3 <--- {schedule}')
							
# 				# 			for game in schedule:
# 				# 				if game.round > 0:
# 				# 					print(f'    ---> game_id {game.id}')
# 				# 					ply1_rounds.append(game.round)
# 				# 			print(f'   ply1_rounds -----> {ply1_rounds}')
# 				# 			for game in match_as_player_one:
# 				# 				if ply2_rounds:
# 				# 					ply2_rounds.clear()
# 				# 				print(f'    --->>> game {game.id}')
# 				# 				schedule_mapo = schedules.filter(Q(player_one=game.player_two) | Q(player_two=game.player_two))
# 				# 				print(f'   ---> 2 <--- {game.player_two}  <<-->> {schedule_mapo}')
# 				# 				for game_mapo in schedule_mapo:
# 				# 					if game_mapo.round > 0:
# 				# 						print(f'    ---> game_mapo_id {game_mapo.id}')
# 				# 						ply2_rounds.append(game_mapo.round)
# 				# 				print(f'   ply2_rounds -----> {ply2_rounds} \n     <->round {game.round}')
# 				# 				if game.round < 1:
# 				# 					n = num_round
# 				# 					print(f'    >>>> {n}')
# 				# 					while n:
# 				# 						print(f'    >>>>--<<<<')
# 				# 						if n not in ply1_rounds and n not in ply2_rounds:
# 				# 							print(f'    >>>>GOOD<<<<')
# 				# 							game.round = n
# 				# 							game.save()
# 				# 							print(f'   <-->round {game.round}')
# 				# 							break
# 				# 						n -= 1
# 				# 				# ply2_rounds.clear()
# 				# 			for game in match_as_player_two:
# 				# 				if ply2_rounds:
# 				# 					ply2_rounds.clear()
# 				# 				# player_two = game.player_one
# 				# 				schedule_mapt = schedules.filter(Q(player_one=game.player_one) | Q(player_two=game.player_one))
# 				# 				print(f'   ---> 1 <--- {game.player_one}  <<-->> {schedule_mapt}')
# 				# 				for game_mapt in schedule_mapt:
# 				# 					if game_mapt.round > 0:
# 				# 						print(f'    ---> game_mapt_id {game_mapt.id}')
# 				# 						ply2_rounds.append(game_mapt.round)
# 				# 				print(f'   ply2_rounds -----> {ply2_rounds} \n     <->round {game.round}')
# 				# 				if game.round < 1:
# 				# 					n = num_round
# 				# 					print(f'    >>>> {n}')
# 				# 					while n:
# 				# 						print(f'    >>>>--<<<<')
# 				# 						if n not in ply1_rounds and n not in ply2_rounds:
# 				# 							print(f'    >>>>GOOD<<<<')
# 				# 							game.round = n
# 				# 							game.save()
# 				# 							print(f'   <-->round {game.round}')
# 				# 							break
# 				# 						n -= 1
# 				# 				# ply2_rounds.clear()
# 				# 			ply1_rounds.clear()
# 				# 		i += 1
					

# 	def round_robin(self):
# 		try:
# 			players = TournamentPlayer.objects.filter(tournament=self).annotate(random_order=Random()).order_by('random_order')
# 		except Exception as e:
# 			return JsonResponse({'success': False, 'message': 'TournamentPlayer: ' + str(e)}, status=500)
# 		n = len(players)
# 		for i in range(n):
# 			for j in range(i + 1, n):
# 				player_one = players[i].player
# 				player_two = players[j].player
# 				try:
# 					if not GameSchedule.objects.filter(
# 							tournament=self,
# 							player_one=player_one,
# 							player_two=player_two).exists() and \
# 					not GameSchedule.objects.filter(
# 							tournament=self,
# 							player_one=player_two,
# 							player_two=player_one).exists():
# 						GameSchedule.objects.create(
# 							game_id=self.game_id,
# 							game_mode='tournament',
# 							tournament=self,
# 							player_one=player_one,
# 							player_two=player_two
# 							# round=round_number
# 						)
# 				except Exception as e:
# 					return JsonResponse({'success': False, 'message': 'GameScheduleError'}, status=500)
	

# 	def single_elimination(self, players):
# 		if len(players) % 2 == 1:
# 			t_players = TournamentPlayer.objects.filter(tournament=self, round=self.rounds - 1)
# 			bye_player = t_players.order_by('-xp').first()
# 			bye_player.round += 1
# 			bye_player.save()
# 			players = TournamentPlayer.objects.filter(tournament=self, round=self.rounds)
# 		num_players = len(players)
# 		if num_players > 1:
# 			for i in range(num_players // 2):
# 				try:
# 					schedule = GameSchedule.objects.create(
# 						game_id=self.game_id,
# 						game_mode='tournament',
# 						tournament=self,
# 						round=self.rounds,
# 						player_one=players[i].player,
# 						player_two=players[num_players - i - 1].player
# 					)
# 				except Exception as e:
# 					return JsonResponse({'success': False, 'message': 'GameScheduleError'}, status=500)


# 	def group_and_knockout(self, players):
# 		if self.rounds == 1:
# 			pass
# 		else:
# 			pass



# class TournamentPlayer(models.Model):
# 	tournament = models.ForeignKey(Tournament, related_name='tournament_players', on_delete=models.CASCADE)
# 	player = models.ForeignKey(Player, related_name='player_tournaments', on_delete=models.CASCADE)
# 	xp = models.IntegerField(default=0)
# 	round = models.PositiveIntegerField(default=0)
# 	stage = models.CharField(max_length=20, null=True, blank=True)
# 	group = models.PositiveIntegerField(default=0)

# 	# def __str__(self):
# 	# 	return self.player.user



# class TournamentLobby(models.Model):
# 	tournament = models.ForeignKey(Tournament, related_name='tournament_tl', on_delete=models.CASCADE)
# 	winners = models.ManyToManyField(Player, related_name='winners')
# 	losers = models.ManyToManyField(Player, related_name='losers')


# class GameResults(models.Model):
# 	game_id = models.CharField(max_length=10, null=False)
# 	game_mode = models.CharField(max_length=20, null=False)
# 	tournament = models.ForeignKey(Tournament, related_name='tournament_name', on_delete=models.SET_NULL, null=True, blank=True)
# 	player_one = models.ForeignKey(UserAccount, related_name='player_one', on_delete=models.SET_NULL, null=True)
# 	player_two = models.ForeignKey(UserAccount, related_name='player_two', on_delete=models.SET_NULL, null=True)
# 	player_one_score = models.IntegerField()
# 	player_two_score = models.IntegerField()
# 	winner = models.ForeignKey(UserAccount, related_name='winner', on_delete=models.SET_NULL, null=True)
# 	loser = models.ForeignKey(UserAccount, related_name='loser', on_delete=models.SET_NULL, null=True)
# 	timestamp = models.DateTimeField(auto_now_add=True)

# 	def save(self, *args, **kwargs):
# 		if not self.winner or not self.loser:
# 			if self.player_one_score > self.player_two_score:
# 				self.winner = self.player_one
# 				self.loser = self.player_two
# 			elif self.player_two_score > self.player_one_score:
# 				self.winner = self.player_two
# 				self.loser = self.player_one
# 		super().save(*args, **kwargs)


# class GameSchedule(models.Model):
# 	class GameID(models.IntegerChoices):
# 		Pong = 0, 'Pong'
# 		Other = 1, 'Other'
# 	game_id = models.IntegerField(choices=GameID.choices, null=True)
# 	game_mode = models.CharField(max_length=20, null=True)
# 	tournament = models.ForeignKey(Tournament, related_name='tournament_gs', on_delete=models.SET_NULL, null=True, blank=True)
# 	player_one = models.ForeignKey(Player, related_name='player_one', on_delete=models.CASCADE)
# 	player_two = models.ForeignKey(Player, related_name='player_two', on_delete=models.CASCADE)
# 	round = models.PositiveIntegerField(default=0)
# 	is_active = models.BooleanField(blank=True, null=False, default=True)
# 	scheduled = models.DateTimeField(blank=True, null=True)
# 	timestamp = models.DateTimeField(auto_now_add=True)


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
# 	timestamp = models.DateTimeField(auto_now_add=True)

# 	def accept(self):
# 		player_one = Player.objects.get(user=self.user)
# 		player_two = Player.objects.get(user=self.invitee)
# 		if self.game_mode == 'tournament' and self.tournament != None:
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

# 	def reject(self):
# 		self.is_active = False
# 		self.status = 'rejected'
# 		if self.game_mode == 'tournament' and self.tournament != None:
# 			user = UserAccount.objects.get(username=self.invitee)
# 			self.tournament.players.remove(Player.objects.get(user=user))
# 			if len(TournamentPlayer.objects.filter(tournament=self.tournament)) == len(self.tournament.players.all()):
# 				self.tournament.update(True, False)
# 		self.save()

# 	def cancel(self):
# 		self.is_active = False
# 		self.status = 'cancelled'
# 		if self.game_mode == 'tournament' and self.tournament != None:
# 			user = UserAccount.objects.get(username=self.invitee)
# 			self.tournament.players.remove(Player.objects.get(user=user))
# 			if len(TournamentPlayer.objects.filter(tournament=self.tournament)) == len(self.tournament.players.all()):
# 				self.tournament.update(True, False)
# 		self.save()


# # class Tournament(models.Model):
# # 	class GameID(models.IntegerChoices):
# # 		Pong = 0, 'Pong'
# # 		Other = 1, 'Other'
# # 	name = models.CharField(max_length=30, default='Tournament')
# # 	game_id = models.IntegerField(choices=GameID.choices, null=True)
# # 	mode = models.CharField(max_length=50, blank=False)
# # 	creator = models.ForeignKey(UserAccount, related_name='tournament_creator', on_delete=models.CASCADE)
# # 	players = models.ManyToManyField(Player, related_name='tournament_players')
# # 	nb_player = models.IntegerField(null=True, blank=True)
# # 	nb_rounds = models.IntegerField(null=True, blank=True)
# # 	status = models.CharField(max_length=20, default='waiting')
# # 	stage = models.CharField(max_length=20, null=True, blank=True)
# # 	started = models.DateTimeField(null=True, blank=True)
# # 	ended = models.DateTimeField(null=True, blank=True)
# # 	winner = models.ForeignKey(UserAccount, related_name='tournament_winner', on_delete=models.SET_NULL, null=True, blank=True)

# # 	def __str__(self):
# # 		return self.name
	
# # 	def update(self):
# # 		pass
	
# # 	def matchmaking(self):
# # 		tournament_players = TournamentPlayer.objects.filter(tournament=self)
# # 		max_round = tournament_players.aggregate(Max('num_round'))['num_round__max']
# # 		players = list(tournament_players.filter(num_round=max_round))
# # 		if self.status != 'finished':
# # 			mode = self.mode
# # 			if mode == 'round robin':
# # 				self.round_robin(players)
# # 			elif mode == 'single elimination':
# # 				self.single_elimination(players)
# # 			elif mode == 'double elimination':
# # 				self.double_elimination(players)
	
# # 	def round_robin(self, players):
# # 		pass

# # 	def single_elimination(self, players):
# # 		if len(players) > 1:
# # 			for i in range(0, len(players) // 2):
# # 				schedule = GameSchedule.objects.create(
# # 					game_id=self.game_id,
# # 					game_mode='tournament',
# # 					tournament=self,
# # 					player_one=players[i].player,
# # 					player_two=players[-(i + 1)].player
# # 				)

# # 	def double_elimination(self, players):
# # 		pass

# # class TournamentPlayer(models.Model):
# # 	tournament = models.ForeignKey(Tournament, related_name='tournament_players', on_delete=models.CASCADE)
# # 	player = models.ForeignKey(Player, related_name='player_tournaments', on_delete=models.CASCADE)
# # 	xp = models.IntegerField(default=0)
# # 	num_round = models.IntegerField(default=0)
# # 	round = models.CharField(max_length=30, default='First Round')

# # class TournamentLobby(models.Model):
# # 	tournament = models.ForeignKey(Tournament, related_name='tournament_tl', on_delete=models.CASCADE)
# # 	winners = models.ManyToManyField(Player, related_name='winners')
# # 	losers = models.ManyToManyField(Player, related_name='losers')

# # class GameResults(models.Model):
# # 	game_id = models.CharField(max_length=10, null=False)
# # 	game_mode = models.CharField(max_length=20, null=False)
# # 	tournament = models.ForeignKey(Tournament, related_name='tournament_name', on_delete=models.SET_NULL, null=True, blank=True)
# # 	player_one = models.ForeignKey(UserAccount, related_name='player_one', on_delete=models.SET_NULL, null=True)
# # 	player_two = models.ForeignKey(UserAccount, related_name='player_two', on_delete=models.SET_NULL, null=True)
# # 	player_one_score = models.IntegerField()
# # 	player_two_score = models.IntegerField()
# # 	winner = models.ForeignKey(UserAccount, related_name='winner', on_delete=models.SET_NULL, null=True)
# # 	loser = models.ForeignKey(UserAccount, related_name='loser', on_delete=models.SET_NULL, null=True)
# # 	timestamp = models.DateTimeField(auto_now_add=True)

# # 	def save(self, *args, **kwargs):
# # 		if not self.winner or not self.loser:
# # 			if self.player_one_score > self.player_two_score:
# # 				self.winner = self.player_one
# # 				self.loser = self.player_two
# # 			elif self.player_two_score > self.player_one_score:
# # 				self.winner = self.player_two
# # 				self.loser = self.player_one
# # 		super().save(*args, **kwargs)

# # class GameSchedule(models.Model):
# # 	class GameID(models.IntegerChoices):
# # 		Pong = 0, 'Pong'
# # 		Other = 1, 'Other'
# # 	game_id = models.IntegerField(choices=GameID.choices, null=True)
# # 	game_mode = models.CharField(max_length=20, null=True)
# # 	tournament = models.ForeignKey(Tournament, related_name='tournament_gs', on_delete=models.SET_NULL, null=True, blank=True)
# # 	player_one = models.ForeignKey(Player, related_name='player_one', on_delete=models.CASCADE)
# # 	player_two = models.ForeignKey(Player, related_name='player_two', on_delete=models.CASCADE)
# # 	is_active = models.BooleanField(blank=True, null=False, default=True)
# # 	scheduled = models.DateTimeField(blank=True, null=True)
# # 	timestamp = models.DateTimeField(auto_now_add=True)

# # class GameRequest(models.Model):

# # 	class GameID(models.IntegerChoices):
# # 		Pong = 0, 'Pong'
# # 		Other = 1, 'Other'
# # 	game_id = models.IntegerField(choices=GameID.choices, null=True)
# # 	game_mode = models.CharField(max_length=20, null=True)
# # 	tournament = models.ForeignKey(Tournament, related_name='tournament_gr', on_delete=models.SET_NULL, null=True, blank=True)
# # 	user = models.ForeignKey(UserAccount, related_name='inviter', on_delete=models.CASCADE)
# # 	invitee = models.ForeignKey(UserAccount, related_name='invitee', on_delete=models.CASCADE)
# # 	is_active = models.BooleanField(blank=True, null=False, default=True)
# # 	status = models.CharField(max_length=20, default='pending')
# # 	timestamp = models.DateTimeField(auto_now_add=True)

# # 	def accept(self):
# # 		player_one = Player.objects.get(user=self.user)
# # 		player_two = Player.objects.get(user=self.invitee)
# # 		if self.game_mode == 'tournament' and self.tournament != None:
# # 			TournamentPlayer.objects.create(tournament=self.tournament, player=Player.objects.get(user=self.invitee) )
# # 			if len(TournamentPlayer.objects.filter(tournament=self.tournament)) == len(self.tournament.players.all()):
# # 				self.tournament.matchmaking()
# # 		else:
# # 			game = GameSchedule.objects.create(
# # 				player_one=player_one,
# # 				player_two=player_two,
# # 				game_id=self.game_id,
# # 				game_mode=self.game_mode,
# # 				tournament=self.tournament
# # 			)
# # 			game.save()
# # 		self.is_active = False
# # 		self.status = 'accepted'
# # 		self.save()

# # 	def reject(self):
# # 		self.is_active = False
# # 		self.status = 'rejected'
# # 		if self.game_mode == 'tournament' and self.tournament != None:
# # 			user = UserAccount.objects.get(username=self.invitee)
# # 			self.tournament.players.remove(Player.objects.get(user=user))
# # 			if len(TournamentPlayer.objects.filter(tournament=self.tournament)) == len(self.tournament.players.all()):
# # 				self.tournament.matchmaking()
# # 		self.save()

# # 	def cancel(self):
# # 		self.is_active = False
# # 		self.status = 'cancelled'
# # 		if self.game_mode == 'tournament' and self.tournament != None:
# # 			user = UserAccount.objects.get(username=self.invitee)
# # 			self.tournament.players.remove(Player.objects.get(user=user))
# # 			if len(TournamentPlayer.objects.filter(tournament=self.tournament)) == len(self.tournament.players.all()):
# # 				self.tournament.matchmaking()
# # 		self.save()




