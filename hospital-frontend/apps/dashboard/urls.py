"""
URLs for Dashboard app
"""

from django.urls import path
from . import views, test_views

app_name = 'dashboard'

urlpatterns = [
    path('', views.DashboardView.as_view(), name='index'),
    path('test-api/', test_views.APITestView.as_view(), name='test_api'),
]
