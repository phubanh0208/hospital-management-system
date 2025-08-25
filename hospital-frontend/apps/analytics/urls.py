from django.urls import path
from . import views

app_name = 'analytics'

urlpatterns = [
    # General analytics dashboard
    path('dashboard/', views.AnalyticsDashboardView.as_view(), name='dashboard'),

    # Doctor-specific analytics
    path('doctor/', views.DoctorAnalyticsView.as_view(), name='doctor_dashboard'),
    path('doctor/<str:doctor_id>/', views.DoctorAnalyticsView.as_view(), name='doctor_dashboard_detail'),

    # Admin-specific analytics
    path('admin/', views.AdminAnalyticsView.as_view(), name='admin_dashboard'),

    # API endpoints for AJAX requests
    path('api/', views.AnalyticsAPIView.as_view(), name='api'),
]
