from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from typing import Literal

from user.models import UserAccount

class GameChoices(models.IntegerChoices):
    PONG = 1, 'Pong'
    OTHER = 2, 'Other'

class Player(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    rank = models.IntegerField(default=0)
    wins = models.IntegerField(default=0)
    losses = models.IntegerField(default=0)
    alias = models.CharField(max_length=50)

class TournamentManager(models.Manager):
    def create_invitation(self):
        pass

    def create_match(self, name: str, created_by: UserAccount, game: GameChoices):
        pass

    def create_tournament(self, name: str, created_by: UserAccount, game: GameChoices) -> 'Tournament':
        if game not in [choice.value for choice in GameChoices]:
            raise ValueError('Invalid game choice')

        tournament = self.create(
            name=name,
            created_by=created_by,
            game=game,
            status=Tournament.TournamentStatus.PLANNED,
            current_round=1
        )
        return tournament

   

class Tournament(models.Model):
    class TournamentStatus(models.TextChoices):
        PLANNED = 'planned', 'Geplant'
        ONGOING = 'ongoing', 'Laufend'
        COMPLETED = 'completed', 'Abgeschlossen'
    name = models.CharField(max_length=255)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    game = models.IntegerField(choices=GameChoices.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=50, choices=TournamentStatus.choices)
    current_round = models.IntegerField(default=1)
    tournaments = TournamentManager()

    def create_first_round_matches(self):
        players = TournamentPlayer.objects.filter(tournament=self).order_by('seed')
        for i in range(0, len(players), 2):
            if i+1 < len(players):
                TournamentMatch.matches.create_match(GameChoices(self.game), players[i].player, players[i+1].player, self, self.current_round)

    def all_matches_completed(self, round_number):
        return not TournamentMatch.objects.filter(tournament=self, round=round_number, match__winner__isnull=True).exists()

    def advance_tournament_round(self):
        self.current_round += 1
        self.save()
        current_round = self.current_round
        winners = [tm.match.winner for tm in TournamentMatch.objects.filter(tournament=self, round=current_round-1)]
        for i in range(0, len(winners), 2):
            p1, p2 = winners[i], winners[i+1]
            if i+1 < len(winners) and p1 is not None and p2 is not None:
                TournamentMatch.matches.create_match(GameChoices(self.game), p1, p2, self, current_round)

    def complete_tournament(self):
        self.status = 'completed'
        self.save()


class MatchManager(models.Manager):
    def create_match(self, game: int, player1: Player, player2: Player):
        return self.create(player1=player1, player2=player2, game=game)

class Match(models.Model):
    player1 = models.ForeignKey(Player, related_name='player1_matches', on_delete=models.CASCADE)
    player2 = models.ForeignKey(Player, related_name='player2_matches', null=True, blank=True, on_delete=models.CASCADE)
    winner = models.ForeignKey(Player, related_name='won_matches', null=True, blank=True, on_delete=models.CASCADE)
    game = models.IntegerField(choices=GameChoices.choices)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    matches = MatchManager()

    def start_match(self):
        if self.start_time is not None:
            raise ValueError("Game already started")
        self.start_time = timezone.now()


class TournamentMatchManager(models.Manager):
    def create_match(self, game: GameChoices, player1: Player, player2: Player, tournament: Tournament, round: int):
        return self.create(match=Match.matches.create_match(game, player1, player2), tournament=tournament, round=round)

class TournamentMatch(models.Model):
    match = models.OneToOneField(Match, on_delete=models.CASCADE)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE)
    round = models.IntegerField()
    matches = TournamentMatchManager()


class TournamentPlayerManager(models.Manager):
    def create_player(self, player: Player, tournament: Tournament):
        seed = TournamentPlayer.objects.filter(tournament=tournament).count() + 1
        return super().create(player=player, tournament=tournament, seed=seed)

class TournamentPlayer(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE)
    seed = models.IntegerField()
    players = TournamentPlayerManager()

# class InvitationManager(models.Model):
#     def create_invitation(self, sender: User, receiver: User, invitation_type: str, game: int, match: Match | None = None, tournament: "Tournament | None" = None) -> "Invitation":
#         if game not in [choice.value for choice in GameChoices]:
#             raise ValueError('Invalid game choice')

