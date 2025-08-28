from django.shortcuts import render, redirect
from django.views import View
from django.contrib import messages
from django.http import JsonResponse
from django.core.paginator import Paginator
from utils.decorators import (
    login_required,
    role_required
)
from django.utils.decorators import method_decorator
from utils.api_client import api_client
import json
import logging

logger = logging.getLogger(__name__)

@method_decorator(login_required, name='dispatch')
@method_decorator(role_required(['admin', 'staff', 'doctor']), name='dispatch')  # Patients không xem patients list
class PatientListView(View):
    """Patient list view with search and pagination"""

    def get(self, request):
        token = request.session.get('access_token')
        if not token:
            messages.error(request, 'Please login to access patients')
            return redirect('authentication:login')

        # Get query parameters
        page = int(request.GET.get('page', 1))
        search = request.GET.get('search', '').strip()
        sort_by = request.GET.get('sort_by', 'fullName')
        sort_order = request.GET.get('sort_order', 'asc')
        limit = 10

        try:
            # Get patients from API
            response = api_client.get_patients(
                token=token,
                page=page,
                limit=limit,
                search=search if search else None,
                sort_by=sort_by,
                sort_order=sort_order
            )

            if response.get('success'):
                patients_data = response.get('data', {})
                patients = patients_data.get('patients', [])
                pagination = patients_data.get('pagination', {})

                context = {
                    'patients': patients,
                    'pagination': pagination,
                    'search': search,
                    'sort_by': sort_by,
                    'sort_order': sort_order,
                    'current_page': page,
                }

                return render(request, 'patients/list.html', context)
            else:
                messages.error(request, f"Failed to load patients: {response.get('message', 'Unknown error')}")
                return render(request, 'patients/list.html', {'patients': [], 'pagination': {}})

        except Exception as e:
            logger.error(f"Error loading patients: {str(e)}")
            messages.error(request, 'Failed to load patients. Please try again.')
            return render(request, 'patients/list.html', {'patients': [], 'pagination': {}})

@method_decorator(login_required, name='dispatch')
class PatientDetailView(View):
    """Patient detail view"""

    def get(self, request, patient_id):
        token = request.session.get('access_token')
        if not token:
            messages.error(request, 'Please login to access patient details')
            return redirect('authentication:login')

        try:
            # Debug token information
            logger.info(f"Loading patient {patient_id} with token: {token[:20] if token else 'None'}...")
            
            # Get patient details
            response = api_client.get_patient(token=token, patient_id=patient_id)
            logger.info(f"Patient API response success: {response.get('success')}")

            if response.get('success'):
                patient = response.get('data')
                logger.info(f"Patient data loaded: {patient.get('fullName')}, DOB: {patient.get('dateOfBirth')}")

                # Get medical history
                history_response = api_client.get_patient_medical_history(token=token, patient_id=patient_id)
                medical_history = history_response.get('data', []) if history_response.get('success') else []
                logger.info(f"Medical history loaded: {len(medical_history) if medical_history else 0} records")

                # Get visit summary
                summary_response = api_client.get_patient_visit_summary(token=token, patient_id=patient_id)
                visit_summary = summary_response.get('data', {}) if summary_response.get('success') else {}
                logger.info(f"Visit summary loaded - Appointments: {visit_summary.get('totalAppointments', 'N/A')}, Prescriptions: {visit_summary.get('activePrescriptions', 'N/A')}")
                
                # Ensure visit_summary has default values if API failed
                if not visit_summary:
                    visit_summary = {
                        'totalAppointments': 0,
                        'activePrescriptions': 0
                    }
                    logger.warning(f"Visit summary API failed, using defaults: {visit_summary}")

                context = {
                    'patient': patient,
                    'medical_history': medical_history,
                    'visit_summary': visit_summary,
                }

                return render(request, 'patients/detail.html', context)
            else:
                error_message = response.get('message', 'Unknown error')
                logger.error(f"Patient API failed: {error_message}")
                messages.error(request, f"Patient not found: {error_message}")
                return redirect('patients:list')

        except Exception as e:
            logger.error(f"Error loading patient {patient_id}: {str(e)}")
            messages.error(request, 'Failed to load patient details. Please try again.')
            return redirect('patients:list')

