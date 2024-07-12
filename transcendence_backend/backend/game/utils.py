from .models import *
from django.contrib.auth import get_user_model
from django.http import JsonResponse

def send_invite(user, invitee, game_id, game_mode, tournament):
    if invitee != user:
        try:
            request = GameRequest.objects.create(
            user=user, 
            invitee=invitee, 
            game_id=game_id, 
            game_mode=game_mode,
            tournament=tournament
            )
            request.save()
            return 'invitation was sent'
        except Exception as e:
            return str(e)
    
def parse_results(schedule_id, score_one, score_two): #TODO send user xp gained ot lost + winner to consumer
    try:
        game = GameSchedule.objects.get(id=schedule_id, is_active=True)
    except Exception as e:
        return JsonResponse({'success': False, 'message': 'Game Schedule: '+str(e)}, status=400)
    if game.player_one.user == game.player_two.user:
        return JsonResponse({'success': False, 'message': 'Player fields cannot be the same.'}, status=400)
    
    try:
        result = GameResults.objects.create(
		game_id=game.game_id,
		game_mode=game.game_mode,
		tournament=game.tournament,
		player_one=game.player_one.user,
		player_two=game.player_two.user,
		player_one_score=score_one,
		player_two_score=score_two
		)
        result.save()
    except Exception as e:
        return {'success': False, 'message': 'Game Results: '+str(e)}, 400
    
    game.is_active = False
    game.save()
    if result.winner and result.loser:
        xp_calculation(result, score_one, score_two)
    else:
        return {'success': False, 'message': 'Internal server error'}, 500
    if game.game_mode == 'tournament':
        if check_final_game(result):
            set_winner(result)
            result.tournament.update(False, True)
        else:
            tournament_player_update(result)
            if tournament_round_finished(result.tournament):
                result.tournament.update(False, False)
    return {'success': True, 'message': 'record created'}, 200


def set_winner(result):
    if result.tournament.mode != 'round robin':
        result.tournament.winner = result.winner
    else:
        players = TournamentPlayer.objects.filter(tournament=result.tournament)
        winner = players.order_by('-xp').first()
        result.tournament.winner = winner.player.user

def check_final_game(result):
    if result.tournament.mode == 'round robin':
        try:
            schedules = GameSchedule.objects.filter(tournament=result.tournament, is_active=True)
        except GameSchedule.DoesNotExist:
            return True
        if len(schedules) == 0:
            return True
    else:
        if result.tournament.stage == 'final':
            return True


def tournament_round_finished(tournament):
    try:
        schedules = GameSchedule.objects.filter(tournament=tournament, is_active=True)
    except Exception as e:
        return JsonResponse({'success': False}, status=500)
    if len(schedules) == 0:
        return True
    return False



def tournament_player_update(result):
    winner_player = TournamentPlayer.objects.get(
        player=Player.objects.get(user=result.winner),
        tournament=result.tournament
        )
    if result.tournament.mode != 'group and knockout' and result.tournament.mode != 'round robin':
        winner_player.round += 1
        winner_player.save()
    # loser_player = TournamentPlayer.objects.get(
    #     player=Player.obeject.get(user=result.loser),
    #     tournament=result.tournament
    #     )


def tournament_details(tournament):
    players = []
    fixtures = []
    details = model_object_serializer(tournament)
    details['game_id'] = tournament.get_game_id_display()
    details['creator'] = Player.objects.get(user=tournament.creator).alias
    tournament_players = tournament.players.all()
    for player in tournament_players:
        player_details = UserAccount.objects.get(username=player)
        item = {
            'id': player_details.pk,
            'username': player_details.username,
            'avatar': player_details.avatar.url,
            'alias': player.alias
        }
        players.append(item)
    details['players'] = players
    schedules = GameSchedule.objects.filter(tournament=tournament, is_active=True)
    for schedule in schedules:
        ply_1 = UserAccount.objects.get(username=schedule.player_one)
        ply_2 = UserAccount.objects.get(username=schedule.player_two)
        item = {
            'id': schedule.id,
            'game_id': schedule.get_game_id_display(),
            'tournament': schedule.tournament.name,
            'player_one': {
                'id': ply_1.pk,
                'username': ply_1.username,
                'avatar': ply_1.avatar.url,
                'alias': schedule.player_one.alias
            },
            'player_two': {
                'id': ply_2.pk,
                'username': ply_2.username,
                'avatar': ply_2.avatar.url,
                'alias': schedule.player_two.alias
            }
        }
        fixtures.append(item)
    details['schedules'] = fixtures
    results = []
    games_played = GameResults.objects.filter(tournament=tournament)
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
        }
        results.append(item)
    details['results'] = results
    leaderboard = tournament_leaderboard(tournament)
    details['leaderboard'] = leaderboard
    return details


def tournament_player_creator(user, tournament):
    try:
        tournament_player = TournamentPlayer.objects.create(
            player=Player.objects.get(user=user),
            tournament=tournament,
            round=1
            )
    except Exception as e:
        tournament.delete()
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


def xp_calculation(result, score_one, score_two):
    try:
        winner_player = Player.objects.get(user=result.winner)
        winner_player.games_played = winner_player.games_played + 1
        winner_player.wins = winner_player.wins + 1
        winner_player.win_loss_margin.append(max(score_one, score_two) - min(score_one, score_two))
        winner_xp = calculate_user_xp(max(score_one, score_two) - min(score_one, score_two), True)
        if result.tournament != None and result.game_mode == 'tournament':
            t_player = TournamentPlayer.objects.get(player=winner_player, tournament=result.tournament)
            t_player.xp += winner_xp
            t_player.save()
        else:
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
        if result.tournament != None and result.game_mode == 'tournament':
            t_player = TournamentPlayer.objects.get(player=loser_player, tournament=result.tournament)
            t_player.xp += loser_xp
            t_player.save()
        else:
            loser_player.xp += loser_xp
        loser_player.save()
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)
    
def update_tournament(tournament):
    try:
        schedules = GameSchedule.objects.filter(tournament=tournament, is_active=True)
    except Exception as e:
        return JsonResponse({'success': False, 'message': 'Game Schedule: '+str(e)}, status=400)
    if len(schedules) == 0:
        tournament.matchmaking()
        tournament.update()

def tournament_leaderboard(tournament):
    leaderboard = []
    ordered_player = (TournamentPlayer.objects.filter(tournament=tournament)
                   .select_related('player')
                   .order_by('-xp')
                   )
    if ordered_player:
        for player in ordered_player:
            print(f'--> {player}')
    else:
        print(f'Value: error')    
    return leaderboard

# from .models import *
# from django.contrib.auth import get_user_model
# from django.http import JsonResponse

# def send_invite(user: UserAccount, invitee: UserAccount, game_id: int, game_mode: str, tournament) -> str:
#     if invitee == user:
#         raise RuntimeError("inviter and invitee are the same")
#     try:
#         request = GameRequest.objects.create(
#         user=user, 
#         invitee=invitee, 
#         game_id=game_id, 
#         game_mode=game_mode,
#         tournament=tournament
#         )
#         request.save()
#         return 'invitation was sent'
#     except Exception as e:
#         return str(e)
    
# def parse_results(schedule_id, score_one, score_two): #TODO send user xp gained ot lost + winner to consumer
#     try:
#         game = GameSchedule.objects.get(id=schedule_id, is_active=True)
#     except Exception as e:
#         return {'success': False, 'message': 'Game Schedule: '+str(e)}, 400
#         # return JsonResponse({'success': False, 'message': 'Game Schedule: '+str(e)}, status=400)
#     if game.player_one.user == game.player_two.user:
#         return {'success': False, 'message': 'Player fields cannot be the same.'}, 400
#         # return JsonResponse({'success': False, 'message': 'Player fields cannot be the same.'}, status=400)
    
#     try:
#         result = GameResults.objects.create(
# 		game_id=game.game_id,
# 		game_mode=game.game_mode,
# 		tournament=game.tournament,
# 		player_one=game.player_one.user,
# 		player_two=game.player_two.user,
# 		player_one_score=score_one,
# 		player_two_score=score_two
# 		)
#         result.save()
#     except Exception as e:
#         return {'success': False, 'message': 'Game Results: '+str(e)}, 400
    
#     game.is_active = False
#     game.save()
#     if result.winner and result.loser:
#         xp_calculation(result, score_one, score_two)
#     else:
#         return {'success': False, 'message': 'Internal server error'}, 500
#     if game.game_mode == 'tournament':
#         update_tournament(result.tournament)
    
#     # try:
#     #     player = Player.objects.get(user=user)
#     #     data = model_object_serializer(player)
#     # except Exception as e:
#     #     return {'success': False, 'message': str(e)}, 400
#     return {'success': True, 'message': 'record created'}, 200


