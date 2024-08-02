import json
from django.conf import settings
from django.shortcuts import render, redirect
# from friends.models import *
from friends.models import BlockList, FriendList
from .utils import *
from .models import UserAccount, Player
from friends.utils import get_my_block_list, get_user_friend_list
# from friends.views import friend_list, block_list_view
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404
from datetime import datetime, timedelta
from django.http import HttpResponse, JsonResponse
from django.core.files.storage import default_storage
from django.core.serializers.json import DjangoJSONEncoder
from django.views.decorators.http import require_POST, require_http_methods, require_GET
from django.views.decorators.csrf import csrf_exempt
# import requests

@csrf_exempt
@require_POST
def register_view(request):
    user: UserAccount = request.user
    if user.is_authenticated:
        return HttpConflict409(f'You are already logged in as {user}')
    data = json.loads(request.body)
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if UserAccount.objects.filter(username=username).exists():
        return HttpConflict409('Username already exists')
    if UserAccount.objects.filter(email=email).exists():
        return HttpConflict409('email already exists')
    try:
        user = UserAccount.objects.create_user(username, email, password)
        user.save()
        return HttpSuccess200('Registration Successful')
    except Exception as e:
        return HttpBadRequest400(str(e))

@csrf_exempt
@require_http_methods(["GET", "POST"])
def login_view(request):
    if request.method == "GET":
        if request.user.is_authenticated:
            return HttpSuccess200("You have an active session.", { "user_id": request.user.pk })
        return HttpForbidden403("You have no active session")
    
    data = json.loads(request.body)
    username = data.get('username')
    password = data.get('password')

    user = authenticate(request, username=username, password=password)

    if user is None or not isinstance(user, UserAccount):
        return HttpUnauthorized401("Invalid credentials")
    if not user.is_active:
        return HttpForbidden403("Account is disabled")
    login(request, user)
    user.status = 'online'
    user.save()
    return HttpSuccess200("Login Successful", { "user_id": request.user.pk })
        


@csrf_exempt
@login_required
@require_POST
def logout_view(request):
    user = request.user
    try:
        user.status = 'offline'
        user.save()
        logout(request)
        return HttpSuccess200("Logout successful")
    except Exception as e :
        return HttpInternalError500(str(e))


@csrf_exempt
@login_required
@require_GET
def profile_view(request, *args, **kwargs):
    user: UserAccount = request.user
    user_id = kwargs.get('user_id')

    try:
        account = UserAccount.objects.get(pk=user_id)
        player = Player.objects.get(user=account)
    except (UserAccount.DoesNotExist, Player.DoesNotExist):
        return HttpNotFound404("User not Found")

    if BlockList.is_either_blocked(user, account):
        return HttpForbidden403("Blocked: You cannot view this account")
    data = serializer_full_profile_details(account, player)
    is_friend, friends = get_user_friend_list(user, account)
    block_list = get_my_block_list(account)
    data['friends'] = friends
    data['blocked'] = block_list
    data['is_self'] = False if user.is_authenticated and user != account else True
    data['is_friend'] = is_friend
    return HttpSuccess200(data=data)


@csrf_exempt
@login_required
@require_POST
def profile_edit_view(request, *args, **kwargs):
    user = request.user
    user_id = kwargs.get('user_id')
    try:
        account: UserAccount = UserAccount.objects.get(pk=user_id)
        player = Player.objects.get(user=account)
    except (UserAccount.DoesNotExist, Player.DoesNotExist):
        HttpNotFound404("This profile does not exist")
    
    if account != user:
        return HttpForbidden403("You are not allowed to edit this profile")
    first_name = request.POST.get('first_name')
    last_name = request.POST.get('last_name')
    alias = request.POST.get('alias')
    avatar = request.FILES.get('avatar')
    if first_name:
        account.first_name = first_name
    if last_name:
        account.last_name = last_name
    if alias:
        player.alias = alias
    if avatar:
        account.avatar = avatar
    player.save()
    account.save()
    return HttpSuccess200("Profile edited sucessfull")


