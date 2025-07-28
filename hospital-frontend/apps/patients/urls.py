from django.urls import path
from . import views

app_name = 'patients'

urlpatterns = [
    # Patient management
    path('', views.PatientListView.as_view(), name='list'),
    path('create/', views.PatientCreateView.as_view(), name='create'),
    path('<str:patient_id>/', views.PatientDetailView.as_view(), name='detail'),
    path('<str:patient_id>/update/', views.PatientUpdateView.as_view(), name='update'),
    path('<str:patient_id>/delete/', views.PatientDeleteView.as_view(), name='delete'),
    path('<str:patient_id>/medical-history/', views.PatientMedicalHistoryView.as_view(), name='medical_history'),

    # AJAX endpoints
    path('api/search/', views.PatientSearchView.as_view(), name='search'),
    path('api/detail/<str:patient_id>/', views.PatientDetailAPIView.as_view(), name='detail_api'),
]
