from django.shortcuts import render
from django.http import JsonResponse
from django.conf import settings
from user.utils import model_object_serializer
from .models import *

def public_chat_view(request):
	context = {}
	context['debug_mode'] = settings.DEBUG
	context['room_id'] = 1
	user = request.user
	room_id = context['room_id']
	chat_room = PublicChatRoom.objects.get(id=room_id)
	chat_messages = PublicChatMessage.objects.filter(room=chat_room)[:30]
	messages = []
	for chat in chat_messages:
		item = model_object_serializer(chat)
		messages.append(item)
	context['messages'] = messages
	# return JsonResponse({'success': True, 'message': messages}, status=200)
	return render(request, "chats/public-chat.html", context)
