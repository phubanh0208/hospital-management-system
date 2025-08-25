from django.shortcuts import render, redirect
from django.contrib import messages
from django.views import View
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.utils.decorators import method_decorator
from utils.decorators import (
    login_required,
    role_required,
    hide_doctors_list_for_doctors
)
from utils.api_client import APIClient
from utils.encryption import decrypt_user_data
import logging

logger = logging.getLogger(__name__)

@method_decorator(login_required, name='dispatch')
@method_decorator(role_required(['admin', 'staff']), name='dispatch')  # Chỉ admin và staff
@method_decorator(hide_doctors_list_for_doctors, name='dispatch')  # Doctors không xem doctors list
class DoctorListView(View):
    """List all doctors (users with role 'doctor')"""

    def get(self, request):
        try:
            api_client = APIClient()
            token = request.session.get('access_token')

            # Get pagination parameters
            page = int(request.GET.get('page', 1))
            limit = int(request.GET.get('limit', 10))
            search = request.GET.get('search', '')
            specialization = request.GET.get('specialization', '')
            status = request.GET.get('status', '')

            # Build query parameters for doctors API
            params = {
                'page': page,
                'limit': limit
            }

            if search:
                params['search'] = search
            if specialization:
                params['specialization'] = specialization

            # Convert status filter to isAcceptingPatients
            if status == 'active':
                params['isAcceptingPatients'] = 'true'
            elif status == 'inactive':
                params['isAcceptingPatients'] = 'false'

            # Build query string
            query_string = '&'.join([f"{k}={v}" for k, v in params.items()])

            # Get doctors from new doctors API
            doctors_response = api_client._make_request(
                'GET',
                f'/api/doctors?{query_string}',
                token=None  # Public endpoint
            )

            if not doctors_response.get('success'):
                messages.error(request, f"Failed to load doctors: {doctors_response.get('message', 'Unknown error')}")
                return render(request, 'doctors/list.html', {'doctors': [], 'pagination': {}})

            # Extract doctors data
            doctors_data = doctors_response.get('data', {})
            doctors = doctors_data.get('doctors', [])
            pagination_data = doctors_data.get('pagination', {})

            # Transform doctor data for template compatibility
            for doctor in doctors:
                # Map API fields to template fields
                doctor['fullName'] = f"{doctor.get('firstName', '')} {doctor.get('lastName', '')}".strip()
                if not doctor['fullName']:
                    doctor['fullName'] = doctor.get('username', 'Unknown Doctor')

                # Set isActive based on isAcceptingPatients
                doctor['isActive'] = doctor.get('isAcceptingPatients', True)

                # Add appointment count (placeholder for now)
                doctor['appointment_count'] = 0

            # Format pagination for template
            pagination = {
                'page': pagination_data.get('currentPage', page),
                'limit': pagination_data.get('limit', limit),
                'total': pagination_data.get('total', 0),
                'totalPages': pagination_data.get('totalPages', 1),
                'pages': list(range(1, pagination_data.get('totalPages', 1) + 1))
            }

            context = {
                'doctors': doctors,
                'pagination': pagination,
                'search': search,
                'specialization': specialization,
                'status': status,
                'current_page': page
            }

            return render(request, 'doctors/list.html', context)
            
        except Exception as e:
            logger.error(f"Error loading doctors: {str(e)}")
            messages.error(request, "An error occurred while loading doctors")
            return render(request, 'doctors/list.html', {'doctors': [], 'pagination': {}})

