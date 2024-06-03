import io
import json
import base64
import numpy as np
import pandas as pd
from matplotlib import pyplot as plt

from django.db.models import Q
from django.conf import settings
from django.shortcuts import render, redirect
from user.models import *
from friends.models import *
from .models import *
from .utils import *
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404
from datetime import datetime, timedelta
from django.http import HttpResponse, JsonResponse
from django.core.serializers.json import DjangoJSONEncoder
from django.views.decorators.csrf import csrf_exempt


# Create your views here.

@csrf_exempt
@login_required
def game_results(request, *args, **kwargs):
	user = request.user
	if request.method == 'POST':
		data = json.loads(request.body)
		schedule_id = data.get('schedule_id')
		game_id = data.get('game_id')
		game_mode = data.get('game_mode')
		tournament = data.get('tournament')
		duration = data.get('duration')
		player_one = data.get('player_one')
		player_two = data.get('player_two')
		score_one = player_one['score']
		score_two = player_two['score']

		if not player_one or not player_two:
			return JsonResponse({'success': False, 'message': 'Player field cannot be empty.'}, status=400)

		try:
			user_one = UserAccount.objects.get(username=Player.objects.get(alias=player_one['alias']))
			user_two = UserAccount.objects.get(username=Player.objects.get(alias=player_two['alias']))
		except Exception as e:
			return JsonResponse({'success': False, 'message': str(e)}, status=400)
		
		if user_one == user_two:
			return JsonResponse({'success': False, 'message': 'Player fields cannot be the same.'}, status=400)

		try:
			result = GameResults.objects.create(
				game_id=game_id,
				game_mode=game_mode,
				tournament=tournament,
				player_one=user_one,
				player_two=user_two,
				player_one_score=score_one,
				player_two_score=score_two
			)
			result.save()
		except Exception as e:
			return JsonResponse({'success': False, 'message': str(e)}, status=400)

		if result.winner and result.loser:
			try:
				winner_player = Player.objects.get(user=result.winner)
				winner_player.games_played = winner_player.games_played + 1
				winner_player.wins = winner_player.wins + 1
				winner_player.win_loss_margin.append(max(score_one, score_two) - min(score_one, score_two))
				winner_xp = calculate_user_xp(max(score_one, score_two) - min(score_one, score_two), True)
				winner_player.xp += winner_xp
				winner_player.save()
			except Exception as e:
				return JsonResponse({'success': False, 'message': str(e)}, status=400)

			try:
				loser_player = Player.objects.get(user=result.loser)
				loser_player.games_played = loser_player.games_played + 1
				loser_player.losses = loser_player.losses + 1
				loser_player.win_loss_margin.append(min(score_one, score_two) - max(score_one, score_two))
				loser_xp = calculate_user_xp(max(score_one, score_two) - min(score_one, score_two), False)
				loser_player.xp += loser_xp
				loser_player.save()
			except Exception as e:
				return JsonResponse({'success': False, 'message': str(e)}, status=400)
		else:
			return JsonResponse({'success': False, 'message': 'Internal server error'}, status=500)

		try:
			player = Player.objects.get(user=user)
			data = model_object_serializer(player)
		except Exception as e:
			return JsonResponse({'success': False, 'message': str(e)}, status=400)
		
		return JsonResponse({'success': True, 'message': 'record created', 'data': data}, status=200)
	else:
		return JsonResponse({'success': False}, status=403)



@csrf_exempt
@login_required
def send_game_invite(request, *args, **kwargs):
	user = request.user
	user_id = kwargs.get('user_id')
	data = json.loads(request.body)	
	if request.method == 'POST':
		game_id = data.get('game_id')
		game_mode = data.get('game_mode')
		tournament = data.get('tournament')
		try:
			invitee = UserAccount.objects.get(pk=user_id)
		except Exception as e:
			return JsonResponse({'success': False, 'message': str(e)}, status=400)

		check_request = GameRequest.objects.filter(user=user, invitee=invitee, is_active=True)
		if check_request:
			return JsonResponse({'success': False, 'message': 'Duplicate invite not permitted'}, status=400)

		if BlockList.is_either_blocked(user, invitee) == False:
			response = send_invite(user, invitee, game_id, game_mode, tournament)
			return JsonResponse({'success': True, 'message': response}, status=200)
			# try:
			# 	request = GameRequest.objects.create(
			# 		user=user, 
			# 		invitee=invitee, 
			# 		game_id=game_id, 
			# 		game_mode=game_mode,
			# 		tournament=tournament
			# 	)
			# 	request.save()
			# 	return JsonResponse({'success': True, 'message': 'invitation was sent'}, status=200)
			# except Exception as e:
			# 	return JsonResponse({'success': False, 'message': str(e)}, status=400)
		else:
			return JsonResponse({'success': False, 'message': 'Blocklist: cannot invite user'}, status=400)
	else:
		return JsonResponse({'success': False}, status=403)


