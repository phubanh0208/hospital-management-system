from django.urls import path
from . import views

app_name = 'prescriptions'

urlpatterns = [
    # Prescription management
    path('', views.PrescriptionListView.as_view(), name='list'),
    path('select-patient/', views.PatientSelectionView.as_view(), name='patient_selection'),
    path('create/', views.PrescriptionCreateView.as_view(), name='create'),
    path('<str:prescription_id>/', views.PrescriptionDetailView.as_view(), name='detail'),
    path('<str:prescription_id>/update-status/', views.PrescriptionUpdateStatusView.as_view(), name='update_status'),
    path('<str:prescription_id>/print/', views.PrescriptionPrintView.as_view(), name='print'),

    # AJAX endpoints
    path('api/medications/search/', views.MedicationSearchView.as_view(), name='medication_search'),
]
