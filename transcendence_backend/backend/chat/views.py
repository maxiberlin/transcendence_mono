import json
from django.shortcuts import render
from django.http import JsonResponse
from django.conf import settings
from user.utils import *
from .models import *
from .utils import *
from friends.models import FriendList
from django.views.decorators.http import require_GET, require_POST, require_safe
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.views import View
from django.http.request import HttpRequest
from django.core.paginator import Paginator

Debug = True

# def chat_view(request):
# 	context = {}
# 	context['debug_mode'] = settings.DEBUG
# 	context['room_type'] = 'public'
# 	context['room_id'] = 1
# 	context['debug'] = Debug
# 	user = request.user
# 	room_id = context['room_id']
# 	chat_room = ChatRoom.objects.get(id=room_id)
# 	chat_messages = ChatMessage.objects.filter(room=chat_room)[:30]
# 	messages = []
# 	for chat in chat_messages:
# 		item = model_object_serializer(chat)
# 		messages.append(item)
# 	context['messages'] = messages
# 	# return JsonResponse({'success': True, 'message': messages}, status=200)
# 	return render(request, "chats/public-chat.html", context)


# @csrf_exempt
# @login_required
# @require_GET
# def chat_room_get(request, *args, **kwargs):
# 	user = request.user
# 	# friend_id = json.loads(request.body).get('user_id')
# 	friend_id = kwargs.get('user_id')
# 	print(f'---->> friend_id')
# 	try:
# 		friend = UserAccount.objects.get(pk=friend_id)
# 		friend_list = FriendList.objects.get(user=user)
# 	except Exception as e:
# 		return HttpInternalError500(message=str(e))
# 	print(f'---->> progress')
# 	if not friend_list.is_mutual_friend(friend):
# 		return HttpForbidden403(message=f'Access denied: you must be friends to chat {friend}')
# 	try:
# 		room: ChatRoom = get_private_room_or_create(user, friend)
# 		print(f'---->> got room')
# 	except Exception as e:
# 		return HttpInternalError500(message=str(e))
# 	data = {}
# 	if room.pk:
# 		data['room_id'] = room.pk
# 	return HttpSuccess200(message='', data=data)


class ChatRoomView(View):
    def get(self, request: HttpRequest):
        user = request.user
        rooms = ChatRoom.rooms.filter(users__id=user.pk, is_active=True)
        return HttpSuccess200(data=[room.get_room_data() for room in rooms])


class ChatMessageView(View):
    def get(self, request: HttpRequest):
        room_id = request.GET.get('room_id')
        pageno = request.GET.get('page')
        if not isinstance(room_id, str) or not room_id.isdigit() or not isinstance(pageno, str) or not pageno.isdigit():
            return HttpBadRequest400("invalid room_id or page")
        room_id = int(room_id)
        pageno = int(pageno)
        messages = ChatMessage.messages.by_room(room_id)
        print(f"room_id: {room_id}, MESSAGES: {messages}")
        paginator = Paginator(messages, 20)
        messagepage = paginator.get_page(pageno)
        m = [msg.get_message_data() for msg in messagepage if isinstance(msg, ChatMessage)]
        
        return HttpSuccess200(data={
            'room_id': room_id,
            'messages': m,
            'next_page': pageno + 1
        })
        