@method_decorator(login_required, name='dispatch')
class DoctorDetailView(View):
    """View doctor details and schedule"""

    def get(self, request, doctor_id):
        try:
            api_client = APIClient()
            token = request.session.get('access_token')

            # Get doctor profile from auth service (includes user profile data)
            doctor_response = api_client._make_request(
                'GET',
                f'/api/doctors/profile/{doctor_id}',
                token=None  # Public endpoint
            )

            if not doctor_response.get('success'):
                messages.error(request, "Doctor not found")
                return redirect('doctors:list')

            doctor = doctor_response.get('data', {})

            # Try to get additional user profile data if user is viewing their own profile
            # or if they have admin access
            current_user_id = request.session.get('user_id')
            user_role = request.session.get('user_role')

            # If viewing own profile or user is admin, get additional user data
            if current_user_id == doctor_id or user_role == 'admin':
                try:
                    user_response = api_client._make_request(
                        'GET',
                        f'/api/users/{doctor_id}',
                        token=token  # Admin endpoint
                    )

                    if user_response.get('success'):
                        user_data = user_response.get('data', {})
                        logger.info(f"User data received: email={user_data.get('email', '')}, phone={user_data.get('profile', {}).get('phone', '')}")

                        # Auth service already decrypts sensitive data
                        profile_data = user_data.get('profile', {})
                        doctor.update({
                            'email': user_data.get('email', ''),
                            'phone': profile_data.get('phone', ''),
                            'avatarUrl': profile_data.get('avatarUrl', ''),
                            'isActive': user_data.get('isActive', True),
                            'createdAt': user_data.get('createdAt', ''),
                        })
                except Exception as e:
                    logger.warning(f"Could not fetch user profile data: {e}")
                    # Continue without user profile data

            # Try to get doctor profile from auth service (has email/phone)
            if not doctor.get('email') or not doctor.get('phone'):
                try:
                    # Try doctor profile endpoint first (public)
                    doctor_profile_response = api_client._make_request(
                        'GET',
                        f'/api/doctors/profile/{doctor_id}',
                        token=None  # Public endpoint
                    )

                    if doctor_profile_response.get('success'):
                        profile_data = doctor_profile_response.get('data', {})
                        logger.info(f"Doctor profile from auth service: {profile_data}")

                        doctor.update({
                            'email': profile_data.get('email', ''),
                            'phone': profile_data.get('phone', ''),
                            'firstName': profile_data.get('firstName', ''),
                            'lastName': profile_data.get('lastName', ''),
                            'avatarUrl': profile_data.get('avatarUrl', ''),
                            'isActive': profile_data.get('isActive', True),
                            'licenseNumber': profile_data.get('licenseNumber', ''),
                            'yearsOfExperience': profile_data.get('yearsOfExperience', 0),
                        })
                    else:
                        logger.warning(f"Doctor profile not found in auth service: {doctor_profile_response.get('message')}")

                except Exception as e:
                    logger.warning(f"Could not fetch doctor profile from auth service: {e}")

            # If still no email, try to get from user service
            if not doctor.get('email'):
                try:
                    user_response = api_client._make_request(
                        'GET',
                        f'/api/users/{doctor_id}',
                        token=token  # Admin endpoint, needs token
                    )

                    if user_response.get('success'):
                        user_data = user_response.get('data', {})
                        logger.info(f"User data for email: {user_data.get('email', 'No email')}")

                        if user_data.get('email'):
                            doctor['email'] = user_data.get('email')
                    else:
                        logger.warning(f"User not found: {user_response.get('message')}")

                except Exception as e:
                    logger.warning(f"Could not fetch user email: {e}")

            # If viewing own profile, try auth profile for email/phone
            if current_user_id == doctor_id:
                try:
                    auth_profile_response = api_client._make_request(
                        'GET',
                        '/api/auth/profile',
                        token=token
                    )

                    if auth_profile_response.get('success'):
                        auth_data = auth_profile_response.get('data', {})
                        logger.info(f"Auth profile data: email={auth_data.get('email', 'No email')}")

                        # Auth service already decrypts sensitive data
                        profile_data = auth_data.get('profile', {})

                        # Update with auth data (prioritize auth data for email)
                        if auth_data.get('email'):
                            doctor['email'] = auth_data.get('email')
                        if profile_data.get('phone'):
                            doctor['phone'] = profile_data.get('phone')
                        if profile_data.get('avatarUrl'):
                            doctor['avatarUrl'] = profile_data.get('avatarUrl')
                        if 'isActive' in auth_data:
                            doctor['isActive'] = auth_data.get('isActive', True)

                        logger.info(f"Updated doctor with auth profile: email={doctor.get('email')}")
                    else:
                        logger.warning(f"Auth profile failed: {auth_profile_response.get('message')}")
                except Exception as e:
                    logger.warning(f"Could not fetch auth profile data: {e}")
            else:
                # For other users' profiles, we can't access their auth profile
                # Email will remain "Not provided" unless available from doctor profile
                logger.info(f"Viewing other user's profile ({doctor_id}), cannot access auth profile")

            # Decrypt sensitive data if still encrypted
            phone = doctor.get('phone', '')
            email = doctor.get('email', '')

            # Check if data looks encrypted (long hex strings)
            phone_encrypted = phone and len(phone) > 20 and all(c in '0123456789abcdef' for c in phone.lower())
            email_encrypted = email and len(email) > 20 and all(c in '0123456789abcdef' for c in email.lower())

            if phone_encrypted or email_encrypted:
                try:
                    data_to_decrypt = {}
                    if phone_encrypted:
                        data_to_decrypt['phone'] = phone
                    if email_encrypted:
                        data_to_decrypt['email'] = email

                    decrypted_data = decrypt_user_data(data_to_decrypt)

                    if phone_encrypted:
                        doctor['phone'] = decrypted_data.get('phone', phone)
                    if email_encrypted:
                        doctor['email'] = decrypted_data.get('email', email)

                    logger.info(f"Decrypted doctor data: phone={'***' if phone_encrypted else 'not encrypted'}, email={'***' if email_encrypted else 'not encrypted'}")
                except Exception as e:
                    logger.error(f"Error decrypting doctor data: {str(e)}")
                    # Keep original data if decryption fails

            # Transform doctor data for template compatibility
            first_name = doctor.get('firstName', '')
            last_name = doctor.get('lastName', '')
            if first_name or last_name:
                doctor['fullName'] = f"{first_name} {last_name}".strip()
            else:
                doctor['fullName'] = doctor.get('username', 'Unknown Doctor')

            # Set isActive based on user status or isAcceptingPatients
            if 'isActive' not in doctor:
                doctor['isActive'] = doctor.get('isAcceptingPatients', True)
            
            # Get doctor availability from appointment service
            availability_response = api_client._make_request(
                'GET',
                f'/api/doctor-availability?doctorId={doctor.get("userId")}',
                token=token
            )

            availability = []
            if availability_response.get('success'):
                availability = availability_response.get('data', [])

            # Also get availability schedule from doctor profile
            availability_schedule = doctor.get('availabilityHours', {})
            if availability_schedule:
                # Convert availability hours to a more template-friendly format
                doctor['weeklySchedule'] = []
                days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
                day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

                for i, day in enumerate(days):
                    schedule = availability_schedule.get(day)
                    doctor['weeklySchedule'].append({
                        'day': day_names[i],
                        'available': bool(schedule),
                        'start': schedule.get('start', '') if schedule else '',
                        'end': schedule.get('end', '') if schedule else ''
                    })

            # Get doctor schedule (appointments) with date parameters
            from datetime import datetime, timedelta
            today = datetime.now().date()
            date_from = today.strftime('%Y-%m-%d')
            date_to = (today + timedelta(days=30)).strftime('%Y-%m-%d')

            schedule_response = api_client._make_request(
                'GET',
                f'/api/appointments/doctor/{doctor.get("userId")}/schedule?dateFrom={date_from}&dateTo={date_to}',
                token=token
            )

            schedule = []
            if schedule_response.get('success'):
                schedule = schedule_response.get('data', [])

            # Get doctor performance analytics with date parameters
            performance_response = api_client._make_request(
                'GET',
                f'/api/analytics/doctors/performance?doctorId={doctor.get("userId")}&dateFrom={date_from}&dateTo={date_to}',
                token=token
            )

            performance = {}
            if performance_response.get('success'):
                performance = performance_response.get('data', {})
            
            context = {
                'doctor': doctor,
                'availability': availability,
                'schedule': schedule,
                'performance': performance
            }
            
            return render(request, 'doctors/detail.html', context)
            
        except Exception as e:
            logger.error(f"Error loading doctor {doctor_id}: {str(e)}")

            # Create fallback doctor data
            doctor = {
                'id': doctor_id,
                'fullName': f"Doctor {doctor_id[:8]}",
                'email': f"doctor{doctor_id[:8]}@hospital.com",
                'username': f"doctor_{doctor_id[:8]}",
                'role': 'doctor',
                'isActive': True,
                'specialization': 'General Medicine'
            }

            context = {
                'doctor': doctor,
                'availability': [],
                'schedule': [],
                'performance': {},
                'error_message': "Some doctor information could not be loaded. Please try again later."
            }

            return render(request, 'doctors/detail.html', context)