# def tournament_details(tournament):
#     players = []
#     fixtures = []
#     details = model_object_serializer(tournament)
#     details['game_id'] = tournament.get_game_id_display()
#     details['creator'] = Player.objects.get(user=tournament.creator).alias
#     tournament_players = tournament.players.all()
#     for player in tournament_players:
#         player_details = UserAccount.objects.get(username=player)
#         item = {
#             'id': player_details.pk,
#             'username': player_details.username,
#             'avatar': player_details.avatar.url,
#             'alias': player.alias
#         }
#         players.append(item)
#     details['players'] = players
#     schedules = GameSchedule.objects.filter(tournament=tournament, is_active=True)
#     for schedule in schedules:
#         ply_1 = UserAccount.objects.get(username=schedule.player_one)
#         ply_2 = UserAccount.objects.get(username=schedule.player_two)
#         item = {
#             'id': schedule.pk,
#             # 'game_id': schedule.get_game_id_display(),
#             'game_id': 0,
#             'tournament': schedule.tournament.name if schedule.tournament else None,
#             'player_one': {
#                 'id': ply_1.pk,
#                 'username': ply_1.username,
#                 'avatar': ply_1.avatar.url,
#                 'alias': schedule.player_one.alias
#             },
#             'player_two': {
#                 'id': ply_2.pk,
#                 'username': ply_2.username,
#                 'avatar': ply_2.avatar.url,
#                 'alias': schedule.player_two.alias
#             }
#         }
#         fixtures.append(item)
#     details['schedules'] = fixtures
#     results = []
#     games_played = GameResults.objects.filter(tournament=tournament)
#     for game in games_played:
#         ply_one_user_acc = UserAccount.objects.get(username=game.player_one)
#         ply_two_user_acc = UserAccount.objects.get(username=game.player_two)
#         item = {
# 			'match_id': game.pk,
# 			'game_id': game.game_id,
# 			'game_mode': game.game_mode,
# 			'tournament': game.tournament,
# 			'player_one': {
# 				'id': ply_one_user_acc.pk,
# 				'username': ply_one_user_acc.username,
# 				'avatar': ply_one_user_acc.avatar.url,
# 				'alias': Player.objects.get(user=ply_one_user_acc).alias,
# 			},
# 			'player_two': {
# 				'id': ply_two_user_acc.pk,
# 				'username': ply_two_user_acc.username,
# 				'avatar': ply_two_user_acc.avatar.url,
# 				'alias': Player.objects.get(user=ply_two_user_acc).alias
# 			},
# 			'player_one_score': game.player_one_score,
# 			'player_two_score': game.player_two_score,
# 			'date': game.timestamp,
# 			'winner': Player.objects.get(user=game.winner).alias
#         }
#         results.append(item)
#     details['results'] = results
#     #TODO: pass also the leaderboard
#     return details


# def tournament_player_creator(user, tournament):
#     try:
#         tournament_player = TournamentPlayer.objects.create(player=Player.objects.get(user=user), tournament=tournament)
#     except Exception as e:
#         tournament.delete()
#         return JsonResponse({'success': False, 'message': str(e)}, status=500)


# def xp_calculation(result, score_one, score_two):
#     try:
#         winner_player = Player.objects.get(user=result.winner)
#         winner_player.games_played = winner_player.games_played + 1
#         winner_player.wins = winner_player.wins + 1
#         winner_player.win_loss_margin.append(max(score_one, score_two) - min(score_one, score_two))
#         winner_xp = calculate_user_xp(max(score_one, score_two) - min(score_one, score_two), True)
#         if result.tournament != None and result.game_mode == 'tournament':
#             t_player = TournamentPlayer.objects.get(player=winner_player, tournament=result.tournament)
#             t_player.xp += winner_xp
#             t_player.num_round += 1
#             t_player.save()
#         else:
#             winner_player.xp += winner_xp
#         winner_player.save()
#     except Exception as e:
#         return JsonResponse({'success': False, 'message': str(e)}, status=400)
#     try:
#         loser_player = Player.objects.get(user=result.loser)
#         loser_player.games_played = loser_player.games_played + 1
#         loser_player.losses = loser_player.losses + 1
#         loser_player.win_loss_margin.append(min(score_one, score_two) - max(score_one, score_two))
#         loser_xp = calculate_user_xp(max(score_one, score_two) - min(score_one, score_two), False)
#         if result.tournament != None and result.game_mode == 'tournament':
#             t_player = TournamentPlayer.objects.get(player=loser_player, tournament=result.tournament)
#             t_player.xp += loser_xp
#             t_player.save()
#         else:
#             loser_player.xp += loser_xp
#         loser_player.save()
#     except Exception as e:
#         return JsonResponse({'success': False, 'message': str(e)}, status=400)
    
# def update_tournament(tournament):
#     try:
#         schedules = GameSchedule.objects.filter(tournament=tournament, is_active=True)
#     except Exception as e:
#         return JsonResponse({'success': False, 'message': 'Game Schedule: '+str(e)}, status=400)
#     if len(schedules) == 0:
#         tournament.matchmaking()
#         tournament.update()

# def tournament_leaderboard(tournament):
#     leaderboard = []
#     ordered_player = (TournamentPlayer.objects.filter(tournament=tournament)
#                    .select_related('player')
#                    .order_by('-xp')
#                    )
#     if ordered_player:
#         for player in ordered_player:
#             pass
    
#     return leaderboard

# # def send_invite(user: UserAccount, invitee: UserAccount, game_id: int, game_mode: str, tournament_id: int) -> str:
# #     if invitee == user:
# #         raise RuntimeError("inviter and invitee are the same")
# #     try:
# #         request = GameRequest.objects.create(
# #         user=user, 
# #         invitee=invitee, 
# #         game_id=game_id, 
# #         game_mode=game_mode,
# #         tournament=tournament_id
# #         )
# #         request.save()
# #         return 'invitation was sent'
# #     except Exception as e:
# #         return str(e)
    
# # def parse_results(schedule_id, score_one, score_two): #TODO send user xp gained ot lost + winner to consumer
# #     try:
# #         game = GameSchedule.objects.get(id=schedule_id, is_active=True)
# #     except Exception as e:
# #         return {'success': False, 'message': 'Game Schedule: '+str(e)}, 400
# #         # return JsonResponse({'success': False, 'message': 'Game Schedule: '+str(e)}, status=400)
# #     if game.player_one.user == game.player_two.user:
# #         return {'success': False, 'message': 'Player fields cannot be the same.'}, 400
# #         # return JsonResponse({'success': False, 'message': 'Player fields cannot be the same.'}, status=400)
    
# #     try:
# #         result = GameResults.objects.create(
# # 		game_id=game.game_id,
# # 		game_mode=game.game_mode,
# # 		tournament=game.tournament,
# # 		player_one=game.player_one.user,
# # 		player_two=game.player_two.user,
# # 		player_one_score=score_one,
# # 		player_two_score=score_two
# # 		)
# #         result.save()
# #     except Exception as e:
# #         return {'success': False, 'message': 'Game Results: '+str(e)}, 400
    
# #     game.is_active = False
# #     game.save()
# #     if result.winner and result.loser:
# #         xp_calculation(result, score_one, score_two)
# #     else:
# #         return {'success': False, 'message': 'Internal server error'}, 500
# #     if game.game_mode == 'tournament':
# #         update_tournament(result.tournament)
    
# #     # try:
# #     #     player = Player.objects.get(user=user)
# #     #     data = model_object_serializer(player)
# #     # except Exception as e:
# #     #     return {'success': False, 'message': str(e)}, 400
# #     return {'success': True, 'message': 'record created'}, 200


# # def tournament_details(tournament):
# #     players = []
# #     fixtures = []
# #     details = model_object_serializer(tournament)
# #     details['game_id'] = tournament.get_game_id_display()
# #     details['creator'] = Player.objects.get(user=tournament.creator).alias
# #     tournament_players = tournament.players.all()
# #     for player in tournament_players:
# #         player_details = UserAccount.objects.get(username=player)
# #         item = {
# #             'id': player_details.pk,
# #             'username': player_details.username,
# #             'avatar': player_details.avatar.url,
# #             'alias': player.alias
# #         }
# #         players.append(item)
# #     details['players'] = players
# #     schedules = GameSchedule.objects.filter(tournament=tournament, is_active=True)
# #     for schedule in schedules:
# #         ply_1 = UserAccount.objects.get(username=schedule.player_one)
# #         ply_2 = UserAccount.objects.get(username=schedule.player_two)
# #         item = {
# #             'id': schedule.pk,
# #             # 'game_id': schedule.get_game_id_display(),
# #             'game_id': 0,
# #             'tournament': schedule.tournament.name if schedule.tournament else None,
# #             'player_one': {
# #                 'id': ply_1.pk,
# #                 'username': ply_1.username,
# #                 'avatar': ply_1.avatar.url,
# #                 'alias': schedule.player_one.alias
# #             },
# #             'player_two': {
# #                 'id': ply_2.pk,
# #                 'username': ply_2.username,
# #                 'avatar': ply_2.avatar.url,
# #                 'alias': schedule.player_two.alias
# #             }
# #         }
# #         fixtures.append(item)
# #     details['schedules'] = fixtures
# #     results = []
# #     games_played = GameResults.objects.filter(tournament=tournament)
# #     for game in games_played:
# #         ply_one_user_acc = UserAccount.objects.get(username=game.player_one)
# #         ply_two_user_acc = UserAccount.objects.get(username=game.player_two)
# #         item = {
# # 			'match_id': game.pk,
# # 			'game_id': game.game_id,
# # 			'game_mode': game.game_mode,
# # 			'tournament': game.tournament,
# # 			'player_one': {
# # 				'id': ply_one_user_acc.pk,
# # 				'username': ply_one_user_acc.username,
# # 				'avatar': ply_one_user_acc.avatar.url,
# # 				'alias': Player.objects.get(user=ply_one_user_acc).alias,
# # 			},
# # 			'player_two': {
# # 				'id': ply_two_user_acc.pk,
# # 				'username': ply_two_user_acc.username,
# # 				'avatar': ply_two_user_acc.avatar.url,
# # 				'alias': Player.objects.get(user=ply_two_user_acc).alias
# # 			},
# # 			'player_one_score': game.player_one_score,
# # 			'player_two_score': game.player_two_score,
# # 			'date': game.timestamp,
# # 			'winner': Player.objects.get(user=game.winner).alias
# #         }
# #         results.append(item)
# #     details['results'] = results
# #     #TODO: pass also the leaderboard
# #     return details


# # def tournament_player_creator(user, tournament):
# #     try:
# #         tournament_player = TournamentPlayer.objects.create(player=Player.objects.get(user=user), tournament=tournament)
# #     except Exception as e:
# #         tournament.delete()
# #         return JsonResponse({'success': False, 'message': str(e)}, status=500)


# # def xp_calculation(result, score_one, score_two):
# #     try:
# #         winner_player = Player.objects.get(user=result.winner)
# #         winner_player.games_played = winner_player.games_played + 1
# #         winner_player.wins = winner_player.wins + 1
# #         winner_player.win_loss_margin.append(max(score_one, score_two) - min(score_one, score_two))
# #         winner_xp = calculate_user_xp(max(score_one, score_two) - min(score_one, score_two), True)
# #         if result.tournament != None and result.game_mode == 'tournament':
# #             t_player = TournamentPlayer.objects.get(player=winner_player, tournament=result.tournament)
# #             t_player.xp += winner_xp
# #             t_player.num_round += 1
# #             t_player.save()
# #         else:
# #             winner_player.xp += winner_xp
# #         winner_player.save()
# #     except Exception as e:
# #         return JsonResponse({'success': False, 'message': str(e)}, status=400)
# #     try:
# #         loser_player = Player.objects.get(user=result.loser)
# #         loser_player.games_played = loser_player.games_played + 1
# #         loser_player.losses = loser_player.losses + 1
# #         loser_player.win_loss_margin.append(min(score_one, score_two) - max(score_one, score_two))
# #         loser_xp = calculate_user_xp(max(score_one, score_two) - min(score_one, score_two), False)
# #         if result.tournament != None and result.game_mode == 'tournament':
# #             t_player = TournamentPlayer.objects.get(player=loser_player, tournament=result.tournament)
# #             t_player.xp += loser_xp
# #             t_player.save()
# #         else:
# #             loser_player.xp += loser_xp
# #         loser_player.save()
# #     except Exception as e:
# #         return JsonResponse({'success': False, 'message': str(e)}, status=400)
    
# # def update_tournament(tournament):
# #     try:
# #         schedules = GameSchedule.objects.filter(tournament=tournament, is_active=True)
# #     except Exception as e:
# #         return JsonResponse({'success': False, 'message': 'Game Schedule: '+str(e)}, status=400)
# #     if len(schedules) == 0:
# #         tournament.matchmaking()
# #         tournament.update()

# # def tournament_leaderboard(tournament):
# #     leaderboard = []
# #     ordered_player = (TournamentPlayer.objects.filter(tournament=tournament)
# #                    .select_related('player')
# #                    .order_by('-xp')
# #                    )
# #     if ordered_player:
# #         for player in ordered_player:
# #             pass
    
# #     return leaderboard
