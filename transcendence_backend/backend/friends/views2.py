from django.shortcuts import render
from .models import *
from user.models import UserAccount
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, Http404
from django.core.serializers.json import DjangoJSONEncoder
from django.views.decorators.csrf import csrf_exempt
import json
from django.views.decorators.http import require_POST, require_http_methods, require_GET
from user.utils import *
from datetime import datetime
from typing import TypedDict, Literal
from django.db.models.query import QuerySet
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404




class UserFriendRequestData(TypedDict):
	request_id: int
	id: int
	username: str
	avatar: str


def get_friend_request_item(id: int, user: UserAccount) -> UserFriendRequestData:
	return {
		'request_id': id,
		'id': user.pk,
		'username': user.username,
		'avatar': user.avatar.url
	}


class UserInfoData(TypedDict):
	id: int
	username: str
	email: str
	first_name: str
	last_name: str
	avatar: str
	last_login: datetime
	date_joined: datetime
	is_mutual_friend: bool


def get_other_user_data(user_in_list: UserAccount, is_friend_of_logged_in_user: bool) -> UserInfoData:
	return {
        'id': user_in_list.pk,
        'username': user_in_list.username,
        'email': user_in_list.email,
        'first_name': user_in_list.first_name,
        'last_name': user_in_list.last_name,
        'avatar': user_in_list.avatar.url,
        'last_login': user_in_list.last_login,
        'date_joined': user_in_list.date_joined,
        'is_mutual_friend': is_friend_of_logged_in_user
    }


def get_my_block_list(user: UserAccount) -> list[UserInfoData]:
	if not isinstance(user, UserAccount):
		raise RuntimeError("get_my_block_list: User invalid")
	block_list = BlockList.objects.get(user=user)
	return [get_other_user_data(account, False) for account in block_list.blocked.all()]


def get_user_list(logged_in_user: UserAccount, userQuery: QuerySet[UserAccount]) -> list[UserInfoData]:
    logged_in_user_friend_list = FriendList.objects.get(user=logged_in_user)
    data = []
    for user in userQuery:
        if not BlockList.is_either_blocked(logged_in_user, user):
            user_data = get_other_user_data(user, logged_in_user_friend_list.is_mutual_friend(user))
            data.append(user_data)
    return data


def get_user_friend_list(logged_in_user: UserAccount, user_to_check :UserAccount) -> tuple[bool, list[UserInfoData]]:
    friend_list = FriendList.objects.get(user=user_to_check)
    if logged_in_user == user_to_check:
        return False, get_user_list(logged_in_user, friend_list.friends.all())
    if not friend_list.friends.contains(logged_in_user):
        return False, []
    return True, get_user_list(logged_in_user, friend_list.friends.all())



def get_request_or_404(friend_request_id: int) -> FriendRequest:
    try:
        friend_request = FriendRequest.objects.get(pk=friend_request_id)
        if not friend_request.is_active:
            raise Http404("No Friendrequest found")
    except FriendRequest.DoesNotExist:
        raise Http404("No Friendrequest found")
    return friend_request

@csrf_exempt
@login_required
@require_POST
def accept_friend_request(request, friend_request_id: int):
    # try:
    #     friend_request = get_request_or_404(friend_request_id)
    # except Http404:
    #     return HttpNotFound404("This request does not exist")
    friend_request = get_request_or_404(friend_request_id)
    if friend_request.receiver != request.user:
        return HttpForbidden403("You cannot access this feature")
    friend_request.accept()
    return HttpSuccess200("Friend request accepted.")

@csrf_exempt
@login_required
@require_POST
def reject_friend_request(request, friend_request_id: int):
    friend_request = get_request_or_404(friend_request_id)
    if friend_request.receiver != request.user:
        return HttpForbidden403("You cannot access this feature")
    friend_request.reject()
    return HttpSuccess200("Friend request rejected.")


@csrf_exempt
@login_required
@require_POST
def cancel_friend_request(request, friend_request_id: int):
    friend_request = get_request_or_404(friend_request_id)
    if friend_request.sender != request.user:
        return HttpForbidden403("You cannot access this feature")
    friend_request.cancel()
    return HttpSuccess200("Friend request rejected.")


@csrf_exempt
@login_required
@require_GET
def friend_list_view(request, user_id: int):
    friend_list = get_user_friend_list(request.user, get_object_or_404(UserAccount, pk=user_id))[1]
    return HttpSuccess200(f"list of friends", friend_list)


@csrf_exempt
@login_required
@require_GET
def block_list_view(request):
    block_list = get_my_block_list(request.user)
    return HttpSuccess200(f"list of blocked users", block_list)


