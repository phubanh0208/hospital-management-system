from django.shortcuts import render, redirect
from django.views import View
from django.views.generic import TemplateView
from django.utils.decorators import method_decorator
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.core.paginator import Paginator
from utils.decorators import (
    login_required,
    role_required,
    doctor_own_data_required,
    patient_own_data_required,
    read_only_for_role
)
from utils.api_client import APIClient
import logging
import json
from datetime import datetime, timedelta, date
import re

logger = logging.getLogger(__name__)

def calculate_age(birth_date):
    """Calculate age from birth date string"""
    if not birth_date:
        return None

    try:
        # Handle different date formats
        if isinstance(birth_date, str):
            # Try ISO format first (YYYY-MM-DD)
            if re.match(r'\d{4}-\d{2}-\d{2}', birth_date):
                birth_date = datetime.strptime(birth_date[:10], '%Y-%m-%d').date()
            # Try DD/MM/YYYY format
            elif re.match(r'\d{2}/\d{2}/\d{4}', birth_date):
                birth_date = datetime.strptime(birth_date, '%d/%m/%Y').date()
            # Try MM/DD/YYYY format
            elif re.match(r'\d{2}/\d{2}/\d{4}', birth_date):
                birth_date = datetime.strptime(birth_date, '%m/%d/%Y').date()
            else:
                return None
        elif isinstance(birth_date, datetime):
            birth_date = birth_date.date()
        elif not isinstance(birth_date, date):
            return None

        today = date.today()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        return age
    except (ValueError, TypeError):
        return None

def get_patient_age(patient):
    """Get patient age from patient object"""
    if not patient:
        return None

    # Try direct age field first
    if isinstance(patient, dict):
        if 'age' in patient and patient['age']:
            return patient['age']
        if 'dateOfBirth' in patient and patient['dateOfBirth']:
            return calculate_age(patient['dateOfBirth'])
        if 'date_of_birth' in patient and patient['date_of_birth']:
            return calculate_age(patient['date_of_birth'])

    return None

@method_decorator(login_required, name='dispatch')
@method_decorator(role_required(['admin', 'staff', 'doctor', 'patient']), name='dispatch')
@method_decorator(doctor_own_data_required, name='dispatch')
@method_decorator(patient_own_data_required, name='dispatch')
@method_decorator(read_only_for_role(['staff', 'patient']), name='dispatch')  # Staff và Patient read-only
class PrescriptionListView(View):
    """List all prescriptions with filtering and pagination"""

    def get(self, request):
        try:
            api_client = APIClient()

            # Get query parameters
            page = request.GET.get('page', 1)
            limit = int(request.GET.get('limit', 10))
            search = request.GET.get('search', '')
            status = request.GET.get('status', '')
            doctor_id = request.GET.get('doctor_id', '')
            patient_id = request.GET.get('patient_id', '')
            date_from = request.GET.get('date_from', '')
            date_to = request.GET.get('date_to', '')

            # Build query parameters
            params = {
                'page': page,
                'limit': limit,
                'search': search,
                'status': status,
                'doctorId': doctor_id,
                'patientId': patient_id,
                'dateFrom': date_from,
                'dateTo': date_to,
                'sortBy': 'issued_date',
                'sortOrder': 'desc'
            }

            # Remove empty parameters
            params = {k: v for k, v in params.items() if v}

            # Get prescriptions from API
            token = request.session.get('access_token')
            prescriptions_response = api_client.get_prescriptions(token, **params)

            if prescriptions_response.get('success'):
                prescriptions_data = prescriptions_response.get('data', {})
                prescriptions = prescriptions_data.get('prescriptions', [])
                pagination = prescriptions_data.get('pagination', {})

                logger.info(f"Found {len(prescriptions)} prescriptions")

                # Debug: Log first prescription structure
                if prescriptions:
                    logger.info(f"First prescription structure: {prescriptions[0]}")
                    logger.info(f"First prescription keys: {list(prescriptions[0].keys())}")

                # Get prescription items for each prescription (since list API doesn't include items)
                logger.info("Fetching prescription items for each prescription...")
                for prescription in prescriptions:
                    try:
                        prescription_detail_response = api_client._make_request('GET', f'/api/prescriptions/{prescription["id"]}', token=token)
                        if prescription_detail_response.get('success'):
                            prescription_detail = prescription_detail_response.get('data', {})
                            prescription['items'] = prescription_detail.get('items', [])
                            logger.info(f"Loaded {len(prescription['items'])} items for prescription {prescription.get('prescription_number')}")
                        else:
                            prescription['items'] = []
                            logger.warning(f"Failed to load items for prescription {prescription.get('prescription_number')}")
                    except Exception as e:
                        logger.error(f"Error loading items for prescription {prescription.get('prescription_number')}: {e}")
                        prescription['items'] = []

                # Enrich medication names for prescriptions that have codes instead of names
                try:
                    logger.info("Starting medication enrichment for prescription list...")
                    medications_response = api_client._make_request('GET', '/api/medications', token=token)
                    if medications_response.get('success'):
                        medications = medications_response.get('data', {}).get('medications', [])
                        medication_map = {med.get('medication_code'): med.get('medication_name') for med in medications}
                        logger.info(f"Built medication map with {len(medication_map)} entries")

                        for prescription in prescriptions:
                            if prescription.get('items'):
                                logger.info(f"Processing prescription {prescription.get('prescription_number')} with {len(prescription['items'])} items")
                                for item in prescription['items']:
                                    original_name = item.get('medication_name')
                                    if original_name and original_name.startswith('MED'):
                                        # This looks like a medication code, replace with actual name
                                        actual_name = medication_map.get(original_name)
                                        if actual_name:
                                            logger.info(f"Enriching medication: {original_name} -> {actual_name}")
                                            item['medication_name'] = actual_name
                                        else:
                                            logger.warning(f"No mapping found for medication code: {original_name}")
                            else:
                                logger.warning(f"Prescription {prescription.get('prescription_number')} has no items")
                    else:
                        logger.error(f"Failed to get medications: {medications_response}")
                except Exception as e:
                    logger.error(f"Error enriching medication data in list: {e}")
            else:
                prescriptions = []
                pagination = {}
                messages.error(request, 'Failed to load prescriptions')
                logger.error(f"Failed to get prescriptions: {prescriptions_response.get('message')}")

            # Get filter options
            try:
                # Skip doctors filter for now (requires admin permission)
                doctors = []

                # Get patients for filter
                patients_response = api_client.get_patients(token)
                patients = patients_response.get('data', {}).get('patients', []) if patients_response.get('success') else []
            except Exception as e:
                logger.error(f"Error loading filter options: {e}")
                doctors = []
                patients = []

            total_pages = pagination.get('totalPages', 1)
            page_range = range(1, total_pages + 1)

            context = {
                'prescriptions': prescriptions,
                'pagination': pagination,
                'doctors': doctors,
                'patients': patients,
                'current_filters': {
                    'search': search,
                    'status': status,
                    'doctor_id': doctor_id,
                    'patient_id': patient_id,
                    'date_from': date_from,
                    'date_to': date_to,
                    'limit': limit,
                },
                'limit': limit,
                'status_choices': [
                    ('', 'All Status'),
                    ('draft', 'Draft'),
                    ('active', 'Active'),
                    ('dispensed', 'Dispensed'),
                    ('completed', 'Completed'),
                    ('cancelled', 'Cancelled'),
                    ('expired', 'Expired'),
                ],
                'page_range': page_range,
            }

            return render(request, 'prescriptions/list.html', context)

        except Exception as e:
            logger.error(f"Error in prescription list view: {e}")
            messages.error(request, 'An error occurred while loading prescriptions')
            return render(request, 'prescriptions/list.html', {
                'prescriptions': [],
                'pagination': {},
                'doctors': [],
                'patients': [],
                'current_filters': {},
                'status_choices': []
            })