@method_decorator(login_required, name='dispatch')
@method_decorator(role_required(['admin', 'staff', 'doctor']), name='dispatch')  # Chỉ admin/staff/doctor tạo patient
class PatientCreateView(View):
    """Patient create view"""

    def get(self, request):
        return render(request, 'patients/create.html')

    def post(self, request):
        token = request.session.get('access_token')
        user_id = request.session.get('user_id')

        if not token or not user_id:
            messages.error(request, 'Please login to create patients')
            return redirect('authentication:login')

        try:
            # Extract form data
            patient_data = {
                'fullName': request.POST.get('fullName', '').strip(),
                'dateOfBirth': request.POST.get('dateOfBirth'),
                'gender': request.POST.get('gender'),
                'phone': request.POST.get('phone', '').strip(),
                'email': request.POST.get('email', '').strip() or None,
                'address': {
                    'street': request.POST.get('street', '').strip(),
                    'ward': request.POST.get('ward', '').strip(),
                    'district': request.POST.get('district', '').strip(),
                    'city': request.POST.get('city', '').strip(),
                    'zipCode': request.POST.get('zipCode', '').strip() or None,
                },
                'bloodType': request.POST.get('bloodType') or None,
                'allergies': request.POST.get('allergies', '').strip() or None,
                'medicalHistory': request.POST.get('medicalHistory', '').strip() or None,
                'emergencyContact': {
                    'name': request.POST.get('emergencyName', '').strip(),
                    'phone': request.POST.get('emergencyPhone', '').strip(),
                    'relationship': request.POST.get('emergencyRelationship', '').strip(),
                    'address': request.POST.get('emergencyAddress', '').strip() or None,
                },
                'createdByUserId': user_id,
            }

            # Determine if we should create an Auth account and unify IDs
            create_account = request.POST.get('createAccount') == 'on'
            account_created = False
            username = request.POST.get('username', '').strip() if create_account else ''

            if create_account:
                try:
                    password = request.POST.get('password', '').strip()
                    send_credentials = request.POST.get('sendCredentials') == 'on'

                    # Split full name into first and last name for profile
                    name_parts = patient_data['fullName'].split(' ', 1)
                    first_name = name_parts[0] if name_parts else ''
                    last_name = name_parts[1] if len(name_parts) > 1 else ''

                    if username and password and patient_data.get('email'):
                        account_data = {
                            'username': username,
                            'email': patient_data['email'],
                            'password': password,
                            'role': 'patient',
                            'profile': {
                                'firstName': first_name,
                                'lastName': last_name,
                                'phone': patient_data.get('phone', ''),
                                'dateOfBirth': patient_data.get('dateOfBirth'),
                                'address': f"{patient_data['address']['street']}, {patient_data['address']['ward']}, {patient_data['address']['district']}, {patient_data['address']['city']}",
                                'avatarUrl': ''
                            }
                        }

                        # 1) Create Auth user first to get user ID
                        account_response = api_client.register(account_data)
                        if not account_response.get('success'):
                            logger.error(f"Failed to create account for patient: {account_response.get('message')}")
                            messages.error(request, f"Failed to create account: {account_response.get('message')}")
                            return render(request, 'patients/create.html', {'form_data': request.POST})

                        account_created = True
                        logger.info(f"Account created for patient {patient_data['fullName']} with username {username}")

                        # Extract created user ID from response
                        account_data_resp = account_response.get('data', {}) or {}
                        new_user_id = account_data_resp.get('id') or account_data_resp.get('user', {}).get('id')
                        if not new_user_id:
                            # As a fallback, try to login and read user id (not ideal, but safe)
                            logger.warning('Account response missing user id; cannot unify IDs without it')
                        else:
                            # 2) Create patient with the SAME ID as Auth user
                            patient_data_with_id = dict(patient_data)
                            patient_data_with_id['id'] = new_user_id
                            response = api_client.create_patient(token=token, patient_data=patient_data_with_id)

                            if response.get('success'):
                                patient = response.get('data')
                                patient_name = patient.get('fullName')
                                patient_code = patient.get('patientCode')

                                if send_credentials:
                                    logger.info(f"Should send credentials to {patient_data['email']} (not implemented yet)")

                                messages.success(request, f"Patient {patient_name} created successfully with code {patient_code}. Login account also created with username '{username}'.")
                                return redirect('patients:detail', patient_id=patient.get('id'))
                            else:
                                # If patient creation fails, report error (optionally rollback account)
                                error_msg = response.get('message', 'Unknown error')
                                errors = response.get('errors', [])
                                if errors:
                                    error_msg += ': ' + ', '.join(errors)
                                messages.error(request, f"Failed to create patient with unified ID: {error_msg}")
                                return render(request, 'patients/create.html', {'form_data': request.POST})
                    else:
                        messages.error(request, "Username, password and email are required to create an account")
                        return render(request, 'patients/create.html', {'form_data': request.POST})

                except Exception as e:
                    logger.error(f"Error creating account/patient with unified ID: {str(e)}")
                    messages.error(request, "Failed to create account/patient. Please try again.")
                    return render(request, 'patients/create.html', {'form_data': request.POST})

            # Fallback: create patient only (no account)
            response = api_client.create_patient(token=token, patient_data=patient_data)

            if response.get('success'):
                patient = response.get('data')
                patient_name = patient.get('fullName')
                patient_code = patient.get('patientCode')
                messages.success(request, f"Patient {patient_name} created successfully with code {patient_code}")
                return redirect('patients:detail', patient_id=patient.get('id'))
            else:
                error_msg = response.get('message', 'Unknown error')
                errors = response.get('errors', [])
                if errors:
                    error_msg += ': ' + ', '.join(errors)
                messages.error(request, f"Failed to create patient: {error_msg}")
                return render(request, 'patients/create.html', {'form_data': request.POST})

        except Exception as e:
            logger.error(f"Error creating patient: {str(e)}")
            messages.error(request, 'Failed to create patient. Please try again.')
            return render(request, 'patients/create.html', {'form_data': request.POST})