@csrf_exempt
@login_required
@require_GET
def friend_requests_received(request, user_id: int):
    account = get_object_or_404(UserAccount, pk=user_id)
    request_list = FriendRequest.objects.filter(receiver=account, is_active=True)
    data = [get_friend_request_item(req.pk, req.sender) for req in request_list]
    return HttpSuccess200(f"list of received friend requests", data)


@csrf_exempt
@login_required
@require_GET
def friend_requests_sent(request, user_id: int):
    account = get_object_or_404(UserAccount, pk=user_id)
    request_list = FriendRequest.objects.filter(sender=account, is_active=True)
    data = [get_friend_request_item(req.pk, req.receiver) for req in request_list]
    return HttpSuccess200(f"list of friend requests sent", data)

			

@csrf_exempt
@login_required
@require_POST
def unblock_user(request, user_id: int):
    receiver = get_object_or_404(UserAccount, pk=user_id)
    block_list = get_object_or_404(BlockList, user=request.user)
    block_list.unblock_user(receiver)
    return HttpSuccess200(f"user {receiver.username} unblocked")

@csrf_exempt
@login_required
@require_POST
def block_user(request, user_id: int):
    receiver = get_object_or_404(UserAccount, pk=user_id)
    block_list = get_object_or_404(BlockList, user=request.user)
    block_list.block_user(receiver)
    return HttpSuccess200(f"user {receiver.username} blocked")

@csrf_exempt
@login_required
@require_POST
def remove_friend(request, user_id: int):
    receiver = get_object_or_404(UserAccount, pk=user_id)
    friend_list = get_object_or_404(FriendList, user=request.user)
    friend_list.unfriend(receiver)
    return HttpSuccess200(f"friend {receiver.username} removed")

@csrf_exempt
@login_required
@require_POST
def send_friend_request(request):
    receiver: UserAccount = UserAccount.objects.get(pk=json.loads(request.body).get('receiver_id'))
    if FriendRequest.objects.filter(sender=request.user, receiver=receiver, is_active=True).exists():
        return HttpConflict409("You have an active friend request.")
    friend_request = FriendRequest.objects.create(sender=request.user, receiver=receiver)
    friend_request.save()
    return HttpSuccess200(f"friend request sent")





# @csrf_exempt
# @login_required
# def friend_requests_sent(request, *args, **kwargs):
# 	user = request.user
# 	if request.method == 'GET':
# 		user_id = kwargs.get('user_id')
# 		account = UserAccount.objects.get(pk=user_id)
# 		data = []
# 		if account == user:
# 			sent_requests = FriendRequest.objects.filter(sender=account, is_active=True)
# 			for req in sent_requests:
# 				item = {
# 					'request_id': req.pk,
# 					'id': req.receiver.pk,
# 					'username': req.receiver.username,
# 					'avatar': req.receiver.avatar.url
# 				}
# 				data.append(item)
# 		else:
# 			return JsonResponse({'success': False, 'message': 'You cannot access this page'}, status=400)
# 		return JsonResponse({'success': True, 'message': 'active friend requests sent', 'data': data}, status=200)
# 	return JsonResponse({'success': False, 'message': 'method not allowed'}, status=405)


# @csrf_exempt
# @login_required
# def friend_requests_received(request, *args, **kwargs):
# 	user = request.user
# 	if request.method == 'GET':
# 		user_id = kwargs.get('user_id')
# 		account = UserAccount.objects.get(pk=user_id)
# 		data = []
# 		if account == user:
# 			friend_requests = FriendRequest.objects.filter(receiver=account, is_active=True)
# 			for req in friend_requests:
# 				item = {
# 					'request_id': req.pk,
# 					'id':req.sender.pk,
# 					'username':req.sender.username,
# 					'avatar': req.sender.avatar.url
# 				}
# 				data.append(item)
# 		else:
# 			return JsonResponse({'success': False, 'message': 'You cannot access this page'}, status=400)
# 		return JsonResponse({'success': True, 'message': 'active friend requests received', 'data': data}, status=200)
# 	return JsonResponse({'success': False, 'message': 'method not allowed'}, status=405)