@method_decorator(login_required, name='dispatch')
class PrescriptionDetailView(View):
    """View prescription details"""

    def get(self, request, prescription_id):
        try:
            api_client = APIClient()
            token = request.session.get('access_token')

            # Get prescription details
            prescription_response = api_client._make_request('GET', f'/api/prescriptions/{prescription_id}', token=token)

            if prescription_response.get('success'):
                prescription = prescription_response.get('data')
                logger.info(f"Loaded prescription {prescription_id}")
                logger.info(f"Prescription data structure: {prescription}")

                # Debug prescription items and enrich medication data
                if prescription and 'items' in prescription:
                    logger.info(f"Prescription items: {prescription['items']}")

                    # Enrich medication names for items that have codes instead of names
                    for item in prescription['items']:
                        if item.get('medication_name') and item['medication_name'].startswith('MED'):
                            # This looks like a medication code, try to get the actual name
                            try:
                                medications_response = api_client._make_request('GET', '/api/medications', token=token)
                                if medications_response.get('success'):
                                    medications = medications_response.get('data', {}).get('medications', [])
                                    for med in medications:
                                        if med.get('medication_code') == item['medication_name']:
                                            item['medication_name'] = med.get('medication_name', item['medication_name'])
                                            item['medication_code'] = med.get('medication_code', '')
                                            break
                            except Exception as e:
                                logger.error(f"Error enriching medication data: {e}")
                                # Keep original data if enrichment fails
            else:
                messages.error(request, 'Prescription not found')
                return redirect('prescriptions:list')

            context = {
                'prescription': prescription,
            }

            return render(request, 'prescriptions/detail.html', context)

        except Exception as e:
            logger.error(f"Error loading prescription {prescription_id}: {e}")
            messages.error(request, 'An error occurred while loading prescription')
            return redirect('prescriptions:list')