@method_decorator(login_required, name='dispatch')
class PatientUpdateView(View):
    """Patient update view"""

    def get(self, request, patient_id):
        token = request.session.get('access_token')
        if not token:
            messages.error(request, 'Please login to update patients')
            return redirect('authentication:login')

        try:
            # Get patient details for form
            response = api_client.get_patient(token=token, patient_id=patient_id)

            if response.get('success'):
                patient = response.get('data')
                return render(request, 'patients/update.html', {'patient': patient})
            else:
                messages.error(request, f"Patient not found: {response.get('message', 'Unknown error')}")
                return redirect('patients:list')

        except Exception as e:
            logger.error(f"Error loading patient for update {patient_id}: {str(e)}")
            messages.error(request, 'Failed to load patient. Please try again.')
            return redirect('patients:list')

    def post(self, request, patient_id):
        token = request.session.get('access_token')

        if not token:
            messages.error(request, 'Please login to update patients')
            return redirect('authentication:login')

        try:
            # Extract form data (only include fields that are provided)
            patient_data = {}

            if request.POST.get('fullName', '').strip():
                patient_data['fullName'] = request.POST.get('fullName').strip()

            if request.POST.get('dateOfBirth'):
                patient_data['dateOfBirth'] = request.POST.get('dateOfBirth')

            if request.POST.get('gender'):
                patient_data['gender'] = request.POST.get('gender')

            if request.POST.get('phone', '').strip():
                patient_data['phone'] = request.POST.get('phone').strip()

            if request.POST.get('email', '').strip():
                patient_data['email'] = request.POST.get('email').strip()

            # Address (only if any field is provided)
            address_fields = ['street', 'ward', 'district', 'city', 'zipCode']
            address_data = {}
            for field in address_fields:
                value = request.POST.get(field, '').strip()
                if value:
                    address_data[field] = value

            if address_data:
                patient_data['address'] = address_data

            if request.POST.get('bloodType'):
                patient_data['bloodType'] = request.POST.get('bloodType')

            if request.POST.get('allergies', '').strip():
                patient_data['allergies'] = request.POST.get('allergies').strip()

            if request.POST.get('medicalHistory', '').strip():
                patient_data['medicalHistory'] = request.POST.get('medicalHistory').strip()

            # Emergency contact (only if any field is provided)
            emergency_fields = ['emergencyName', 'emergencyPhone', 'emergencyRelationship', 'emergencyAddress']
            emergency_data = {}
            for field in emergency_fields:
                value = request.POST.get(field, '').strip()
                if value:
                    key = field.replace('emergency', '').lower()
                    if key == 'name':
                        key = 'name'
                    elif key == 'phone':
                        key = 'phone'
                    elif key == 'relationship':
                        key = 'relationship'
                    elif key == 'address':
                        key = 'address'
                    emergency_data[key] = value

            if emergency_data:
                patient_data['emergencyContact'] = emergency_data

            # Update patient
            response = api_client.update_patient(token=token, patient_id=patient_id, patient_data=patient_data)

            if response.get('success'):
                patient = response.get('data')
                messages.success(request, f"Patient {patient.get('fullName')} updated successfully")
                return redirect('patients:detail', patient_id=patient_id)
            else:
                error_msg = response.get('message', 'Unknown error')
                errors = response.get('errors', [])
                if errors:
                    error_msg += ': ' + ', '.join(errors)
                messages.error(request, f"Failed to update patient: {error_msg}")

                # Get patient data again for form
                patient_response = api_client.get_patient(token=token, patient_id=patient_id)
                patient = patient_response.get('data') if patient_response.get('success') else {}
                return render(request, 'patients/update.html', {'patient': patient, 'form_data': request.POST})

        except Exception as e:
            logger.error(f"Error updating patient {patient_id}: {str(e)}")
            messages.error(request, 'Failed to update patient. Please try again.')
            return redirect('patients:detail', patient_id=patient_id)

