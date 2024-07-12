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
from .newnewmodels import *
from .utils import send_invite, parse_results, update_tournament, tournament_details, tournament_player_creator
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404
from datetime import datetime, timedelta
from django.http import HttpResponse, JsonResponse, HttpResponseNotAllowed
from django.core.serializers.json import DjangoJSONEncoder
from django.views.decorators.csrf import csrf_exempt
import middleware as md
from typing import Literal
from django.views import View


class TournamentView(View):
	def get(self, request):
		pass

	def post(self, request):
		pass


class InvitationListView(View):
	def get(self, request):
		pass

	def post(self, request):
		pass


class InvitationView(View):
	def get(self, request):
		pass

	def patch(self, request):
		pass

	def delete(self, request):
		pass

# def get_invite_item(invite: MatchInvitation | TournamentInvitation, type: Literal["received", "sent"]):
# 	user: UserAccount = invite.invitation.sender if type == "inviter" else invite.invitation.receiver
# 	player = Player.objects.get(user=user)
# 	return {
# 		'invite_id': invite.invitation.pk,
# 		'game_id': invite.invitation.game,
# 		'game_mode': "1vs1" if isinstance(invite, MatchInvitation) else "tournament",
# 		'id': user.pk,
# 		'username': user.username,
# 		'alias': player.alias,
# 		'avatar': user.avatar.url,
# 	}

# def get_schedule_item(game: GameSchedule):
# 	return {
# 		'match_id': game.pk,
# 		'game_id': game.game_id,
# 		'game_mode': game.game_mode,
# 		'tournament': game.tournament,
# 		'player_one': {
# 			'id': game.player_one.user.pk,
# 			'username': game.player_one.user.username,
# 			'avatar': game.player_one.user.avatar.url,
# 			'alias': game.player_one.alias,
# 		},
# 		'player_two': {
# 			'id': game.player_two.user.pk,
# 			'username': game.player_two.user.username,
# 			'avatar': game.player_two.user.avatar.url,
# 			'alias': game.player_two.alias,
# 		},
# 		'player_one_score': game.player_one_score,
# 		'player_two_score': game.player_two_score,
# 		'date': game.timestamp,
# 		'winner': Player.objects.get(user=game.winner).alias
# 	}

# @csrf_exempt
# @login_required
# def get_received_invites(request, *args, **kwargs):
# 	if request.method != "GET":
# 		return HttpResponseNotAllowed(["GET"])
# 	try:
# 		invites = GameRequest.objects.filter(invitee=request.user, is_active=True)
# 		data = [get_invite_item(invite, "received") for invite in invites]
# 		return md.Success200("received game invites", data)
# 	except Exception as e:
# 		return md.BadRequest400(str(e))

# @csrf_exempt
# @login_required
# def get_sent_invites(request, *args, **kwargs):
# 	if request.method != "GET":
# 		return HttpResponseNotAllowed(["GET"])
# 	try:
# 		invites = GameRequest.objects.filter(user=request.user, is_active=True)
# 		data = [get_invite_item(invite, "sent") for invite in invites]
# 		return md.Success200("received game invites", data)
# 	except Exception as e:
# 		return md.BadRequest400(str(e))

# @csrf_exempt
# @login_required
# def game_send_invite(request, *args, **kwargs):
# 	if request.method != 'POST':
# 		return HttpResponseNotAllowed(["POST"])
# 	try:
# 		data = json.loads(request.body)
# 		invitee = UserAccount.objects.get(pk=kwargs.get('user_id'))
# 		if GameRequest.objects.filter(user=request.user, invitee=invitee, is_active=True).exists():
# 			return md.BadRequest400("Duplicate invite not permitted")
# 		if BlockList.is_either_blocked(request.user, invitee):
# 			return md.BadRequest400("Blocklist: cannot invite user")
# 		res = send_invite(request.user, invitee, data.get('game_id'), data.get('game_mode'), data.get('tournament'))
# 		return md.Success200(res)
# 	except Exception as e:
# 		return md.BadRequest400(str(e))


# @csrf_exempt
# @login_required
# def accept_invite(request, *args, **kwargs):
# 	user = request.user
# 	if request.method != 'POST':
# 		return HttpResponseNotAllowed(["POST"])
# 	try:
# 		game_invite = GameRequest.objects.get(pk=kwargs.get('invite_id'))
# 		if not game_invite.is_active:
# 			return md.NotFound404("game invitation not found")
# 		if game_invite.invitee != user:
# 			return md.Forbidden403("no permission to accept the game invitation")
# 		game_invite.accept()
# 		return md.Success200("Invite accepted")
# 	except Exception as e:
# 		return md.BadRequest400(str(e))

# @csrf_exempt
# @login_required
# def reject_invite(request, *args, **kwargs):
# 	user = request.user
# 	if request.method != 'POST':
# 		return HttpResponseNotAllowed(["POST"])
# 	try:
# 		game_invite = GameRequest.objects.get(pk=kwargs.get('invite_id'))
# 		if not game_invite.is_active:
# 			return md.NotFound404("game invitation not found")
# 		if game_invite.invitee != user:
# 			return md.Forbidden403("no permission to reject the game invitation")
# 		game_invite.reject()
# 		return md.Success200("Invite rejected")
# 	except Exception as e:
# 		return md.BadRequest400(str(e))

# @csrf_exempt
# @login_required
# def cancel_invite(request, *args, **kwargs):
# 	user = request.user
# 	if request.method != 'POST':
# 		return HttpResponseNotAllowed(["POST"])
# 	try:
# 		game_invite = GameRequest.objects.get(pk=kwargs.get('invite_id'))
# 		if not game_invite.is_active:
# 			return md.NotFound404("game invitation not found")
# 		if game_invite.user != user:
# 			return md.Forbidden403("no permission to cancel the game invitation")
# 		game_invite.cancel()
# 		return md.Success200("Invite canceled")
# 	except Exception as e:
# 		return md.BadRequest400(str(e))



# @csrf_exempt
# @login_required
# def create_tournament(request, *args, **kwargs):
# 	user = request.user
# 	if request.method != "POST":
# 		return HttpResponseNotAllowed(["POST"])
# 	data = json.loads(request.body)
# 	name = data.get('name')
# 	mode = data.get('mode')
# 	game_id = data.get('game_id')
# 	player_ids = data.get('players')
# 	if Tournament.objects.filter(name=name).exists():
# 		return md.BadRequest400("Tournament with duplicate name not allowed")
# 	tournament = Tournament.objects.create(
# 					name=name,
# 					mode=mode,
# 					creator=user,
# 					game_id=game_id,
# 					nb_player=nb_player,
# 					nb_rounds=nb_rounds
# 				)
# 	tournament.players.add(Player.objects.get(user=user))
# 	for id in player_ids:
# 		invitee = UserAccount.objects.get(pk=id)
# 		tournament.players.add(Player.objects.get(user=invitee))
# 		try:
# 			GameRequest.objects.get(
# 			user=user,
# 			invitee=invitee,
# 			game_mode='tournament',
# 			tournament=tournament,
# 			is_active=True
# 			)
# 		except GameRequest.DoesNotExist:
# 			if BlockList.is_either_blocked(user, invitee) == False:
# 				response = send_invite(user, invitee, game_id, 'tournament', tournament)
# 				if response != 'invitation was sent':
# 					tournament.delete()
# 					return JsonResponse({'success': False, 'message': response}, status=400)
# 			else:
# 				tournament.delete()
# 				return JsonResponse({'success': False, 'message': 'Blocklist: cannot invite user'}, status=400)
# 	tournament_player_creator(user, tournament)
