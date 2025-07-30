from django.shortcuts import render, redirect
from django.views import View
from django.http import JsonResponse
from django.contrib import messages
from django.utils.decorators import method_decorator
from utils.decorators import (
    login_required,
    role_required,
    doctor_own_data_required,
    patient_own_data_required,
    read_only_for_role
)
from utils.api_client import APIClient
import logging
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

@method_decorator(login_required, name='dispatch')
@method_decorator(role_required(['admin', 'staff', 'doctor', 'patient']), name='dispatch')
@method_decorator(doctor_own_data_required, name='dispatch')
@method_decorator(patient_own_data_required, name='dispatch')
class AppointmentListView(View):
    def get(self, request):
        try:
            token = request.session.get('access_token')
            api_client = APIClient(token=token)

            # Get query parameters for filtering and pagination
            status = request.GET.get('status', '')
            date_from = request.GET.get('date_from', '')
            date_to = request.GET.get('date_to', '')
            # Handle both snake_case and camelCase for compatibility
            patient_id = request.GET.get('patientId', '') or request.GET.get('patient_id', '')
            doctor_id = request.GET.get('doctorId', '') or request.GET.get('doctor_id', '')
            page = request.GET.get('page', '1')

            # Build API query parameters (use camelCase for API)
            params = {}
            if status:
                params['status'] = status
            if date_from:
                params['dateFrom'] = date_from
            if date_to:
                params['dateTo'] = date_to
            if patient_id:
                params['patientId'] = patient_id
            if doctor_id:
                params['doctorId'] = doctor_id

            # Add pagination parameters
            try:
                page_num = int(page)
                params['page'] = page_num
                params['limit'] = 10  # Items per page
            except ValueError:
                params['page'] = 1
                params['limit'] = 10

            # Get appointments from API
            logger.info(f"Fetching appointments with params: {params}")
            appointments_response = api_client.get_direct('http://localhost:3003/api/appointments', params=params)
            logger.info(f"Appointments API response: {appointments_response}")

            if appointments_response.get('success'):
                appointments = appointments_response.get('data', {}).get('appointments', [])
                pagination = appointments_response.get('data', {}).get('pagination', {})
                logger.info(f"Found {len(appointments)} appointments")

                # Parse scheduled_date for each appointment
                from datetime import datetime
                for appointment in appointments:
                    if appointment.get('scheduled_date'):
                        try:
                            # Parse ISO datetime string to Python datetime
                            scheduled_date_str = appointment['scheduled_date']

                            # If it ends with Z, it's UTC time - treat as local time instead
                            if scheduled_date_str.endswith('Z'):
                                # Remove Z and parse as naive datetime (local time)
                                scheduled_date_str = scheduled_date_str[:-5]  # Remove .000Z
                                appointment['scheduled_date'] = datetime.fromisoformat(scheduled_date_str)
                            else:
                                appointment['scheduled_date'] = datetime.fromisoformat(scheduled_date_str)

                        except Exception as e:
                            logger.error(f"Error parsing scheduled_date for appointment {appointment.get('id')}: {str(e)}")
                            appointment['scheduled_date'] = None
            else:
                logger.error(f"Failed to get appointments: {appointments_response.get('message', 'Unknown error')}")
                appointments = []
                pagination = {}

            # Get patients and doctors for filters
            token = request.session.get('access_token')
            if token:
                patients_response = api_client.get_patients(
                    token=token,
                    page=1,
                    limit=100,
                    sort_by='fullName',
                    sort_order='asc'
                )
                patients = patients_response.get('data', {}).get('patients', []) if patients_response.get('success') else []
            else:
                patients = []

            # Get doctors from doctor profiles API
            try:
                doctors_response = api_client._make_request(
                    'GET',
                    '/api/doctors',
                    token=None  # Public endpoint
                )

                doctors = []
                if doctors_response.get('success'):
                    all_doctors = doctors_response.get('data', {}).get('doctors', [])
                    logger.info(f"Retrieved {len(all_doctors)} total doctors for filters")

                    # Transform doctor data for filter dropdown
                    for doctor in all_doctors:
                        first_name = doctor.get('firstName', '')
                        last_name = doctor.get('lastName', '')
                        full_name = f"{first_name} {last_name}".strip() if first_name or last_name else doctor.get('username', 'Unknown Doctor')

                        doctors.append({
                            'id': doctor.get('userId'),
                            'fullName': full_name,
                            'specialization': doctor.get('specialization', 'General Medicine')
                        })

                    logger.info(f"Processed {len(doctors)} doctors for filters")

                    # Create doctor lookup map for appointments
                    doctor_lookup = {}
                    for doctor in all_doctors:
                        first_name = doctor.get('firstName', '')
                        last_name = doctor.get('lastName', '')
                        full_name = f"{first_name} {last_name}".strip() if first_name or last_name else doctor.get('username', 'Unknown Doctor')
                        doctor_lookup[doctor.get('userId')] = {
                            'fullName': full_name,
                            'specialization': doctor.get('specialization', 'General Medicine')
                        }

                    # Update appointment doctor names with real names
                    for appointment in appointments:
                        doctor_id = appointment.get('doctor_id')
                        if doctor_id in doctor_lookup:
                            appointment['doctor_name'] = doctor_lookup[doctor_id]['fullName']
                            appointment['doctor_specialization'] = doctor_lookup[doctor_id]['specialization']

                    logger.info(f"Updated {len(appointments)} appointments with real doctor names")
                else:
                    logger.error(f"Failed to get doctors: {doctors_response.get('message', 'Unknown error')}")

            except Exception as e:
                logger.error(f"Error loading doctors: {str(e)}")
                doctors = []

            context = {
                'appointments': appointments,
                'pagination': pagination,
                'patients': patients,
                'doctors': doctors,
                'filters': {
                    'status': status,
                    'date_from': date_from,
                    'date_to': date_to,
                    'patient_id': patient_id,
                    'doctor_id': doctor_id,
                },
                'status_choices': [
                    ('scheduled', 'Scheduled'),
                    ('confirmed', 'Confirmed'),
                    ('completed', 'Completed'),
                    ('cancelled', 'Cancelled'),
                ]
            }

            logger.info(f"Rendering template with {len(appointments)} appointments")

            return render(request, 'appointments/list.html', context)

        except Exception as e:
            logger.error(f"Error loading appointments: {str(e)}")
            messages.error(request, "An error occurred while loading appointments")
            return render(request, 'appointments/list.html', {
                'appointments': [],
                'patients': [],
                'doctors': [],
                'error_message': "Appointment information could not be loaded. Please try again later."
            })


