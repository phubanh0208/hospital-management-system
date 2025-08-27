from django.urls import path
from . import views

app_name = 'users'

urlpatterns = [
    # User list and search
    path('', views.UserListView.as_view(), name='list'),
    path('search/', views.UserSearchView.as_view(), name='search'),
    path('analytics/', views.UserAnalyticsView.as_view(), name='analytics'),
    
    # User CRUD operations
    path('create/', views.UserCreateView.as_view(), name='create'),
    path('<str:user_id>/', views.UserDetailView.as_view(), name='detail'),
    path('<str:user_id>/delete/', views.UserDeleteView.as_view(), name='delete'),
    
    # User status management
    path('<str:user_id>/status/', views.UserStatusToggleView.as_view(), name='status_toggle'),
]
