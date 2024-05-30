from django.urls import path
from . import views

urlpatterns = [
    path('request', views.send_friend_request, name='friend-request'),
    path('requests/<user_id>', views.friend_requests_received, name='friend-requests'),
    path('remove', views.friend_requests_received, name='friend-remove'),
    path('requests-sent/<user_id>', views.friend_requests_sent, name='friend-requests-sent'),
    path('request/accept/<friend_request_id>', views.accept_friend_request, name='friend-request-accept'),
    path('request/reject/<friend_request_id>', views.reject_friend_request, name='friend-request-reject'),
    path('request/cancel/<friend_request_id>', views.cancel_friend_request, name='friend-request-cancel'),
    path('block/<user_id>', views.block_user, name='friend-block'),
    path('unblock/<user_id>', views.unblock_user, name='friend-unblock'),
    path('block-list', views.block_list_view, name='block-list'),
]