@method_decorator(login_required, name='dispatch')
class DoctorAvailabilityView(View):
    """Manage doctor availability"""

    def get(self, request, doctor_id):
        try:
            api_client = APIClient()
            token = request.session.get('access_token')
            
            # Create doctor info from doctor_id
            doctor = {
                'id': doctor_id,
                'fullName': f"Doctor {doctor_id[:8]}",
                'email': f"doctor{doctor_id[:8]}@hospital.com",
                'username': f"doctor_{doctor_id[:8]}",
                'role': 'doctor',
                'specialization': 'General Medicine'
            }
            
            # Get current availability
            availability_response = api_client._make_request(
                'GET', 
                f'/api/doctor-availability?doctorId={doctor_id}',
                token=token
            )
            
            availability = []
            if availability_response.get('success'):
                availability = availability_response.get('data', [])
            
            context = {
                'doctor': doctor,
                'availability': availability
            }
            
            return render(request, 'doctors/availability.html', context)
            
        except Exception as e:
            logger.error(f"Error loading doctor availability {doctor_id}: {str(e)}")

            # Create fallback doctor data
            doctor = {
                'id': doctor_id,
                'fullName': f"Doctor {doctor_id[:8]}",
                'email': f"doctor{doctor_id[:8]}@hospital.com",
                'username': f"doctor_{doctor_id[:8]}",
                'role': 'doctor',
                'specialization': 'General Medicine'
            }

            context = {
                'doctor': doctor,
                'availability': [],
                'error_message': "Doctor availability information could not be loaded. Please try again later."
            }

            return render(request, 'doctors/availability.html', context)
    
    def post(self, request, doctor_id):
        try:
            api_client = APIClient()
            token = request.session.get('access_token')
            
            # Create new availability
            availability_data = {
                'doctorId': doctor_id,
                'dayOfWeek': int(request.POST.get('dayOfWeek')),
                'startTime': request.POST.get('startTime'),
                'endTime': request.POST.get('endTime'),
                'isAvailable': request.POST.get('isAvailable') == 'on'
            }
            
            response = api_client._make_request(
                'POST',
                '/api/doctor-availability',
                token=token,
                data=availability_data
            )
            
            if response.get('success'):
                messages.success(request, "Doctor availability updated successfully")
            else:
                messages.error(request, f"Failed to update availability: {response.get('message', 'Unknown error')}")
            
            return redirect('doctors:availability', doctor_id=doctor_id)
            
        except Exception as e:
            logger.error(f"Error updating doctor availability {doctor_id}: {str(e)}")
            messages.error(request, "An error occurred while updating availability")
            return redirect('doctors:availability', doctor_id=doctor_id)