@csrf_exempt
@login_required
def received_invites(request, *args, **kwargs):
	user = request.user
	invites_recieved = []
	if request.method == 'GET':
		try:
			invites = GameRequest.objects.filter(invitee=user, is_active=True)
		except Exception as e:
			return JsonResponse({'success': False, 'message': str(e)}, status=400)
		
		for invite in invites:
			inviter = UserAccount.objects.get(username=invite.user)
			player = Player.objects.get(user=inviter)
			item = {
				'invite_id': invite.pk,
				'game_id': invite.game_id,
				'game_mode': invite.game_mode,
				'tournament': invite.tournament,
				'id': inviter.pk,
				'inviter': inviter.username,
				'alias': player.alias,
				'avatar': inviter.avatar.url,
			}
			invites_recieved.append(item)
		return JsonResponse({'data': invites_recieved})
	else:
		return JsonResponse({'success': False}, status=403)
	

@csrf_exempt
@login_required
def sent_invites(request, *args, **kwargs):
	user = request.user
	invites_sent= []
	if request.method == 'GET':
		try:
			invites = GameRequest.objects.filter(user=user, is_active=True)
		except Exception as e:
			return JsonResponse({'success': False, 'message': str(e)}, status=400)
		
		for invite in invites:
			invitee = UserAccount.objects.get(username=invite.invitee)
			player = Player.objects.get(user=invitee)
			item = {
				'invite_id': invite.pk,
				'game_id': invite.game_id,
				'game_mode': invite.game_mode,
				'tournament': invite.tournament,
				'id': invitee.pk,
				'invitee': invitee.username,
				'alias': player.alias,
				'avatar': invitee.avatar.url,
			}
			invites_sent.append(item)
		return JsonResponse({'data': invites_sent})
	else:
		return JsonResponse({'success': False}, status=403)

@csrf_exempt
@login_required
def game_invite_accept(request, *args, **kwargs):
	user = request.user
	if request.method == 'POST':
		invite_id = kwargs.get('invite_id')
		# data = json.loads(request.body)
		# alias = data.get('display_name')
		if invite_id:
			game_invite = GameRequest.objects.get(pk=invite_id)
			if game_invite and game_invite.is_active==True:
				if game_invite.invitee == user:
					game_invite.accept()
					# try:
					# 	player = Player.objects.get(user=user)
					# 	player.alias = alias
					# 	player.save()
					# except Exception as e:
					# 	return JsonResponse({'success': False, 'message': str(e)}, status=400)
					return JsonResponse({'success': True, 'message': 'Invite accepted.'}, status=200)
				else:
					return JsonResponse({'success': False, 'message': 'You cannot access this feature'}, status=400)
			else:
				return JsonResponse({'success': False, 'message': 'This invite does not exist'}, status=400)
		else:
			return JsonResponse({'success': False, 'message': 'Invite is invalid.'}, status=400)
	else:
		return JsonResponse({'success': False}, status=403)



@csrf_exempt
@login_required
def game_invite_reject(request, *args, **kwargs):
	user = request.user
	if request.method == 'POST':
		invite_id = kwargs.get('invite_id')
		if invite_id:
			game_invite = GameRequest.objects.get(pk=invite_id)
			if game_invite and game_invite.is_active==True:
				if game_invite.user == user:
					game_invite.reject()
					return JsonResponse({'success': True, 'message': 'Invite rejected.'}, status=200)
				else:
					return JsonResponse({'success': False, 'message': 'You cannot access this feature'}, status=400)
			else:
				return JsonResponse({'success': False, 'message': 'This invite does not exist'}, status=400)
		else:
			return JsonResponse({'success': False, 'message': 'Invite is invalid.'}, status=400)
	else:
		return JsonResponse({'success': False}, status=403)