@method_decorator(login_required, name='dispatch')
class AppointmentDetailView(View):
    def get(self, request, appointment_id):
        try:
            token = request.session.get('access_token')
            api_client = APIClient(token=token)

            # Get appointment details
            appointment_response = api_client.get_direct(f'http://localhost:3003/api/appointments/{appointment_id}')
            appointment = appointment_response.get('data', {})

            if not appointment:
                messages.error(request, "Appointment not found")
                return redirect('appointments:list')

            # Parse datetime fields for proper timeline display
            from datetime import datetime
            def parse_iso(dt_str):
                try:
                    if not dt_str:
                        return None
                    # Remove trailing 'Z' if present; keep milliseconds if any
                    if isinstance(dt_str, str) and dt_str.endswith('Z'):
                        dt_str = dt_str[:-1]
                    return datetime.fromisoformat(dt_str) if isinstance(dt_str, str) else dt_str
                except Exception as e:
                    logger.error(f"Error parsing datetime '{dt_str}': {e}")
                    return None

            # Support both snake_case and camelCase from API
            appointment['scheduled_date'] = parse_iso(appointment.get('scheduled_date') or appointment.get('scheduledDate'))
            appointment['created_at'] = parse_iso(appointment.get('created_at') or appointment.get('createdAt'))
            appointment['confirmed_at'] = parse_iso(appointment.get('confirmed_at') or appointment.get('confirmedAt'))
            appointment['completed_at'] = parse_iso(appointment.get('completed_at') or appointment.get('completedAt'))
            appointment['updated_at'] = parse_iso(appointment.get('updated_at') or appointment.get('updatedAt'))

            # Determine next allowable status for step-by-step updates
            status = appointment.get('status')
            next_status = None
            next_status_label = None
            if status == 'scheduled':
                next_status = 'confirmed'
                next_status_label = 'Confirm Appointment'
            elif status == 'confirmed':
                next_status = 'completed'
                next_status_label = 'Mark as Completed'
            # No next step for completed/cancelled or unknown statuses

            context = {
                'appointment': appointment,
                'next_status': next_status,
                'next_status_label': next_status_label,
                'status_choices': [
                    ('scheduled', 'Scheduled'),
                    ('confirmed', 'Confirmed'),
                    ('completed', 'Completed'),
                    ('cancelled', 'Cancelled'),
                ]
            }

            return render(request, 'appointments/detail.html', context)

        except Exception as e:
            logger.error(f"Error loading appointment {appointment_id}: {str(e)}")
            messages.error(request, "An error occurred while loading appointment details")
            return redirect('appointments:list')