@method_decorator(login_required, name='dispatch')
@method_decorator(role_required(['admin', 'doctor']), name='dispatch')  # Chỉ admin và doctor
class PrescriptionCreateView(View):
    """Create new prescription"""

    def get(self, request):
        try:
            api_client = APIClient()
            token = request.session.get('access_token')

            # Check if patient_id is provided
            patient_id = request.GET.get('patient_id')
            if not patient_id:
                # Redirect to patient selection if no patient selected
                return redirect('prescriptions:patient_selection')

            # Get selected patient data
            patient_response = api_client._make_request('GET', f'/api/patients/{patient_id}', token=token)
            if not patient_response.get('success'):
                messages.error(request, 'Selected patient not found.')
                return redirect('prescriptions:patient_selection')

            selected_patient = patient_response.get('data')

            # Calculate age for selected patient
            if selected_patient:
                calculated_age = get_patient_age(selected_patient)
                if calculated_age:
                    selected_patient['calculated_age'] = calculated_age

            # Get current doctor information from API using doctor ID
            doctor_id = request.session.get('user_id')
            doctor_info = {
                'id': doctor_id,
                'name': request.session.get('username'),  # fallback
                'email': request.session.get('user_email', ''),
                'username': request.session.get('username'),
            }

            # Try to get full doctor info from profile API
            if doctor_id:
                try:
                    profile_response = api_client.get_profile(token)
                    if profile_response.get('success'):
                        profile_data = profile_response.get('data')
                        if profile_data:
                            # Debug: log profile data structure
                            logger.info(f"Profile data structure: {profile_data}")

                            # Extract profile nested object
                            profile_nested = profile_data.get('profile', {})

                            # Get firstName and lastName from nested profile object
                            first_name = (profile_nested.get('firstName', '') or
                                        profile_nested.get('first_name', '') or
                                        profile_data.get('firstName', '') or
                                        profile_data.get('first_name', ''))

                            last_name = (profile_nested.get('lastName', '') or
                                       profile_nested.get('last_name', '') or
                                       profile_data.get('lastName', '') or
                                       profile_data.get('last_name', ''))

                            full_name = f"{first_name} {last_name}".strip()

                            doctor_info.update({
                                'name': full_name if full_name else profile_data.get('username', doctor_info['name']),
                                'email': profile_data.get('email', doctor_info['email']),
                                'specialization': profile_nested.get('specialization', '') or profile_data.get('specialization', ''),
                                'phone': profile_nested.get('phone', '') or profile_data.get('phone', ''),
                                'firstName': first_name,
                                'lastName': last_name,
                            })
                            logger.info(f"Doctor info updated from profile API: {doctor_info}")
                    else:
                        logger.warning(f"Failed to get profile info from API: {profile_response.get('message')}")
                except Exception as e:
                    logger.error(f"Error getting profile info from API: {str(e)}")
            else:
                logger.warning("No doctor ID found in session")

            # Get medications for form
            medications_response = api_client.get_medications(token)
            medications = medications_response.get('data', {}).get('medications', []) if medications_response.get('success') else []

            # Get appointment ID if provided
            appointment_id = request.GET.get('appointment_id')
            appointment = None

            if appointment_id:
                appointment_response = api_client._make_request('GET', f'/api/appointments/{appointment_id}', token=token)
                if appointment_response.get('success'):
                    appointment = appointment_response.get('data')

            context = {
                'selected_patient': selected_patient,
                'doctor_info': doctor_info,
                'medications': medications,
                'appointment': appointment,
                'appointment_id': appointment_id,
                'patient_id': patient_id,
            }

            return render(request, 'prescriptions/create.html', context)

        except Exception as e:
            logger.error(f"Error loading prescription create form: {e}")
            messages.error(request, 'An error occurred while loading the form')
            return redirect('prescriptions:list')

    def post(self, request):
        try:
            api_client = APIClient()
            token = request.session.get('access_token')

            # Get form data
            patient_id = request.POST.get('patient_id')
            if not patient_id:
                messages.error(request, 'Patient information is missing.')
                return redirect('prescriptions:patient_selection')

            # Get doctor name from session or API
            doctor_name = request.session.get('username')  # fallback
            try:
                profile_response = api_client.get_profile(token)
                if profile_response.get('success'):
                    profile_data = profile_response.get('data', {})
                    profile_nested = profile_data.get('profile', {})
                    first_name = profile_nested.get('firstName', '')
                    last_name = profile_nested.get('lastName', '')
                    full_name = f"{first_name} {last_name}".strip()
                    if full_name:
                        doctor_name = full_name
            except Exception as e:
                logger.error(f"Error getting doctor name for prescription: {e}")

            # Parse patient age to integer
            patient_age_str = request.POST.get('patient_age', '')
            patient_age = None
            if patient_age_str:
                try:
                    # Extract number from "25 years" or "25"
                    import re
                    age_match = re.search(r'\d+', patient_age_str)
                    if age_match:
                        patient_age = int(age_match.group())
                except (ValueError, AttributeError):
                    logger.warning(f"Could not parse patient age: {patient_age_str}")

            prescription_data = {
                'patientId': patient_id,
                'patientName': request.POST.get('patient_name'),
                'patientAge': patient_age,
                'patientAllergies': request.POST.get('patient_allergies'),
                'doctorId': request.session.get('user_id'),
                'doctorName': doctor_name,
                'appointmentId': request.POST.get('appointment_id') or None,
                'diagnosis': request.POST.get('diagnosis'),
                'instructions': request.POST.get('instructions'),
                'notes': request.POST.get('notes'),
                'validUntil': request.POST.get('valid_until'),
                'items': []
            }

            # Get prescription items
            medication_names = request.POST.getlist('medication_name[]')
            medication_codes = request.POST.getlist('medication_code[]')
            dosages = request.POST.getlist('dosage[]')
            frequencies = request.POST.getlist('frequency[]')
            durations = request.POST.getlist('duration[]')
            quantities = request.POST.getlist('quantity[]')
            units = request.POST.getlist('unit[]')
            unit_prices = request.POST.getlist('unit_price[]')
            instructions_list = request.POST.getlist('item_instructions[]')

            for i in range(len(medication_names)):
                if medication_names[i]:  # Only add non-empty items
                    # Parse unit price
                    unit_price = 0
                    if i < len(unit_prices) and unit_prices[i]:
                        try:
                            unit_price = float(unit_prices[i])
                        except (ValueError, TypeError):
                            unit_price = 0

                    # Parse quantity
                    quantity = 1
                    if i < len(quantities) and quantities[i]:
                        try:
                            quantity = int(quantities[i])
                        except (ValueError, TypeError):
                            quantity = 1

                    item = {
                        'medicationName': medication_names[i],
                        'medicationCode': medication_codes[i] if i < len(medication_codes) else '',
                        'dosage': dosages[i] if i < len(dosages) else '',
                        'frequency': frequencies[i] if i < len(frequencies) else '',
                        'duration': durations[i] if i < len(durations) else '',
                        'quantity': quantity,
                        'unit': units[i] if i < len(units) else 'viên',
                        'unitPrice': unit_price,
                        'instructions': instructions_list[i] if i < len(instructions_list) else '',
                    }
                    prescription_data['items'].append(item)

            # Validate required fields
            if not prescription_data['patientId']:
                messages.error(request, 'Patient is required')
                return redirect('prescriptions:patient_selection')

            if not prescription_data['diagnosis']:
                messages.error(request, 'Diagnosis is required')
                return redirect(f'prescriptions:create?patient_id={patient_id}')

            if not prescription_data['items']:
                messages.error(request, 'At least one medication is required')
                return redirect(f'prescriptions:create?patient_id={patient_id}')

            # Create prescription
            response = api_client.create_prescription(token, prescription_data)

            if response.get('success'):
                prescription = response.get('data')
                if prescription:
                    messages.success(request, f'Prescription {prescription.get("prescription_number")} created successfully')
                    return redirect('prescriptions:detail', prescription_id=prescription.get('id'))
                else:
                    messages.error(request, 'Prescription created but no data returned')
                    return redirect('prescriptions:list')
            else:
                messages.error(request, f'Failed to create prescription: {response.get("message")}')
                return redirect('prescriptions:create')

        except Exception as e:
            logger.error(f"Error creating prescription: {e}")
            messages.error(request, 'An error occurred while creating prescription')
            return redirect('prescriptions:create')