@csrf_exempt
@login_required
@require_GET
def search(request, *args, **kwargs):
    user = request.user
    query = request.GET.get('q')
    data = []
    if len(query) > 0:
        # search_results = UserAccount.objects.filter(username__icontains=query).filter(email__icontains=query).distinct()
        search_results = UserAccount.objects.filter(username__icontains=query).distinct()
        for account in search_results:
            item = {
                'id': account.pk,
                'username': account.username,
                'email': account.email,
                'first_name': account.first_name,
                'last_name': account.last_name,
                'avatar': account.avatar.url
            }
            user_friend_list = FriendList.objects.get(user=user)
            item['is_mutual_friend'] = user_friend_list.is_mutual_friend(account)
            data.append((item)) 
    return HttpSuccess200(data=data)


def login_auth(request):
    if request.user.is_authenticated:
        return HttpSuccess200(message='You have an active session.', data={'user_id': request.user.pk})
    # redirect_uri = 'http://localhost:8000/callback/'
    redirect_uri = 'https://api.pong42.com/callback/'
    client_id = settings.CLIENT_ID
    authorization_url = f'https://api.intra.42.fr/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code'
    # return HttpSuccess200(message='', data={'redirect': True, 'redirect_url': authorization_url})
    return HttpSuccess200(message='', data={'redirect': True, 'redirect_url': authorization_url})

def callback(request):
    code = request.GET.get('code')
    client_id = settings.CLIENT_ID
    client_secret = settings.CLIENT_SECRET
    # redirect_uri = 'http://localhost:8000/callback/'
    redirect_uri = 'https://api.pong42.com/callback/'
    token_url = 'https://api.intra.42.fr/oauth/token'
    response = post(token_url, data={
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': redirect_uri,
        'client_id': client_id,
        'client_secret': client_secret,
    })
    token_data = response.json()
    access_token = token_data['access_token']
    # Use the access token to get user info
    user_info_response = get('https://api.intra.42.fr/v2/me', headers={
        'Authorization': f'Bearer {access_token}'
    })
    user_info = user_info_response.json()
    user, created = UserAccount.objects.get_or_create(username=user_info['login'], defaults={
        'first_name': user_info['first_name'],
        'last_name': user_info['last_name'],
        'email': user_info['email'],
    })
    if user is not None and user.is_active:
        login(request, user)
        user.status = 'online'
        user.save()
        return HttpSuccess200(message='Login successful!')
    else:
        return HttpUnauthorized401(message='Invalid credentials')


# import json
# from django.conf import settings
# from django.shortcuts import render, redirect
# from friends.models import *
# from .models import UserAccount, Player
# # from friends.views import friend_list, block_list_view
# from friends.views import get_user_friend_list, get_my_block_list, get_user_list
# from django.contrib.auth import authenticate, login, logout
# # from django.contrib.auth.models import User
# from django.contrib.auth.decorators import login_required
# from django.shortcuts import get_object_or_404
# from datetime import datetime, timedelta
# from django.http import HttpResponse, JsonResponse
# from django.core.files.storage import default_storage
# from django.core.serializers.json import DjangoJSONEncoder
# from django.views.decorators.csrf import csrf_exempt
# from django.http import HttpResponseNotAllowed, HttpResponse
# import middleware as md
# from typing import TypedDict
# from django.core.files.uploadedfile import UploadedFile


# @csrf_exempt
# def register_view(request):
# 	user: UserAccount = request.user
# 	if request.method != 'POST':
# 		return HttpResponseNotAllowed(["POST"])
# 	if user.is_authenticated:
# 		return md.Conflict409(f"You are already logged in as {user.username}")
# 	data = json.loads(request.body)
# 	username = data.get('username')
# 	email = data.get('email')
# 	password = data.get('password')

# 	if UserAccount.objects.filter(username=username).exists():
# 		return md.BadRequest400("Username already exists")
# 	if UserAccount.objects.filter(email=email).exists():
# 		return md.BadRequest400("Email already exists")
# 	try:
# 		user = UserAccount.objects.create_user(username, email, password)
# 		Player.objects.create(user=user)
# 		FriendList.objects.create(user=user)
# 		BlockList.objects.create(user=user)
# 		return md.Success200("Registration Successful")
# 	except Exception as e:
# 		return md.BadRequest400(str(e))

