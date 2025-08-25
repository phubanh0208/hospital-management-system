from django.urls import path
from . import views

app_name = 'appointments'

urlpatterns = [
    # Main appointment views
    path('', views.AppointmentListView.as_view(), name='list'),
    path('book/', views.BookAppointmentView.as_view(), name='book'),
    path('calendar/', views.AppointmentCalendarView.as_view(), name='calendar'),

    # API endpoints
    path('api/search/', views.AppointmentSearchAPIView.as_view(), name='search_api'),

    # Appointment actions (must come before detail view)
    path('<str:appointment_id>/update-status/', views.UpdateAppointmentStatusView.as_view(), name='update_status'),
    path('<str:appointment_id>/cancel/', views.CancelAppointmentView.as_view(), name='cancel'),

    # Detail view (must come last due to catch-all pattern)
    path('<str:appointment_id>/', views.AppointmentDetailView.as_view(), name='detail'),
]