# @csrf_exempt
# @login_required
# def send_friend_request(request, *args, **kwargs):
# 	user = request.user
# 	if request.method == 'POST':
# 		data = json.loads(request.body)
# 		friend_id = data.get('receiver_id')
# 		if friend_id:
# 			receiver = UserAccount.objects.get(pk=friend_id)
# 			try:
# 				friend_requests = FriendRequest.objects.filter(sender=user, receiver=receiver)
# 				try:
# 					for req in friend_requests:
# 						if req.is_active:
# 							raise Exception("You have an active friend request.")
# 					friend_request = FriendRequest.objects.create(sender=user, receiver=receiver)
# 					# friend_request = FriendRequest.objects.get_or_create(sender=user, receiver=receiver)
# 					# friend_request = FriendRequest(sender=user, receiver=receiver)
# 					friend_request.save()
# 					return JsonResponse({'success': True, 'message': 'Friend request was sent'}, status=200)
# 				except Exception as e:
# 					return JsonResponse({'success': False, 'message': str(e)}, status=400)
# 			except FriendRequest.DoesNotExist:
# 				friend_request = FriendRequest(sender=user, receiver=receiver)
# 				friend_request.save()
# 				return JsonResponse({'success': True, 'message': 'Friend request was sent'}, status=200)
# 		else:
# 			return JsonResponse({'success': False, 'message': 'User does not exist'}, status=404)

# 	return JsonResponse({'success': False, 'message': 'method not allowed'}, status=405)
	

# @csrf_exempt
# @login_required
# def remove_friend(request, *args, **kwargs):
# 	user = request.user
# 	if request.method == 'POST':
# 		data = json.loads(request.body)
# 		user_id = data.get('receiver_id')
# 		if user_id:
# 			try:
# 				to_remove = UserAccount.objects.get(pk=user_id)
# 				remover_friend_list = FriendList.objects.get(user=user)
# 				remover_friend_list.unfriend(to_remove)
# 				return JsonResponse({'success': True, 'message': 'Friend request removed.'}, status=200)
# 			except Exception as e:
# 				return JsonResponse({'success': False, 'message': str(e)}, status=400)
# 		else:
# 			return JsonResponse({'success': False, 'message': 'Bad request'}, status=400)

# 	return JsonResponse({'success': False, 'message': 'method not allowed'}, status=405)


# @csrf_exempt
# @login_required
# def block_user(request, *args, **kwargs):
# 	user = request.user
# 	if request.method == 'GET':
# 		user_id = kwargs.get('user_id')
# 		to_block = UserAccount.objects.get(pk=user_id)
# 		if user_id and to_block != user:
# 			try:
# 				block_list = BlockList.objects.get(user=user)
# 				block_list.block_user(to_block)
# 				return JsonResponse({'success': True, 'message': f'You have successfully blocked {to_block}'}, status=200)
# 			except Exception as e:
# 				return JsonResponse({'success': False, 'message': str(e)}, status=400)
# 		else:
# 			return JsonResponse({'success': False, 'message': 'Bad request'}, status=400)
# 	else:
# 		return JsonResponse({'success': False, 'message': 'method not allowed'}, status=405)
		



# @csrf_exempt
# @login_required
# def unblock_user(request, *args, **kwargs):
# 	user = request.user
# 	if request.method == 'GET':
# 		user_id = kwargs.get('user_id')
# 		to_unblock = UserAccount.objects.get(pk=user_id)
# 		if user_id and to_unblock != user:
# 			try:
# 				block_list = BlockList.objects.get(user=user)
# 				block_list.unblock_user(to_unblock)
# 				return JsonResponse({'success': True, 'message': f'You have successfully unblocked {to_unblock}'}, status=200)
# 			except Exception as e:
# 				return JsonResponse({'success': False, 'message': str(e)}, status=400)
# 		else:
# 			return JsonResponse({'success': False, 'message': 'Bad request'}, status=400)
# 	else:
# 		return JsonResponse({'success': False, 'message': 'method not allowed'}, status=405)
	

# @csrf_exempt
# @login_required
# def block_list_view(request, *args, **kwargs):
# 	user = request.user
# 	result_block_list = []
# 	if request.method == 'GET':
# 		try:
# 			block_list = BlockList.objects.get(user=user)
# 			for account in block_list.blocked.all():
# 				block_user = {
# 					'id': account.pk,
# 					'username': account.username,
# 					'email': account.email,
# 					'first_name': account.first_name,
# 					'last_name': account.last_name,
# 					'avatar': account.avatar.url,
# 					'last_login': account.last_login,
# 					'date_joined': account.date_joined
# 				}
# 				result_block_list.append(block_user)
# 			return result_block_list
# 		except Exception as e:
# 			return {'success': False, 'message': str(e)}
# 	else:
# 		return {'success': False, 'message': 'method not allowed'}

			

# @csrf_exempt
# @login_required
# def unblock_user(request, *args, **kwargs: int):
#     if request.method != 'POST':
#         return HttpResponseNotAllowed(["POST"])
#     try:
#         receiver: UserAccount = UserAccount.objects.get(pk=kwargs.get('user_id'))
#         BlockList.objects.get(user=request.user).unblock_user(receiver)
#         return md.Success200(f"user unblocked")
#     except Exception as e:
#         return md.BadRequest400(str(e))