@method_decorator(login_required, name='dispatch')
class DoctorScheduleView(View):
    """View doctor schedule and appointments"""

    def get(self, request, doctor_id):
        try:
            api_client = APIClient()
            token = request.session.get('access_token')
            
            # Create doctor info from doctor_id
            doctor = {
                'id': doctor_id,
                'fullName': f"Doctor {doctor_id[:8]}",
                'email': f"doctor{doctor_id[:8]}@hospital.com",
                'username': f"doctor_{doctor_id[:8]}",
                'role': 'doctor',
                'specialization': 'General Medicine'
            }
            
            # Get date filter with defaults
            from datetime import datetime, timedelta
            today = datetime.now().date()

            date_filter = request.GET.get('date', '')
            date_from = request.GET.get('dateFrom', today.strftime('%Y-%m-%d'))
            date_to = request.GET.get('dateTo', (today + timedelta(days=30)).strftime('%Y-%m-%d'))

            # Get doctor schedule with required date parameters
            params = {
                'dateFrom': date_from,
                'dateTo': date_to
            }
            if date_filter:
                params['date'] = date_filter

            query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
            endpoint = f'/api/appointments/doctor/{doctor_id}/schedule?{query_string}'
            
            schedule_response = api_client._make_request('GET', endpoint, token=token)
            
            schedule = []
            if schedule_response.get('success'):
                schedule = schedule_response.get('data', [])
            
            context = {
                'doctor': doctor,
                'schedule': schedule,
                'date_filter': date_filter
            }
            
            return render(request, 'doctors/schedule.html', context)
            
        except Exception as e:
            logger.error(f"Error loading doctor schedule {doctor_id}: {str(e)}")

            # Create fallback doctor data
            doctor = {
                'id': doctor_id,
                'fullName': f"Doctor {doctor_id[:8]}",
                'email': f"doctor{doctor_id[:8]}@hospital.com",
                'username': f"doctor_{doctor_id[:8]}",
                'role': 'doctor',
                'specialization': 'General Medicine'
            }

            context = {
                'doctor': doctor,
                'schedule': [],
                'date_filter': request.GET.get('date', ''),
                'error_message': "Doctor schedule information could not be loaded. Please try again later."
            }

            return render(request, 'doctors/schedule.html', context)