# @csrf_exempt
# def login_view(request):
# 	if request.method == "GET":
# 		if not request.user.is_authenticated:
# 			return HttpResponse(status=401)
# 		return md.Success200("You have an active session.", {'user_id': request.user.pk})
# 	elif request.method == 'POST':
# 		if request.user.is_authenticated:
# 			return HttpResponse(status=409)
# 		data = json.loads(request.body)
# 		username = data.get('username')
# 		password = data.get('password')
# 		user = authenticate(request, username=username, password=password)
# 		if user is None or not isinstance(user, UserAccount):
# 			return md.BadRequest400("Invalid credentials")
# 		if not user.is_active:
# 			return md.BadRequest400("Account is disabled")
# 		login(request, user)
# 		user.status = 'online'
# 		user.save()
# 		return md.Success200("Login Successful", {'user_id': request.user.pk})
# 	else:
# 		return HttpResponseNotAllowed(["GET", "POST"])

# @csrf_exempt
# @login_required
# def logout_view(request):
# 	if request.method != 'POST':
# 		return HttpResponseNotAllowed(["POST"])
# 	try:
# 		request.user.status = 'offline'
# 		request.user.save()
# 		logout(request)
# 	except Exception as e:
# 		return md.InternalError500(str(e))
# 	return md.Success200("Logout successful")


# @csrf_exempt
# @login_required
# def profile_view(request, user_id: int):
# 	if request.method != 'GET':
# 		return HttpResponseNotAllowed(["GET"])
# 	user: UserAccount = request.user
# 	try:
# 		account = user if user.pk == user_id else UserAccount.objects.get(pk=user_id)
# 		blocked = get_my_block_list(user) if user.pk == user_id else None
# 		player = Player.objects.get(user=account)
# 		is_friend, friends = get_user_friend_list(user, user_id)
# 	except Exception as e:
# 		return md.NotFound404("User or associated data for id not found")
# 	if BlockList.is_either_blocked(user, account):
# 		return md.Forbidden403("Blocked: You cannot view this account")
# 	return md.Success200("profile data", {
# 			'id': account.pk,
# 			'username': account.username,
# 			'email': account.email,
# 			'first_name': account.first_name,
# 			'last_name': account.last_name,
# 			'avatar': account.avatar.url,
# 			'last_login': account.last_login,
# 			'date_joined': account.date_joined,
# 			'alias': player.alias,
# 			'games_played': player.games_played,
# 			'wins': player.wins,
# 			'losses': player.losses,
# 			'friends': friends,
# 			'blocked': blocked,
# 			'is_self': True if user.pk == user_id else False,
# 			'is_friend': is_friend
# 	})



# @csrf_exempt
# @login_required
# def profile_edit_view(request, user_id: int):
# 	if request.method != 'POST':
# 		return HttpResponseNotAllowed(["POST"])
# 	user: UserAccount = request.user
# 	if user.pk != user_id:
# 		return md.Forbidden403("You have no permission to change the data")
# 	try:
# 		player = Player.objects.get(user=user)
# 		first_name = request.POST.get('first_name')
# 		last_name = request.POST.get('last_name')
# 		alias = request.POST.get('alias')
# 		avatar = request.FILES.get('avatar')
# 		if first_name:
# 			user.first_name = first_name
# 		if last_name:
# 			user.last_name = last_name
# 		if alias:
# 			player.alias = alias
# 		if avatar:
# 			user.avatar = avatar
# 		player.save()
# 		user.save()
# 		return md.Success200("profile updated")
# 	except Player.DoesNotExist:
# 		return md.NotFound404("player data for user not found")
# 	except Exception as e:
# 		return md.BadRequest400(str(e))
    


# @csrf_exempt
# @login_required
# def search(request, *args, **kwargs):
# 	if request.method != 'GET':
# 		return HttpResponseNotAllowed(["GET"])
# 	user = request.user
# 	query = request.GET.get('q')
# 	search_results = UserAccount.objects.filter(username__icontains=query).distinct()
# 	return md.Success200("user search", get_user_list(user, search_results))

