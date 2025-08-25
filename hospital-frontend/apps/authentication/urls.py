"""
URLs for Authentication app
"""

from django.urls import path
from . import views

app_name = 'authentication'

urlpatterns = [
    path('login/', views.LoginView.as_view(), name='login'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('profile/edit/', views.ProfileEditView.as_view(), name='profile_edit'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('forgot-password/', views.ForgotPasswordView.as_view(), name='forgot_password'),
    path('reset-password/', views.ResetPasswordView.as_view(), name='reset_password'),

    # Doctor Profile API Proxy
    path('api/doctors/profile/<str:user_id>/', views.doctor_profile_detail, name='doctor_profile_detail'),
    path('api/doctors/profile/', views.doctor_profile_create, name='doctor_profile_create'),

    # Doctor My Profile API Proxy (for doctors to manage their own profile)
    path('api/doctors/my/profile/', views.doctor_my_profile, name='doctor_my_profile'),
]
