from django.views import View
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
from .serializers import *
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404
from datetime import datetime, timedelta
from django.http import HttpResponse, JsonResponse
from django.core.serializers.json import DjangoJSONEncoder
from django.views.decorators.http import require_GET, require_POST, require_safe
from django.views.decorators.csrf import csrf_exempt
from django.http.request import HttpRequest
from django.contrib.auth.models import AnonymousUser
from django.contrib.humanize.templatetags.humanize import naturaltime
from user.serializers import *



class TournamentListView(View):
    pass

class TournamentView(View):
    pass


    

# class GameRequestListView(View):
#     def get(self, request):
#         user = request.user
#         invites_recieved = []
#         invites = GameRequest.objects.filter(invitee=user, is_active=True)
#         player = get_object_or_404(Player, user=user)
#         invites = [serializer_inviter_invitee_details(i, i.invitee, ) for i in invites]
#         for invite in invites:
#             inviter = UserAccount.objects.get(username=invite.user)
#             player = Player.objects.get(user=inviter)
#             item = serializer_inviter_invitee_details(invite, inviter, player, True)
#             invites_recieved.append(item)
#         return JsonResponse({'data': invites_recieved})


        user = request.user
        invites_sent= []
        try:
            invites = GameRequest.objects.filter(user=user, is_active=True)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
        for invite in invites:
            invitee = UserAccount.objects.get(username=invite.invitee)
            player = Player.objects.get(user=invitee)
            item = serializer_inviter_invitee_details(invite, invitee, player, False)
            invites_sent.append(item)
        return JsonResponse({'data': invites_sent})



class GameRequestView(View):
    def patch(self, request):
        pass
    def delete(self, request):
        pass