#         invitation = Invitation.objects.create(
#             sender=sender,
#             receiver=receiver,
#             invitation_type=invitation_type,
#             game=game,
#             match=match,
#             tournament=tournament,
#             status=Invitation.InvitationStatus.PENDING
#         )
#         return invitation

#     def create_match_invitation(self, game: int, sender: User, receiver: User) -> "Invitation":
#         return self.create_invitation(sender, receiver, Invitation.InvitationType.MATCH, game)
     
#     def create_tournament_invitation(self, game: int, tournament: Tournament, sender: User, receiver: User) -> "Invitation":
#         return self.create_invitation(sender, receiver, Invitation.InvitationType.TOURNAMENT, game, tournament=tournament)


class Invitation(models.Model):
    class InvitationStatus(models.IntegerChoices):
        PENDING = 1, 'Pending'
        ACCEPTED = 2, 'Accepted'
        REJECTED = 3, 'Rejected'
        CANCELED = 4, 'Canceled'
    sender = models.ForeignKey(UserAccount, related_name='sent_invitations', on_delete=models.CASCADE)
    receiver = models.ForeignKey(UserAccount, related_name='received_invitations', on_delete=models.CASCADE)
    game = models.IntegerField(choices=GameChoices.choices)
    responded_at = models.DateTimeField(null=True, blank=True)
    
    status = models.SmallIntegerField(choices=InvitationStatus.choices, default=InvitationStatus.PENDING)
    sent_at = models.DateTimeField(auto_now_add=True)

    # invitations = InvitationManager()

    def cancel(self, sender: UserAccount):
        if self.sender != sender:
            raise ValueError("Only the sender can cancel this invitation.")
        self.status = Invitation.InvitationStatus.CANCELED
        self.responded_at = timezone.now()
        self.save()

    def reject(self, sender: UserAccount):
        if self.sender != sender:
            raise ValueError("Only the sender can cancel this invitation.")
        self.status = Invitation.InvitationStatus.CANCELED
        self.responded_at = timezone.now()
        self.save()

    # def accept(self, receiver: UserAccount, response: Literal["accept", "reject"]):
    #     if self.receiver != receiver:
    #         raise ValueError("Only the receiver can respond to this invitation.")
    #     match response:
    #         case "accept":
    #             self.status = 'accepted'
    #             self.responded_at = timezone.now()
    #             self.save()
    #             match self.invitation_type:
    #                 case Invitation.InvitationType.MATCH:
    #                     match = self.match
    #                     if match is not None:
    #                         match.player2 = Player.objects.get(user=receiver)
    #                         match.save()
    #                 case Invitation.InvitationType.TOURNAMENT:
    #                     tournament = self.tournament
    #                     TournamentPlayer.players.create_player(player=Player.objects.get(user=receiver), tournament=tournament)
    #             self.status = Invitation.InvitationStatus.ACCEPTED
    #         case "reject":
    #             self.status = Invitation.InvitationStatus.REJECTED
    #             self.responded_at = timezone.now()
    #             self.save()

    # def respond(self, receiver: UserAccount, response: Literal["accept", "reject"]):
    #     if self.receiver != receiver:
    #         raise ValueError("Only the receiver can respond to this invitation.")
    #     match response:
    #         case "accept":
    #             self.status = 'accepted'
    #             self.responded_at = timezone.now()
    #             self.save()
    #             match self.invitation_type:
    #                 case Invitation.InvitationType.MATCH:
    #                     match = self.match
    #                     if match is not None:
    #                         match.player2 = Player.objects.get(user=receiver)
    #                         match.save()
    #                 case Invitation.InvitationType.TOURNAMENT:
    #                     tournament = self.tournament
    #                     seed = TournamentPlayer.objects.filter(tournament=tournament).count() + 1
    #                     TournamentPlayer.objects.create(tournament=tournament, player=Player.objects.get(user=receiver), seed=seed)
    #             self.status = Invitation.InvitationStatus.ACCEPTED
    #         case "reject":
    #             self.status = Invitation.InvitationStatus.REJECTED
    #             self.responded_at = timezone.now()
    #             self.save()


class MatchInvitation(models.Model):
    invitation = models.ForeignKey(Invitation, on_delete=models.CASCADE)
    match = models.ForeignKey(Match, on_delete=models.CASCADE)

    def handle(self):
        pass

class TournamentInvitation(models.Model):
    invitation = models.ForeignKey(Invitation, on_delete=models.CASCADE)
    Tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE)