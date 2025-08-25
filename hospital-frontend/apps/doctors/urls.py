from django.urls import path
from . import views

app_name = 'doctors'

urlpatterns = [
    # Doctor management
    path('', views.DoctorListView.as_view(), name='list'),
    path('<str:doctor_id>/', views.DoctorDetailView.as_view(), name='detail'),
    path('<str:doctor_id>/availability/', views.DoctorAvailabilityView.as_view(), name='availability'),
    path('<str:doctor_id>/schedule/', views.DoctorScheduleView.as_view(), name='schedule'),
    
    # API endpoints
    path('api/search/', views.DoctorSearchAPIView.as_view(), name='search_api'),
    path('<str:doctor_id>/deactivate/', views.DoctorDeactivateView.as_view(), name='deactivate'),
]
