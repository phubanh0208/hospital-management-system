from django.urls import path
from . import views

app_name = 'notifications'

urlpatterns = [
    path('', views.NotificationListView.as_view(), name='list'),
    path('admin/', views.NotificationAdminView.as_view(), name='admin'),
    path('admin/process-retries/', views.ProcessRetriesView.as_view(), name='process_retries'),
    path('admin/cleanup-retries/', views.CleanupRetriesView.as_view(), name='cleanup_retries'),
    path('admin/send-test/', views.SendTestNotificationView.as_view(), name='send_test'),
    
    # API endpoints
    path('api/retry-stats/', views.retry_stats_api, name='retry_stats_api'),
    path('api/notifications/', views.notifications_api, name='notifications_api'),
    path('api/unread-count/', views.unread_count_api, name='unread_count_api'),
    path('api/<str:notification_id>/read/', views.mark_notification_read, name='mark_notification_read'),
]