@method_decorator(login_required, name='dispatch')
@method_decorator(role_required(['admin', 'staff', 'doctor']), name='dispatch')  # Patients không book appointment
class BookAppointmentView(View):
    def get(self, request):
        try:
            token = request.session.get('access_token')
            api_client = APIClient(token=token)

            # Get URL parameters
            selected_doctor_id = request.GET.get('doctor', '')
            selected_patient_id = request.GET.get('patient', '')

            logger.info(f"Book appointment - doctor: {selected_doctor_id}, patient: {selected_patient_id}")

            # Get patients
            patients = []
            try:
                token = request.session.get('access_token')
                if token:
                    patients_response = api_client.get_patients(
                        token=token,
                        page=1,
                        limit=100,  # Get more patients for dropdown
                        sort_by='fullName',
                        sort_order='asc'
                    )
                    if patients_response.get('success'):
                        patients = patients_response.get('data', {}).get('patients', [])
                        logger.info(f"Loaded {len(patients)} patients from API")
                    else:
                        logger.error(f"Patients API failed: {patients_response.get('message', 'Unknown error')}")
                        patients = []
                else:
                    logger.error("No access token available for patients API")
                    patients = []
            except Exception as e:
                logger.error(f"Error loading patients from API: {str(e)}")
                patients = []

            # If no patients loaded (either due to error or empty response), use fallback
            if not patients:
                logger.info("No patients loaded from API, trying fallback...")
                try:
                    appointments_response = api_client.get_direct('http://localhost:3003/api/appointments')
                    appointments_data = appointments_response.get('data', {}).get('appointments', [])

                    seen_patients = set()
                    for appointment in appointments_data:
                        patient_id = appointment.get('patient_id')
                        patient_name = appointment.get('patient_name')
                        patient_phone = appointment.get('patient_phone')
                        if patient_id and patient_id not in seen_patients:
                            patients.append({
                                'id': patient_id,
                                'fullName': patient_name or f"Patient {patient_id[:8]}",
                                'phone': patient_phone or 'N/A',
                                'patientNumber': f"PT{patient_id[:8].upper()}"
                            })
                            seen_patients.add(patient_id)

                    logger.info(f"Loaded {len(patients)} patients from appointments fallback")
                except Exception as fallback_error:
                    logger.error(f"Fallback patient loading also failed: {str(fallback_error)}")

                # If still no patients, provide a default patient
                if not patients:
                    patients = [{
                        'id': '550e8400-e29b-41d4-a716-446655440001',
                        'fullName': 'Test Patient',
                        'phone': '123-456-7890',
                        'patientNumber': 'PT550E8400'
                    }]
                    logger.info("Using default patient as last resort")

            # Get doctors from doctor profiles API (only accepting patients)
            doctors = []
            try:
                # Get all doctor profiles
                doctors_response = api_client._make_request(
                    'GET',
                    '/api/doctors',
                    token=None  # Public endpoint
                )

                if doctors_response.get('success'):
                    all_doctors = doctors_response.get('data', {}).get('doctors', [])
                    logger.info(f"Retrieved {len(all_doctors)} total doctors from API")

                    # Filter only doctors accepting patients
                    for doctor in all_doctors:
                        if doctor.get('isAcceptingPatients', False):
                            # Get availability info for display
                            availability_text = "Available"
                            availability_hours = doctor.get('availabilityHours', {})
                            if availability_hours:
                                # Show first available day as example
                                for day, hours in availability_hours.items():
                                    if hours and hours.get('start') and hours.get('end'):
                                        availability_text = f"{day.title()}: {hours['start']}-{hours['end']}"
                                        break

                            # Transform doctor data for template
                            first_name = doctor.get('firstName', '')
                            last_name = doctor.get('lastName', '')
                            full_name = f"{first_name} {last_name}".strip() if first_name or last_name else doctor.get('username', 'Unknown Doctor')

                            doctors.append({
                                'id': doctor.get('userId'),
                                'fullName': full_name,
                                'specialization': doctor.get('specialization', 'General Medicine'),
                                'availability': availability_text,
                                'consultationFee': doctor.get('consultationFee', 0),
                                'yearsOfExperience': doctor.get('yearsOfExperience', 0)
                            })

                    logger.info(f"Filtered to {len(doctors)} doctors accepting patients")
                else:
                    logger.error(f"Failed to get doctors: {doctors_response.get('message', 'Unknown error')}")

            except Exception as e:
                logger.error(f"Error loading doctors from profiles API: {str(e)}")

            # Fallback if no doctors found
            if not doctors:
                logger.warning("No accepting doctors found, using fallback")
                doctors = [{
                    'id': '6f529dc6-ee6f-4b8b-8ddb-f177614026d7',
                    'fullName': 'Dr. Smith',
                    'specialization': 'General Medicine',
                    'availability': 'Available',
                    'consultationFee': 100,
                    'yearsOfExperience': 5
                }]

            # Get pre-selected patient/doctor from query params
            selected_patient_id = request.GET.get('patient')
            selected_doctor_id = request.GET.get('doctor')

            context = {
                'patients': patients,
                'doctors': doctors,
                'selected_patient_id': selected_patient_id,
                'selected_doctor_id': selected_doctor_id,
                'appointment_types': [
                    ('consultation', 'Consultation'),
                    ('followup', 'Follow-up'),
                    ('emergency', 'Emergency'),
                    ('checkup', 'Routine Checkup'),
                    ('surgery', 'Surgery'),
                    ('therapy', 'Therapy'),
                ],
                'priorities': [
                    ('normal', 'Normal'),
                    ('high', 'High'),
                    ('urgent', 'Urgent'),
                ]
            }

            return render(request, 'appointments/book.html', context)

        except Exception as e:
            logger.error(f"Error loading booking form: {str(e)}")
            messages.error(request, "An error occurred while loading the booking form")
            return render(request, 'appointments/book.html', {
                'patients': [],
                'doctors': [],
                'error_message': "Booking form could not be loaded. Please try again later."
            })

    def post(self, request):
        try:
            token = request.session.get('access_token')
            api_client = APIClient(token=token)

            # Get form data
            scheduled_datetime = request.POST.get('scheduled_date')

            # Parse datetime and format for API
            if scheduled_datetime:
                from datetime import datetime
                try:
                    # Parse datetime-local format (YYYY-MM-DDTHH:MM)
                    dt = datetime.fromisoformat(scheduled_datetime)

                    # Send as local time without timezone conversion
                    # Let the API handle timezone if needed
                    scheduled_date_iso = dt.strftime('%Y-%m-%dT%H:%M:%S')

                    # Keep local time for display
                    appointment_date = dt.strftime('%Y-%m-%d')
                    appointment_time = dt.strftime('%H:%M')

                    logger.info(f"Datetime conversion: Input={scheduled_datetime}, Parsed={dt}, ISO={scheduled_date_iso}")
                except ValueError as e:
                    logger.error(f"Datetime parsing error: {e}")
                    scheduled_date_iso = scheduled_datetime
                    appointment_date = None
                    appointment_time = None
            else:
                scheduled_date_iso = None
                appointment_date = None
                appointment_time = None

            # Get and validate form data
            patient_id = request.POST.get('patient_id')
            doctor_id = request.POST.get('doctor_id')

            # Handle "None" string case (when no option is selected)
            if patient_id == 'None' or not patient_id:
                patient_id = None
            if doctor_id == 'None' or not doctor_id:
                doctor_id = None

            # Load patients and doctors data for getting names
            patients = []
            doctors = []
            try:
                token = request.session.get('access_token')
                if token:
                    # Get patients
                    patients_response = api_client.get_patients(
                        token=token,
                        page=1,
                        limit=100,
                        sort_by='fullName',
                        sort_order='asc'
                    )
                    if patients_response.get('success'):
                        patients = patients_response.get('data', {}).get('patients', [])

                    # Get doctors from availability and user service
                    doctors_response = api_client.get_direct('http://localhost:3003/api/doctor-availability')
                    if doctors_response.get('success'):
                        availability_data = doctors_response.get('data', [])
                        seen_doctors = set()
                        for avail in availability_data:
                            doctor_id_avail = avail.get('doctor_id')
                            if doctor_id_avail and doctor_id_avail not in seen_doctors:
                                # Get doctor details from user service
                                try:
                                    doctor_profile_response = api_client.get_direct(f'http://localhost:3001/api/users/{doctor_id_avail}')
                                    if doctor_profile_response.get('success'):
                                        doctor_data = doctor_profile_response.get('data', {})
                                        doctor_name = doctor_data.get('fullName') or doctor_data.get('username', f"Doctor {doctor_id_avail[:8]}")
                                        specialization = doctor_data.get('specialization', 'General')
                                    else:
                                        doctor_name = f"Doctor {doctor_id_avail[:8]}"
                                        specialization = 'General'
                                except:
                                    doctor_name = f"Doctor {doctor_id_avail[:8]}"
                                    specialization = 'General'

                                doctors.append({
                                    'id': doctor_id_avail,
                                    'name': doctor_name,
                                    'specialization': specialization,
                                    'availability': {
                                        'day_of_week': avail.get('day_of_week'),
                                        'start_time': avail.get('start_time'),
                                        'end_time': avail.get('end_time')
                                    }
                                })
                                seen_doctors.add(doctor_id_avail)
            except Exception as e:
                logger.error(f"Error loading patients/doctors for booking: {str(e)}")

            # Get patient and doctor info for service
            selected_patient = next((p for p in patients if p['id'] == patient_id), None)
            selected_doctor = next((d for d in doctors if d['id'] == doctor_id), None)

            # If doctor not found in initial list, try to get from API
            if not selected_doctor and doctor_id:
                try:
                    # Search all doctors and find by userId
                    doctors_response = api_client._make_request('GET', '/api/doctors', token=None)
                    if doctors_response.get('success'):
                        all_doctors = doctors_response.get('data', {}).get('doctors', [])
                        doctor_data = next((d for d in all_doctors if d.get('userId') == doctor_id), None)

                        if doctor_data:
                            full_name = f"{doctor_data.get('firstName', '')} {doctor_data.get('lastName', '')}".strip()
                            if not full_name:
                                full_name = doctor_data.get('username', 'Unknown Doctor')

                            selected_doctor = {
                                'id': doctor_data.get('userId'),
                                'fullName': full_name,
                                'name': full_name,
                                'specialization': doctor_data.get('specialization', 'General Medicine'),
                                'username': doctor_data.get('username', '')
                            }
                            logger.info(f"Found doctor from doctors API: {selected_doctor}")
                        else:
                            logger.warning(f"Doctor with userId {doctor_id} not found in doctors API")

                    # Fallback to user service if still not found
                    if not selected_doctor:
                        user_response = api_client.get_direct(f'http://localhost:3001/api/users/{doctor_id}')
                        if user_response.get('success'):
                            user_data = user_response.get('data', {})
                            selected_doctor = {
                                'id': doctor_id,
                                'fullName': user_data.get('fullName') or user_data.get('username', 'Unknown Doctor'),
                                'name': user_data.get('fullName') or user_data.get('username', 'Unknown Doctor'),
                                'specialization': user_data.get('specialization', 'General Medicine'),
                                'username': user_data.get('username', '')
                            }
                            logger.info(f"Found doctor from user service: {selected_doctor}")

                except Exception as e:
                    logger.error(f"Error fetching doctor details: {str(e)}")

                # Final fallback
                if not selected_doctor:
                    selected_doctor = {
                        'id': doctor_id,
                        'fullName': 'Unknown Doctor',
                        'name': 'Unknown Doctor',
                        'specialization': 'General Medicine',
                        'username': 'unknown'
                    }

            # Get current user ID from profile
            user_profile = api_client.get_profile(token=request.session.get('access_token'))
            current_user_id = user_profile.get('data', {}).get('id') if user_profile.get('success') else None

            # Debug logging
            logger.info(f"Booking appointment - Patient ID: {patient_id}, Doctor ID: {doctor_id}")
            logger.info(f"Selected patient: {selected_patient}")
            logger.info(f"Selected doctor: {selected_doctor}")

            appointment_data = {
                # API validation expects specific field names
                'patientId': patient_id,
                'patientName': selected_patient['fullName'] if selected_patient else 'Unknown Patient',
                'patientPhone': selected_patient.get('phone', 'N/A') if selected_patient else 'N/A',
                'doctorId': doctor_id,
                'doctorName': (selected_doctor.get('fullName') or selected_doctor.get('name', 'Unknown Doctor')) if selected_doctor else 'Unknown Doctor',
                'type': request.POST.get('appointment_type', 'consultation'),  # For validation
                'appointmentType': request.POST.get('appointment_type', 'consultation'),  # For service
                'appointmentDate': appointment_date,  # Separate date field YYYY-MM-DD
                'appointmentTime': appointment_time,  # Separate time field HH:MM
                'scheduledDate': scheduled_date_iso,  # Combined datetime for service
                'durationMinutes': int(request.POST.get('duration_minutes', 30)),
                'priority': request.POST.get('priority', 'normal'),
                'reason': request.POST.get('reason', ''),
                'symptoms': request.POST.get('symptoms', ''),
                'notes': request.POST.get('notes', ''),
                'fee': float(request.POST.get('fee', 0.0)),
                'createdByUserId': current_user_id or 'temp-user-id',  # Use real user ID
            }

            # Validate required fields
            if not appointment_data['patientId']:
                messages.error(request, "Please select a patient")
                return redirect('appointments:book')
            if not appointment_data['doctorId']:
                messages.error(request, "Please select a doctor")
                return redirect('appointments:book')
            if not appointment_data['scheduledDate']:
                messages.error(request, "Please select a date and time")
                return redirect('appointments:book')

            # Log the data being sent for debugging
            logger.info(f"Booking appointment with data: {appointment_data}")

            # Create appointment via API
            response = api_client.post_direct('http://localhost:3003/api/appointments', appointment_data)

            if response.get('success'):
                messages.success(request, "Appointment booked successfully!")
                appointment_id = response.get('data', {}).get('id')
                if appointment_id:
                    return redirect('appointments:detail', appointment_id=appointment_id)
                else:
                    return redirect('appointments:list')
            else:
                messages.error(request, f"Failed to book appointment: {response.get('message', 'Unknown error')}")
                return redirect('appointments:book')

        except Exception as e:
            logger.error(f"Error booking appointment: {str(e)}")
            messages.error(request, "An error occurred while booking the appointment")
            return redirect('appointments:book')