@method_decorator(login_required, name='dispatch')
class PrescriptionUpdateStatusView(View):
    """Update prescription status (dispense, complete, cancel)"""

    def post(self, request, prescription_id):
        try:
            api_client = APIClient()
            token = request.session.get('access_token')

            new_status = request.POST.get('status')
            reason = request.POST.get('reason', '')

            if not new_status:
                messages.error(request, 'Status is required')
                return redirect('prescriptions:detail', prescription_id=prescription_id)

            # Prepare update data
            update_data = {
                'status': new_status,
                'changeReason': reason
            }

            # Add dispensing info if status is dispensed
            if new_status == 'dispensed':
                # Get dispensing user info from session
                dispensed_by_name = request.session.get('username', 'Unknown')

                # Try to get full name from profile API
                try:
                    profile_response = api_client.get_profile(token)
                    if profile_response.get('success'):
                        profile_data = profile_response.get('data', {})
                        profile_nested = profile_data.get('profile', {})
                        first_name = profile_nested.get('firstName', '')
                        last_name = profile_nested.get('lastName', '')
                        full_name = f"{first_name} {last_name}".strip()
                        if full_name:
                            dispensed_by_name = full_name
                except Exception as e:
                    logger.error(f"Error getting dispensing user name: {e}")

                update_data.update({
                    'dispensedByUserId': request.session.get('user_id'),
                    'dispensedByName': dispensed_by_name,
                    'dispensedDate': datetime.now().isoformat()
                })

            # Update prescription
            response = api_client._make_request('PUT', f'/api/prescriptions/{prescription_id}', token=token, data=update_data)

            if response.get('success'):
                status_messages = {
                    'dispensed': 'Prescription marked as dispensed',
                    'completed': 'Prescription completed',
                    'cancelled': 'Prescription cancelled',
                    'active': 'Prescription activated'
                }
                messages.success(request, status_messages.get(new_status, f'Prescription status updated to {new_status}'))
            else:
                messages.error(request, f'Failed to update prescription: {response.get("message")}')

            return redirect('prescriptions:detail', prescription_id=prescription_id)

        except Exception as e:
            logger.error(f"Error updating prescription status: {e}")
            messages.error(request, 'An error occurred while updating prescription')
            return redirect('prescriptions:detail', prescription_id=prescription_id)


@method_decorator(login_required, name='dispatch')
class MedicationSearchView(View):
    """Search medications for prescription form"""

    def get(self, request):
        try:
            api_client = APIClient()
            token = request.session.get('access_token')
            search_term = request.GET.get('q', '')

            if len(search_term) < 2:
                return JsonResponse({'medications': []})

            # Search medications
            response = api_client.search_medications(token, search_term)

            if response.get('success'):
                medications = response.get('data', [])
                logger.info(f"Found {len(medications)} medications for search term: {search_term}")

                # Format for select2 - use medication_name as id so it gets saved correctly
                formatted_medications = [
                    {
                        'id': med.get('medication_name'),  # Use medication_name as id for form value
                        'text': f"{med.get('medication_name', 'Unknown')} - {med.get('strength', '')} {med.get('unit', '')}".strip(' -'),
                        'medication_name': med.get('medication_name'),
                        'medication_code': med.get('medication_code'),
                        'generic_name': med.get('generic_name'),
                        'strength': med.get('strength'),
                        'unit': med.get('unit'),
                        'unit_price': med.get('unit_price', 0),
                        'currency': med.get('currency', 'VND'),
                        'dosage_form': med.get('dosage_form', ''),
                    }
                    for med in medications
                ]
                logger.info(f"Formatted medications: {formatted_medications}")
                return JsonResponse({'medications': formatted_medications})
            else:
                return JsonResponse({'medications': []})

        except Exception as e:
            logger.error(f"Error searching medications: {e}")
            return JsonResponse({'medications': []})