@method_decorator(login_required, name='dispatch')
class PatientDeleteView(View):
    """Patient delete view (soft delete)"""

    def post(self, request, patient_id):
        token = request.session.get('access_token')
        user_role = request.session.get('user_role')

        if not token:
            return JsonResponse({'success': False, 'message': 'Authentication required'})

        # Check if user is admin
        if user_role != 'admin':
            return JsonResponse({'success': False, 'message': 'Only administrators can delete patients'})

        try:
            # Delete patient (soft delete)
            response = api_client.delete_patient(token=token, patient_id=patient_id)

            if response.get('success'):
                return JsonResponse({'success': True, 'message': 'Patient deleted successfully'})
            else:
                return JsonResponse({'success': False, 'message': response.get('message', 'Failed to delete patient')})

        except Exception as e:
            logger.error(f"Error deleting patient {patient_id}: {str(e)}")
            return JsonResponse({'success': False, 'message': 'Failed to delete patient. Please try again.'})


@method_decorator(login_required, name='dispatch')
class PatientDetailAPIView(View):
    """AJAX patient detail API view"""

    def get(self, request, patient_id):
        token = request.session.get('access_token')

        if not token:
            return JsonResponse({'success': False, 'message': 'Authentication required'})

        try:
            # Get patient details
            response = api_client.get_patient(token=token, patient_id=patient_id)

            if response.get('success'):
                patient = response.get('data')
                return JsonResponse({'success': True, 'data': patient})
            else:
                return JsonResponse({'success': False, 'message': response.get('message', 'Patient not found')})

        except Exception as e:
            logger.error(f"Error getting patient {patient_id}: {str(e)}")
            return JsonResponse({'success': False, 'message': 'Failed to get patient details. Please try again.'})

@method_decorator(login_required, name='dispatch')
class PatientSearchView(View):
    """AJAX patient search view"""

    def get(self, request):
        token = request.session.get('access_token')

        if not token:
            return JsonResponse({'success': False, 'message': 'Authentication required'})

        search = request.GET.get('q', '').strip()
        limit = int(request.GET.get('limit', 5))

        if not search:
            return JsonResponse({'success': True, 'data': []})

        try:
            response = api_client.get_patients(
                token=token,
                page=1,
                limit=limit,
                search=search
            )

            if response.get('success'):
                patients = response.get('data', {}).get('patients', [])
                # Return simplified patient data for search results
                search_results = []
                for patient in patients:
                    search_results.append({
                        'id': patient.get('id'),
                        'patientCode': patient.get('patientCode'),
                        'fullName': patient.get('fullName'),
                        'phone': patient.get('phone'),
                        'email': patient.get('email'),
                        'dateOfBirth': patient.get('dateOfBirth'),
                    })

                return JsonResponse({'success': True, 'data': search_results})
            else:
                return JsonResponse({'success': False, 'message': response.get('message', 'Search failed')})

        except Exception as e:
            logger.error(f"Error searching patients: {str(e)}")
            return JsonResponse({'success': False, 'message': 'Search failed. Please try again.'})

@method_decorator(login_required, name='dispatch')
class PatientMedicalHistoryView(View):
    """Patient medical history management view"""

    def post(self, request, patient_id):
        token = request.session.get('access_token')

        if not token:
            return JsonResponse({'success': False, 'message': 'Authentication required'})

        try:
            import json
            data = json.loads(request.body)

            # Add medical history entry
            response = api_client.add_patient_medical_history(
                token=token,
                patient_id=patient_id,
                history_data=data
            )

            if response.get('success'):
                return JsonResponse({'success': True, 'message': 'Medical history added successfully'})
            else:
                return JsonResponse({'success': False, 'message': response.get('message', 'Failed to add medical history')})

        except Exception as e:
            logger.error(f"Error adding medical history for patient {patient_id}: {str(e)}")
            return JsonResponse({'success': False, 'message': 'Failed to add medical history. Please try again.'})