# @csrf_exempt
# @login_required
# def block_user(request, *args, **kwargs: int):
#     if request.method != 'POST':
#         return HttpResponseNotAllowed(["POST"])
#     try:
#         receiver: UserAccount = UserAccount.objects.get(pk=kwargs.get('user_id'))
#         BlockList.objects.get(user=request.user).block_user(receiver)
#         return md.Success200(f"user blocked")
#     except Exception as e:
#         return md.BadRequest400(str(e))

# @csrf_exempt
# @login_required
# def remove_friend(request, *args, **kwargs: int):
#     if request.method != 'POST':
#         return HttpResponseNotAllowed(["POST"])
#     try:
#         receiver: UserAccount = UserAccount.objects.get(pk=json.loads(request.body).get('receiver_id'))
#         FriendList.objects.get(user=request.user).unfriend(receiver)
#         return md.Success200(f"friend removed")
#     except Exception as e:
#         return md.BadRequest400(str(e))

# @csrf_exempt
# @login_required
# def send_friend_request(request, *args, **kwargs: int):
#     if request.method != 'POST':
#         return HttpResponseNotAllowed(["POST"])
#     try:
#         receiver: UserAccount = UserAccount.objects.get(pk=json.loads(request.body).get('receiver_id'))
#         if FriendRequest.objects.filter(sender=request.user, receiver=receiver, is_active=True).exists():
#             return md.BadRequest400("You have an active friend request.")
#         friend_request = FriendRequest.objects.create(sender=request.user, receiver=receiver)
#         friend_request.save()
#         return md.Success200(f"friend request sent")
#     except Exception as e:
#         return md.BadRequest400(str(e))

# @csrf_exempt
# @login_required
# def accept_friend_request(request, *args, **kwargs: int):
#     if request.method != 'POST':
#         return HttpResponseNotAllowed(["POST"])
#     try:
#         FriendRequest.objects.get(pk=kwargs.get('friend_request_id')).accept(request.user)
#         return md.Success200(f"friend request accepted")
#     except Exception as e:
#         return md.BadRequest400(str(e))

# @csrf_exempt
# @login_required
# def reject_friend_request(request, *args, **kwargs: int):
#     if request.method != 'POST':
#         return HttpResponseNotAllowed(["POST"])
#     try:
#         FriendRequest.objects.get(pk=kwargs.get('friend_request_id')).reject(request.user)
#         return md.Success200(f"friend request rejected")
#     except Exception as e:
#         return md.BadRequest400(str(e))

# @csrf_exempt
# @login_required
# def cancel_friend_request(request, *args, **kwargs: int):
#     if request.method != 'POST':
#         return HttpResponseNotAllowed(["POST"])
#     try:
#         FriendRequest.objects.get(pk=kwargs.get('friend_request_id')).cancel(request.user)
#         return md.Success200(f"friend request calceled")
#     except Exception as e:
#         return md.BadRequest400(str(e))

# @csrf_exempt
# @login_required
# def friend_list_view(request, *args, **kwargs: int):
#     if request.method != "GET":
#         return HttpResponseNotAllowed(["GET"])
#     try:
#         return md.Success200(f"list of friends", get_user_friend_list(request.user, kwargs.get("user_id")))
#     except Exception as e:
#         return md.BadRequest400(str(e))

# @csrf_exempt
# @login_required
# def block_list_view(request, *args, **kwargs):
#     if request.method != "GET":
#         return HttpResponseNotAllowed(["GET"])
#     try:
#         return md.Success200(f"list of blocked users", get_my_block_list(request.user))
#     except Exception as e:
#         return md.BadRequest400(str(e))

# @csrf_exempt
# @login_required
# def friend_requests_received(request, *args, **kwargs):
#     if request.method != "GET":
#         return HttpResponseNotAllowed(["GET"])
#     try:
#         account = UserAccount.objects.get(pk=kwargs.get("user_id"))
#         request_list = FriendRequest.objects.filter(receiver=account, is_active=True)
#         data = [get_friend_request_item(req) for req in request_list]
#         return md.Success200(f"list of received friend requests", data)
#     except Exception as e:
#         return md.BadRequest400(str(e))

# @csrf_exempt
# @login_required
# def friend_requests_sent(request, *args, **kwargs):
#     if request.method != "GET":
#         return HttpResponseNotAllowed(["GET"])
#     try:
#         account = UserAccount.objects.get(pk=kwargs.get("user_id"))
#         request_list = FriendRequest.objects.filter(sender=account, is_active=True)
#         data = [get_friend_request_item(req) for req in request_list]
#         return md.Success200(f"list of sent friend requests", data)
#     except Exception as e:
#         return md.BadRequest400(str(e))