@method_decorator(login_required, name='dispatch')
class UpdateAppointmentStatusView(View):
    def post(self, request, appointment_id):
        try:
            token = request.session.get('access_token')
            api_client = APIClient(token=token)

            doctor_notes = request.POST.get('doctor_notes', '')

            # Get current appointment to enforce sequential transitions
            current_resp = api_client.get_direct(f'http://localhost:3003/api/appointments/{appointment_id}')
            current_appt = current_resp.get('data', {}) if current_resp else {}
            current_status = (current_appt.get('status') or '').lower()

            # Determine next allowed status
            allowed_next = None
            if current_status == 'scheduled':
                allowed_next = 'confirmed'
            elif current_status == 'confirmed':
                allowed_next = 'completed'

            if not allowed_next:
                messages.error(request, "No further status updates are allowed for this appointment.")
                return redirect('appointments:detail', appointment_id=appointment_id)

            # Update appointment status via API Gateway (force allowed_next)
            update_data = {
                'status': allowed_next,
                'doctor_notes': doctor_notes
            }

            # Call dedicated endpoints to ensure proper timeline fields are set
            if allowed_next == 'confirmed':
                response = api_client._make_request(
                    'PUT',
                    f'/api/appointments/{appointment_id}/confirm',
                    token=token,
                )
            elif allowed_next == 'completed':
                response = api_client._make_request(
                    'PUT',
                    f'/api/appointments/{appointment_id}/complete',
                    token=token,
                    data={'doctorNotes': doctor_notes}
                )
            else:
                response = {'success': False, 'message': 'Invalid next status'}

            if response.get('success'):
                messages.success(request, f"Appointment status updated to {allowed_next}")
            else:
                messages.error(request, f"Failed to update appointment: {response.get('message', 'Unknown error')}")

            return redirect('appointments:detail', appointment_id=appointment_id)

        except Exception as e:
            logger.error(f"Error updating appointment {appointment_id}: {str(e)}")
            messages.error(request, "An error occurred while updating the appointment")
            return redirect('appointments:detail', appointment_id=appointment_id)