@method_decorator(login_required, name='dispatch')
class PrescriptionPrintView(View):
    """Print prescription"""

    def get(self, request, prescription_id):
        try:
            api_client = APIClient()
            token = request.session.get('access_token')

            # Get prescription details
            prescription_response = api_client._make_request('GET', f'/api/prescriptions/{prescription_id}', token=token)

            if prescription_response.get('success'):
                prescription = prescription_response.get('data')
            else:
                messages.error(request, 'Prescription not found')
                return redirect('prescriptions:list')

            context = {
                'prescription': prescription,
                'print_date': datetime.now().strftime('%d/%m/%Y %H:%M'),
            }

            return render(request, 'prescriptions/print.html', context)

        except Exception as e:
            logger.error(f"Error loading prescription for print: {e}")
            messages.error(request, 'An error occurred while loading prescription')
            return redirect('prescriptions:list')


@method_decorator(login_required, name='dispatch')
class PatientSelectionView(TemplateView):
    """Patient selection page for prescription creation"""
    template_name = 'prescriptions/patient_selection.html'

    def dispatch(self, request, *args, **kwargs):
        # Check if user has doctor role
        user_role = request.session.get('user_role', '')
        if user_role != 'doctor':
            messages.error(request, "Only doctors can create prescriptions.")
            return redirect('dashboard:index')
        return super().dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        try:
            api_client = APIClient()
            token = self.request.session.get('access_token')

            # Get search and filter parameters
            search_query = self.request.GET.get('search', '')
            sort_by = self.request.GET.get('sort_by', 'fullName')
            sort_order = self.request.GET.get('sort_order', 'asc')
            page = int(self.request.GET.get('page', 1))
            limit = int(self.request.GET.get('limit', 10))

            # Get patients from API (get_patients method doesn't accept sorting params)
            patients_response = api_client.get_patients(token, page=1, limit=1000)  # Fetch all patients

            if patients_response.get('success'):
                patients_data = patients_response.get('data', {})
                all_patients = patients_data.get('patients', [])

                # Manual search filtering
                if search_query:
                    filtered_patients = []
                    for patient in all_patients:
                        if (search_query.lower() in patient.get('fullName', '').lower() or
                            search_query.lower() in patient.get('phone', '').lower() or
                            search_query.lower() in patient.get('id', '').lower()):
                            filtered_patients.append(patient)
                    patients = filtered_patients
                else:
                    patients = all_patients

                # Calculate age for each patient
                for patient in patients:
                    calculated_age = get_patient_age(patient)
                    if calculated_age:
                        patient['calculated_age'] = calculated_age

                # Manual sorting
                def sort_key(patient):
                    if sort_by == 'fullName':
                        return patient.get('fullName', '').lower()
                    elif sort_by == 'age':
                        return patient.get('calculated_age', 0) or 0
                    elif sort_by == 'createdAt':
                        return patient.get('createdAt', '')
                    else:
                        return patient.get('fullName', '').lower()

                patients.sort(key=sort_key, reverse=(sort_order == 'desc'))

                # Manual pagination
                total_count = len(patients)
                total_pages = (total_count + limit - 1) // limit
                start_idx = (page - 1) * limit
                end_idx = start_idx + limit
                paginated_patients = patients[start_idx:end_idx]

                # Create pagination info
                pagination = {
                    'currentPage': page,
                    'totalPages': total_pages,
                    'totalCount': total_count,
                    'limit': limit,
                    'hasNext': page < total_pages,
                    'hasPrev': page > 1
                }

                context.update({
                    'patients': paginated_patients,
                    'pagination': pagination,
                    'search_query': search_query,
                    'sort_by': sort_by,
                    'sort_order': sort_order,
                    'current_page': page,
                    'total_pages': total_pages,
                    'total_count': total_count,
                })

                logger.info(f"Found {len(paginated_patients)} patients for prescription creation (page {page} of {total_pages})")
            else:
                context.update({
                    'patients': [],
                    'pagination': {},
                    'search_query': search_query,
                    'error_message': patients_response.get('message', 'Failed to load patients')
                })
                logger.error(f"Failed to get patients: {patients_response.get('message')}")

        except Exception as e:
            logger.error(f"Error in patient selection view: {str(e)}")
            context.update({
                'patients': [],
                'pagination': {},
                'search_query': search_query,
                'error_message': 'An error occurred while loading patients.'
            })

        return context
