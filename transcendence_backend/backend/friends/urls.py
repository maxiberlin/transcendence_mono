from django.urls import path
from . import views
from . import views2


# urlpatterns = [
#     path('request', views.send_friend_request, name='friend-request'),
#     path('requests/<user_id>', views.friend_requests_received, name='friend-requests'),
#     path('remove', views.remove_friend, name='friend-remove'),
#     path('requests-sent/<user_id>', views.friend_requests_sent, name='friend-requests-sent'),
#     path('request/accept/<friend_request_id>', views.accept_friend_request, name='friend-request-accept'),
#     path('request/reject/<friend_request_id>', views.reject_friend_request, name='friend-request-reject'),
#     path('request/cancel/<friend_request_id>', views.cancel_friend_request, name='friend-request-cancel'),
#     path('block/<user_id>', views.block_user, name='friend-block'),
#     path('unblock/<user_id>', views.unblock_user, name='friend-unblock'),
#     path('block-list', views.block_list_view, name='block-list'),
# ]

urlpatterns = [
    path('request', views2.send_friend_request, name='friend-request'),
    path('requests/<int:user_id>', views2.friend_requests_received, name='friend-requests'),
    path('remove', views2.remove_friend, name='friend-remove'),
    path('requests-sent/<int:user_id>', views2.friend_requests_sent, name='friend-requests-sent'),
    path('request/accept/<int:friend_request_id>', views2.accept_friend_request, name='friend-request-accept'),
    path('request/reject/<int:friend_request_id>', views2.reject_friend_request, name='friend-request-reject'),
    path('request/cancel/<int:friend_request_id>', views2.cancel_friend_request, name='friend-request-cancel'),
    path('block/<int:user_id>', views2.block_user, name='friend-block'),
    path('unblock/<int:user_id>', views2.unblock_user, name='friend-unblock'),
    path('friend-list/<int:user_id>', views2.friend_list_view, name='friend-list'),
    path('block-list', views2.block_list_view, name='block-list'),
]