@method_decorator(login_required, name='dispatch')
class CancelAppointmentView(View):
    def post(self, request, appointment_id):
        try:
            token = request.session.get('access_token')
            api_client = APIClient(token=token)

            # Cancel appointment via API Gateway
            update_data = {'status': 'cancelled'}
            response = api_client._make_request(
                'PUT',
                f'/api/appointments/{appointment_id}',
                token=token,
                data=update_data
            )

            if response.get('success'):
                messages.success(request, "Appointment cancelled successfully")
            else:
                messages.error(request, f"Failed to cancel appointment: {response.get('message', 'Unknown error')}")

            return redirect('appointments:list')

        except Exception as e:
            logger.error(f"Error cancelling appointment {appointment_id}: {str(e)}")
            messages.error(request, "An error occurred while cancelling the appointment")
            return redirect('appointments:list')


@method_decorator(login_required, name='dispatch')
@method_decorator(role_required(['admin', 'staff', 'doctor', 'patient']), name='dispatch')
@method_decorator(doctor_own_data_required, name='dispatch')
@method_decorator(patient_own_data_required, name='dispatch')
class AppointmentCalendarView(View):
    def get(self, request):
        try:
            token = request.session.get('access_token')
            api_client = APIClient(token=token)

            # Get current month or specified month
            year = int(request.GET.get('year', datetime.now().year))
            month = int(request.GET.get('month', datetime.now().month))

            logger.info(f"Calendar view - year: {year} (type: {type(year)}), month: {month} (type: {type(month)})")

            # Calculate date range for the month
            start_date = datetime(year, month, 1)
            if month == 12:
                end_date = datetime(year + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = datetime(year, month + 1, 1) - timedelta(days=1)

            # Build filters respecting role-based access similar to list view
            patient_id = request.GET.get('patientId', '') or request.GET.get('patient_id', '')
            doctor_id = request.GET.get('doctorId', '') or request.GET.get('doctor_id', '')

            params = {
                'dateFrom': start_date.strftime('%Y-%m-%d') + 'T00:00:00',
                'dateTo': end_date.strftime('%Y-%m-%d') + 'T23:59:59',
                'page': 1,
                'limit': 2000  # fetch enough for the month
            }
            if patient_id:
                params['patientId'] = patient_id
            if doctor_id:
                params['doctorId'] = doctor_id

            logger.info(f"Calendar: Fetching appointments with params: {params}")
            appointments_response = api_client.get_direct('http://localhost:3003/api/appointments', params=params)
            all_appointments = appointments_response.get('data', {}).get('appointments', [])

            logger.info(f"Calendar: Retrieved {len(all_appointments)} appointments after filtering")

            # Parse scheduled_date and filter for current month
            appointments_by_date = {}
            month_appointments = []

            for appointment in all_appointments:
                scheduled_date_str = appointment.get('scheduled_date') or appointment.get('scheduledDate') or ''
                if scheduled_date_str:
                    try:
                        # Parse ISO datetime string to Python datetime
                        if isinstance(scheduled_date_str, str) and scheduled_date_str.endswith('Z'):
                            # Remove trailing Z only
                            scheduled_date_str = scheduled_date_str[:-1]
                        scheduled_datetime = datetime.fromisoformat(scheduled_date_str) if isinstance(scheduled_date_str, str) else scheduled_date_str
                        appointment['scheduled_date'] = scheduled_datetime

                        # Check if appointment is in current month
                        if (scheduled_datetime.year == year and
                            scheduled_datetime.month == month):

                            month_appointments.append(appointment)

                            # Group by date for calendar display
                            date_key = scheduled_datetime.strftime('%Y-%m-%d')
                            if date_key not in appointments_by_date:
                                appointments_by_date[date_key] = []
                            appointments_by_date[date_key].append(appointment)

                    except Exception as e:
                        logger.error(f"Error parsing scheduled_date for appointment {appointment.get('id')}: {str(e)}")
                        continue

            logger.info(f"Calendar: Found {len(month_appointments)} appointments for {year}-{month:02d}")
            logger.info(f"Calendar: Appointments by date: {list(appointments_by_date.keys())}")

            # Debug: Log detailed appointments_by_date structure
            for date_key, appts in appointments_by_date.items():
                logger.info(f"Calendar: Date {date_key} has {len(appts)} appointments")
                for appt in appts:
                    logger.info(f"  - {appt.get('patient_name', 'Unknown')} at {appt.get('scheduled_date', 'No time')} (Status: {appt.get('status', 'scheduled')})")

            # Calculate statistics
            total_appointments = len(month_appointments)
            days_with_appointments = len(appointments_by_date)

            context = {
                'appointments_by_date': appointments_by_date,
                'current_year': year,
                'current_month': month,
                'month_name': start_date.strftime('%B'),
                'prev_month': (start_date - timedelta(days=1)).replace(day=1),
                'next_month': end_date + timedelta(days=1),
                'total_appointments': total_appointments,
                'days_with_appointments': days_with_appointments,
                'month_appointments': month_appointments,  # For debugging
            }

            return render(request, 'appointments/calendar.html', context)

        except Exception as e:
            logger.error(f"Error loading appointment calendar: {str(e)}")
            messages.error(request, "An error occurred while loading the calendar")
            return render(request, 'appointments/calendar.html', {
                'appointments_by_date': {},
                'error_message': "Calendar could not be loaded. Please try again later."
            })


class AppointmentSearchAPIView(View):
    def get(self, request):
        try:
            token = request.session.get('access_token')
            api_client = APIClient(token=token)

            query = request.GET.get('q', '').strip()
            limit = int(request.GET.get('limit', 10))

            if not query:
                return JsonResponse({'results': []})

            # Search appointments by appointment number, patient name, or doctor name
            params = {
                'search': query,
                'limit': limit
            }

            appointments_response = api_client.get_direct('http://localhost:3003/api/appointments', params=params)
            appointments = appointments_response.get('data', {}).get('appointments', [])

            # Format results for autocomplete
            results = []
            for appointment in appointments:
                results.append({
                    'id': appointment.get('id'),
                    'text': f"{appointment.get('appointment_number', '')} - {appointment.get('patient_name', '')} with {appointment.get('doctor_name', '')}",
                    'appointment_number': appointment.get('appointment_number', ''),
                    'patient_name': appointment.get('patient_name', ''),
                    'doctor_name': appointment.get('doctor_name', ''),
                    'scheduled_date': appointment.get('scheduled_date', ''),
                    'status': appointment.get('status', '')
                })

            return JsonResponse({'results': results})

        except Exception as e:
            logger.error(f"Error searching appointments: {str(e)}")
            return JsonResponse({'results': [], 'error': 'Search failed'})
