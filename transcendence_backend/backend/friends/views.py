import json
from django.shortcuts import render
from .models import *
from user.models import UserAccount
from django.contrib.auth.decorators import login_required
from datetime import datetime, timedelta
from django.http import HttpResponse, JsonResponse
from django.core.serializers.json import DjangoJSONEncoder
from django.views.decorators.csrf import csrf_exempt


def getUserData(user, friend, user_friend_list):
	data = {
			'id': friend.pk,
			'username': friend.username,
			'email': friend.email,
			'first_name': friend.first_name,
			'last_name': friend.last_name,
			'avatar': friend.avatar.url,
			'last_login': friend.last_login,
			'date_joined': friend.date_joined
		}
	if user != friend:
		is_mutual_friend = user_friend_list.is_mutual_friend(friend)
		data['is_mutual_friend'] = is_mutual_friend
	
	return data


@csrf_exempt
@login_required
def friend_list(request, *args, **kwargs):
	user = request.user
	user_id = kwargs.get('user_id')
	if user_id:
		try:
			this_user = UserAccount.objects.get(pk=user_id)
		except UserAccount.DoesNotExist:
			return {'error': "error user no exit"}
			return JsonResponse({})
		
		try:
			friend_list = FriendList.objects.get(user=this_user)
		except FriendList.DoesNotExist:
			friend_list = []
			return {'error': "User has no friends"}
			return JsonResponse({})
		
		#must be friends to view another profile's friend list
		if user != this_user:
			if not user in friend_list.friends.all():
				return {'error': "You must be friends to view this User's Frienlist"}
				return JsonResponse({'success': False, 'message': ''})
		
		friends = []
		user_friend_list = FriendList.objects.get(user=user)

		for friend in friend_list.friends.all():
			if user != this_user:
				if not BlockList.is_either_blocked(this_user, friend):
					friends.append((getUserData(user, friend, user_friend_list)))
			else:
				if not BlockList.is_either_blocked(user, friend):
					friends.append((getUserData(user, friend, user_friend_list)))

		return friends
		# return JsonResponse({'data': friends}, status=200)
	else:
		return {'success': False}
		return JsonResponse({'success': False}, status=400)




@csrf_exempt
@login_required
def accept_friend_request(request, *args, **kwargs):
	user = request.user
	if request.method == 'GET':
		friend_request_id = kwargs.get('friend_request_id')
		if friend_request_id:
			friend_request = FriendRequest.objects.get(pk=friend_request_id)
			if friend_request:
				if friend_request.receiver == user:
					friend_request.accept()
					return JsonResponse({'success': True, 'message': 'Friend request accepted.'}, status=200)
				else:
					return JsonResponse({'success': False, 'message': 'You cannot access this feature'}, status=400)
			else:
				return JsonResponse({'success': False, 'message': 'This request does not exist'}, status=400)
		else:
			return JsonResponse({'success': False, 'message': 'Friend request is invalid.'}, status=400)
	else:
		return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)
		

@csrf_exempt
@login_required
def reject_friend_request(request, *args, **kwargs):
	user = request.user
	if request.method == 'GET':
		friend_request_id = kwargs.get('friend_request_id')
		if friend_request_id:
			friend_request = FriendRequest.objects.get(pk=friend_request_id)
			if friend_request:
				if friend_request.receiver == user:
					friend_request.reject()
					return JsonResponse({'success': True, 'message': 'Friend request rejected.'}, status=200)
				else:
					return JsonResponse({'success': False, 'message': 'You cannot access this feature'}, status=400)
			else:
				return JsonResponse({'success': False, 'message': 'This request does not exist'}, status=400)
		else:
			return JsonResponse({'success': False, 'message': 'Friend request is invalid.'}, status=400)
	else:
		return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


@csrf_exempt
@login_required
def cancel_friend_request(request, *args, **kwargs):
	user = request.user
	if request.method == 'POST':
		data = json.loads(request.body)
		receiver_id = data.get('receiver_id')
		if receiver_id:
			receiver = UserAccount.objects.get(pk=receiver_id)
			try:
				friend_requests = FriendRequest.objects.filter(sender=user, receiver=receiver, is_active=True)
			except Exception as e:
				return JsonResponse({'success': False, 'message': 'This request does not exist'}, status=400)
			if len(friend_requests) > 1:
				for request in friend_requests:
					request.cancel()
				return JsonResponse({'success': True, 'message': 'Friend request cancelled.'}, status=200)
			else:
				friend_requests.first().cancel()
				return JsonResponse({'success': True, 'message': 'Friend request cancelled.'}, status=200)
		else:
			return JsonResponse({'success': False, 'message': 'Invalid request'}, status=400)
	else:
		return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


@csrf_exempt
@login_required
def friend_requests_sent(request, *args, **kwargs):
	user = request.user
	user_id = kwargs.get('user_id')
	account = UserAccount.objects.get(pk=user_id)
	data = []
	if account == user:
		sent_requests = FriendRequest.objects.filter(sender=account, is_active=True)
		for req in sent_requests:
			item = {
				'request_id': req.pk,
				'id': req.receiver.pk,
				'username': req.receiver.username,
				'avatar': req.receiver.avatar.url
			}
			data.append(item)
	else:
		return JsonResponse({'success': False, 'message': 'You cannot access this page'}, status=400)
	return JsonResponse({'data': data})