@csrf_exempt
@login_required
def game_invite_cancel(request, *args, **kwargs):
	user = request.user
	if request.method == 'POST':
		invite_id = kwargs.get('invite_id')
		if invite_id:
			game_invite = GameRequest.objects.get(pk=invite_id)
			if game_invite and game_invite.is_active==True:
				if game_invite.user == user:
					game_invite.cancel()
					return JsonResponse({'success': True, 'message': 'Invite cancelled.'}, status=200)
				else:
					return JsonResponse({'success': False, 'message': 'You cannot access this feature'}, status=400)
			else:
				return JsonResponse({'success': False, 'message': 'This invite does not exist'}, status=400)
		else:
			return JsonResponse({'success': False, 'message': 'Invite is invalid.'}, status=400)
	else:
		return JsonResponse({'success': False}, status=403)


@csrf_exempt
@login_required
def game_schedule(request, *args, **kwargs):
	user = request.user
	schedules = []
	if request.method == 'POST':
		player = Player.objects.get(user=user)
		if player:
			try:
				game_list = GameSchedule.objects.filter(Q(player_one=player) | Q(player_two=player), is_active=True)
			except Exception as e:
				return JsonResponse({'success': False, 'message': str(e)}, status=400)
		else:
			return JsonResponse({'success': False, 'message': 'Player does not exist'}, status=400)

		for game in game_list:
			ply_one_user_acc = UserAccount.objects.get(username=game.player_one)
			ply_two_user_acc = UserAccount.objects.get(username=game.player_two)
			item = {
				'schedule_id': game.pk,
				'game_id': game.game_id,
				'game_mode': game.game_mode,
				'tournament': game.tournament,
				'player_one': {
					'id': ply_one_user_acc.pk,
					'username': ply_one_user_acc.username,
					'avatar': ply_one_user_acc.avatar.url,
					'alias': Player.objects.get(user=ply_one_user_acc).alias,
				},
				'player_two': {
					'id': ply_two_user_acc.pk,
					'username': ply_two_user_acc.username,
					'avatar': ply_two_user_acc.avatar.url,
					'alias': Player.objects.get(user=ply_two_user_acc).alias,
				}
			}
			schedules.append(item)
		return JsonResponse({'data': schedules}, status=200)
	else:
		return JsonResponse({'success': False}, status=403)


@csrf_exempt
@login_required
def match_history(request, *args, **kwargs):
	user = request.user
	history = []
	if request.method == 'GET':
		player = UserAccount.objects.get(username=user)
		if player:
			try:
				games_played = GameResults.objects.filter(Q(player_one=player) | Q(player_two=player))
			except Exception as e:
				return JsonResponse({'success': False, 'message': str(e)}, status=400)
		else:
			return JsonResponse({'success': False, 'message': 'Player does not exist'}, status=400)

		for game in games_played:
			ply_one_user_acc = UserAccount.objects.get(username=game.player_one)
			ply_two_user_acc = UserAccount.objects.get(username=game.player_two)
			item = {
				'match_id': game.pk,
				'game_id': game.game_id,
				'game_mode': game.game_mode,
				'tournament': game.tournament,
				'player_one': {
					'id': ply_one_user_acc.pk,
					'username': ply_one_user_acc.username,
					'avatar': ply_one_user_acc.avatar.url,
					'alias': Player.objects.get(user=ply_one_user_acc).alias,
				},
				'player_two': {
					'id': ply_two_user_acc.pk,
					'username': ply_two_user_acc.username,
					'avatar': ply_two_user_acc.avatar.url,
					'alias': Player.objects.get(user=ply_two_user_acc).alias
				},
				'player_one_score': game.player_one_score,
				'player_two_score': game.player_two_score,
				'date': game.timestamp,
				'winner': Player.objects.get(user=game.winner).alias
				# 'winner': game.winner.username
			}
			history.append(item)
		return JsonResponse({'data': history}, status=200)
	else:
		return JsonResponse({'success': False}, status=403)