class DoctorSearchAPIView(View):
    """API endpoint for doctor search - Public endpoint"""

    def get(self, request):
        try:
            api_client = APIClient()

            query = request.GET.get('q', '')
            limit = int(request.GET.get('limit', 5))

            if not query:
                return JsonResponse({'doctors': []})

            # Search doctors using the new doctors API
            doctors_response = api_client._make_request(
                'GET',
                f'/api/doctors?search={query}&limit={limit}',
                token=None  # Public endpoint
            )

            if not doctors_response.get('success'):
                return JsonResponse({'doctors': []})

            # Extract doctors data
            doctors_data = doctors_response.get('data', {})
            doctors = doctors_data.get('doctors', [])

            # Transform doctor data for frontend
            filtered_doctors = []
            for doctor in doctors:
                fullName = f"{doctor.get('firstName', '')} {doctor.get('lastName', '')}".strip()
                if not fullName:
                    fullName = doctor.get('username', 'Unknown Doctor')

                filtered_doctors.append({
                    'id': doctor.get('id'),
                    'userId': doctor.get('userId'),
                    'name': fullName,
                    'username': doctor.get('username'),
                    'specialization': doctor.get('specialization', 'General Medicine')
                })

            return JsonResponse({'doctors': filtered_doctors})

        except Exception as e:
            logger.error(f"Error searching doctors: {str(e)}")
            return JsonResponse({'doctors': []})


@method_decorator(login_required, name='dispatch')
class DoctorDeactivateView(View):
    """Doctor deactivation view (admin only)"""

    def post(self, request, doctor_id):
        token = request.session.get('access_token')
        user_role = request.session.get('user_role')

        if not token:
            return JsonResponse({'success': False, 'message': 'Authentication required'})

        # Check if user is admin
        if user_role != 'admin':
            return JsonResponse({'success': False, 'message': 'Only administrators can deactivate doctors'})

        try:
            # Get reason from request
            reason = request.POST.get('reason', 'Deactivated by administrator')

            # Create API client instance
            api_client = APIClient()

            # Deactivate doctor (user)
            response = api_client.deactivate_user(token=token, user_id=doctor_id, reason=reason)

            if response.get('success'):
                return JsonResponse({'success': True, 'message': 'Doctor deactivated successfully'})
            else:
                return JsonResponse({'success': False, 'message': response.get('message', 'Failed to deactivate doctor')})

        except Exception as e:
            logger.error(f"Error deactivating doctor {doctor_id}: {str(e)}")
            return JsonResponse({'success': False, 'message': 'Failed to deactivate doctor. Please try again.'})