@csrf_exempt
@login_required
def friend_requests_received(request, *args, **kwargs):
	user = request.user
	user_id = kwargs.get('user_id')
	account = UserAccount.objects.get(pk=user_id)
	data = []
	if account == user:
		friend_requests = FriendRequest.objects.filter(receiver=account, is_active=True)
		for req in friend_requests:
			item = {
				'request_id': req.pk,
				'id':req.sender.pk,
				'username':req.sender.username,
				'avatar': req.sender.avatar.url
			}
			data.append(item)
	else:
		return JsonResponse({'success': False, 'message': 'You cannot access this page'}, status=400)
	return JsonResponse({'data': data})


@csrf_exempt
@login_required
def send_friend_request(request, *args, **kwargs):
	user = request.user
	if request.method == 'POST':
		data = json.loads(request.body)
		friend_id = data.get('receiver_id')
		if friend_id:
			receiver = UserAccount.objects.get(pk=friend_id)
			try:
				friend_requests = FriendRequest.objects.filter(sender=user, receiver=receiver)
				try:
					for req in friend_requests:
						if req.is_active:
							raise Exception("You have an active friend request.")
					friend_request = FriendRequest.objects.create(sender=user, receiver=receiver)
					# friend_request = FriendRequest.objects.get_or_create(sender=user, receiver=receiver)
					# friend_request = FriendRequest(sender=user, receiver=receiver)
					friend_request.save()
					return JsonResponse({'success': True, 'message': 'Friend request was sent'}, status=200)
				except Exception as e:
					return JsonResponse({'success': False, 'message': str(e)}, status=400)
			except FriendRequest.DoesNotExist:
				friend_request = FriendRequest(sender=user, receiver=receiver)
				friend_request.save()
				return JsonResponse({'success': True, 'message': 'Friend request was sent'}, status=200)
		else:
			return JsonResponse({'success': False, 'message': 'User does not exist'}, status=404)
	else:
		return JsonResponse({'success': False, 'message': 'method not allowed'}, status=403)
	

@csrf_exempt
@login_required
def remove_friend(request, *args, **kwargs):
	user = request.user
	if request.method == 'POST':
		data = json.loads(request.body)
		user_id = data.get('receiver_id')
		if user_id:
			try:
				to_remove = UserAccount.objects.get(pk=user_id)
				remover_friend_list = FriendList.objects.get(user=user)
				remover_friend_list.unfriend(to_remove)
				return JsonResponse({'success': True, 'message': 'Friend request removed.'}, status=200)
			except Exception as e:
				return JsonResponse({'success': False, 'message': str(e)}, status=400)
		else:
			return JsonResponse({'success': False, 'message': 'Bad request'}, status=400)
	else:
		return JsonResponse({'success': False, 'message': 'method not allowed'}, status=403)


@csrf_exempt
@login_required
def block_user(request, *args, **kwargs):
	user = request.user
	if request.method == 'GET':
		user_id = kwargs.get('user_id')
		to_block = UserAccount.objects.get(pk=user_id)
		if user_id and to_block != user:
			try:
				block_list = BlockList.objects.get(user=user)
				block_list.block_user(to_block)
				return JsonResponse({'success': True, 'message': f'You have successfully blocked {to_block}'}, status=200)
			except Exception as e:
				return JsonResponse({'success': False, 'message': str(e)}, status=400)
		else:
			return JsonResponse({'success': False, 'message': 'Bad request'}, status=400)
	else:
		return JsonResponse({'success': False, 'message': 'method not allowed'}, status=403)
		



@csrf_exempt
@login_required
def unblock_user(request, *args, **kwargs):
	user = request.user
	if request.method == 'GET':
		user_id = kwargs.get('user_id')
		to_unblock = UserAccount.objects.get(pk=user_id)
		if user_id and to_unblock != user:
			try:
				block_list = BlockList.objects.get(user=user)
				block_list.unblock_user(to_unblock)
				return JsonResponse({'success': True, 'message': f'You have successfully unblocked {to_unblock}'}, status=200)
			except Exception as e:
				return JsonResponse({'success': False, 'message': str(e)}, status=400)
		else:
			return JsonResponse({'success': False, 'message': 'Bad request'}, status=400)
	else:
		return JsonResponse({'success': False, 'message': 'method not allowed'}, status=403)
	

@csrf_exempt
@login_required
def block_list_view(request, *args, **kwargs):
	user = request.user
	result_block_list = []
	if request.method == 'GET':
		try:
			block_list = BlockList.objects.get(user=user)
			for account in block_list.blocked.all():
				block_user = {
					'id': account.pk,
					'username': account.username,
					'email': account.email,
					'first_name': account.first_name,
					'last_name': account.last_name,
					'avatar': account.avatar.url,
					'last_login': account.last_login,
					'date_joined': account.date_joined
				}
				result_block_list.append(block_user)
			return result_block_list
		except Exception as e:
			return {'success': False, 'message': str(e)}
	else:
		return {'success': False, 'message': 'method not allowed'}

			