@csrf_exempt
@login_required
def game_play(request, *args, **kwargs):
	user = request.user
	if request.method == 'POST':
		schedule_id = kwargs.get('schedule_id')
		if schedule_id:
			try:
				schedule = GameSchedule.objects.get(pk=schedule_id)
				schedule.is_active = False
				schedule.save()
				return JsonResponse({'success': True, 'message': 'OK'}, status=200)
			except Exception as e:
				return JsonResponse({'success': False, 'message': str(e)}, status=400)
			
		else:
			return JsonResponse({'success': False, 'message': 'Schedule not found'}, status=400)
	else:
		return JsonResponse({'success': False}, status=403)

	

@csrf_exempt
@login_required
def create_tournament(request, *args, **kwargs):
	user = request.user
	if request.method == 'POST':
		data = json.loads(request.body)
		name = data.get('name')
		mode = data.get('mode')
		game_id = data.get('game_id')
		player_ids = data.get('players')
		nb_player = data.get('nb_players')
		nb_rounds = data.get('nb_rounds')

		check_tournament = Tournament.objects.get(name=name)
		if check_tournament:
			return JsonResponse({'success': False, 'message': 'Tournament with duplicate name not allowed'}, status=400)

		try:
			tournament = Tournament.objects.create(
				name=name,
				mode=mode,
				creator=user,
				game_id=game_id,
				nb_player=nb_player,
				nb_rounds=nb_rounds
			)
			tournament.players.add(Player.objects.get(user=user))
			for id in player_ids:
				invitee = UserAccount.objects.get(pk=id)
				tournament.players.add(Player.objects.get(user=invitee))
				if BlockList.is_either_blocked(user, invitee) == False:
					check_request = GameRequest.objects.filter(
					user=user,
					invitee=invitee,
					game_mode='tournament',
					tournament=tournament,
					is_active=True
					)
					if  check_request == None:
						response = send_invite(user, invitee, game_id, 'tournament', tournament)
						if response != 'invitation was sent':
							return JsonResponse({'success': False, 'message': response}, status=400)
				else:
					return JsonResponse({'success': False, 'message': 'Blocklist: cannot invite user'}, status=400)
			return JsonResponse({'success': True, 'message': 'Tournament created'}, status=200)
		except Exception as e:
			return JsonResponse({'success': False, 'message': str(e)}, status=400)
	return JsonResponse({'success': False}, status=403)



@csrf_exempt
@login_required
def player_stats(request, *args, **kwargs):
	user = request.user
	if request.method == 'GET':

		try:
			player = Player.objects.get(user=user)
		except Exception as e:
			return JsonResponse({'success': False, 'message': str(e)}, status=400)
		
		player_data = model_object_serializer(player)

		win_rate = round((player_data['wins'] / player_data['games_played']) * 100, 1)
		loss_rate = round((player_data['losses']/ player_data['games_played']) * 100, 1)

		win_loss_ratio = round((player_data['wins'] / player_data['losses']) * 100, 1)

		df = pd.DataFrame(player_data)
		margins = df[['win_loss_margin']]
		win_margin = []
		loss_margin = []
		for item in player_data['win_loss_margin']:
			if item > 0:
				win_margin.append(item)
			elif item < 0:
				loss_margin.append(item)

		if win_margin != 0 and len(win_margin) != 0:
			avg_win_margin = sum(win_margin) / len(win_margin)
		if loss_margin != 0 and len(loss_margin) != 0:
			avg_loss_margin = sum(loss_margin) / len(loss_margin)
		print(f"AVG_WINS: {avg_win_margin}, AVG_LOSS: {avg_loss_margin}")


		print(df)
		print(f'-----> {win_rate} <----- {loss_rate} <<--->> {win_loss_ratio}')

		plt.plot(margins)
		plt.ylabel('Win/Loss Margin')
		plt.grid(False)

		# Convert plot to bytes
		buffer = io.BytesIO()
		plt.savefig(buffer, format='png')
		buffer.seek(0)
		image_bytes = buffer.getvalue()
		buffer.close()

		image_b64 = base64.b64encode(image_bytes).decode('utf-8')
		plt.close()

		return JsonResponse({'success': True, 'data': image_b64}, status=200)

	else:
		return JsonResponse({'success': False}, status=403)