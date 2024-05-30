from django.urls import path
from . import views
from django.contrib.auth import views as auth_view

urlpatterns = [
    path('', views.homepage, name='home'),
    path('register', views.register_view, name='register'),
    path('login', views.login_view, name='login'),
    path('logout', views.logout_view, name='logout'),

    path('profile/<user_id>', views.profile_view, name='profile'),
    path('profile/<user_id>/edit', views.profile_edit_view, name='profile-edit'),
    path('check-full-profile', views.check_full_profile, name='check-full-profile'),
    path('complete-profile', views.complete_profile, name='complete-profile'),
    path('dashboard', views.dashboard_view, name='dashboard'),
    path('search-user', views.user_search_results, name='search-user'),
    path('search', views.search, name='search'),

    path('password-reset', auth_view.PasswordResetView.as_view(), name='password-reset'),
    path('reset/<uidb64>/<token>', auth_view.PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('password-reset/done/', auth_view.PasswordResetDoneView.as_view(), name='password-reset-done'),
    path('reset/done', auth_view.PasswordResetCompleteView.as_view(), name='password-reset-complete'),
    path('password-change', auth_view.PasswordChangeView.as_view(), name='password-change'),
    path('password-change-done', auth_view.PasswordChangeDoneView.as_view(), name='password-change-done'),

]