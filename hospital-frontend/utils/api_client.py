"""
API Client for communicating with Hospital Management API Gateway v2.2.0
Handles all HTTP requests to backend services
"""

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import json
from typing import Dict, Any, Optional, Union, List, Union
from django.conf import settings
from django.contrib import messages
import logging

logger = logging.getLogger(__name__)

class APIClient:
    """
    Client for communicating with Hospital Management API Gateway
    """
    
    def __init__(self, token: Optional[str] = None):
        self.base_url = settings.API_GATEWAY_BASE_URL
        self.timeout = settings.API_GATEWAY_TIMEOUT
        self.token = token
        self.session = requests.Session()
        # Set connection timeout and keep-alive
        self.session.headers.update({
            'Connection': 'keep-alive',
            'User-Agent': 'Hospital-Management-Frontend/1.0'
        })
        
    def _get_headers(self, token: Optional[str] = None) -> Dict[str, str]:
        """Get headers for API requests"""
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
            
        return headers
    
    def _handle_response(self, response: requests.Response) -> Dict[str, Any]:
        """Handle API response and extract data"""
        try:
            data = response.json()
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON response: {response.text}")
            return {
                'success': False,
                'message': 'Invalid response from server',
                'data': None
            }
        
        if not response.ok:
            logger.error(f"API Error {response.status_code}: {data}")
            
        return data
    
    def _make_request(self, method: str, endpoint: str, token: Optional[str] = None,
                     data: Optional[Dict] = None, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Make HTTP request to API Gateway"""
        url = f"{self.base_url}{endpoint}"
        headers = self._get_headers(token)

        # Log API requests for debugging
        logger.debug(f"API Request: {method} {url}")

        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=headers, params=params, timeout=self.timeout)
            elif method.upper() == 'POST':
                response = self.session.post(url, headers=headers, json=data, timeout=self.timeout)
            elif method.upper() == 'PUT':
                response = self.session.put(url, headers=headers, json=data, timeout=self.timeout)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=headers, timeout=self.timeout)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
                
            return self._handle_response(response)
            
        except requests.exceptions.Timeout:
            logger.error(f"Request timeout for {url}")
            return {
                'success': False,
                'message': 'Request timeout. The server is taking too long to respond.',
                'data': None
            }
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Connection error for {url}: {str(e)}")
            return {
                'success': False,
                'message': 'Unable to connect to API server. Please ensure the API Gateway is running on http://localhost:3000',
                'data': None
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error for {url}: {str(e)}")
            return {
                'success': False,
                'message': f'Network error: {str(e)}',
                'data': None
            }
        except Exception as e:
            logger.error(f"Unexpected error for {url}: {str(e)}")
            return {
                'success': False,
                'message': f'Unexpected error: {str(e)}',
                'data': None
            }

    # Direct API calls (bypass API Gateway)
    def get_direct(self, url: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make direct GET request to service URL"""
        return self._make_direct_request('GET', url, params=params)

    def post_direct(self, url: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make direct POST request to service URL"""
        return self._make_direct_request('POST', url, data=data)

    def put_direct(self, url: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make direct PUT request to service URL"""
        return self._make_direct_request('PUT', url, data=data)

    def delete_direct(self, url: str) -> Dict[str, Any]:
        """Make direct DELETE request to service URL"""
        return self._make_direct_request('DELETE', url)

    def _make_direct_request(self, method: str, url: str, data: Optional[Dict[str, Any]] = None, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make direct request to service (bypass API Gateway)"""
        try:
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }

            # Add Authorization header if token is available
            if self.token:
                headers['Authorization'] = f'Bearer {self.token}'

            logger.info(f"Direct API Request: {method} {url}")
            logger.info(f"Headers: {headers}")

            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=self.timeout)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=self.timeout)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data, timeout=self.timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=self.timeout)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            return self._handle_response(response)

        except requests.exceptions.Timeout:
            logger.error(f"Request timeout for {url}")
            return {
                'success': False,
                'message': 'Request timeout. The server is taking too long to respond.',
                'data': None
            }
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Connection error for {url}: {str(e)}")
            return {
                'success': False,
                'message': f'Unable to connect to service at {url}. Please ensure the service is running.',
                'data': None
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error for {url}: {str(e)}")
            return {
                'success': False,
                'message': f'Network error: {str(e)}',
                'data': None
            }
        except Exception as e:
            logger.error(f"Unexpected error for {url}: {str(e)}")
            return {
                'success': False,
                'message': f'Unexpected error: {str(e)}',
                'data': None
            }

    # Authentication Methods
    def login(self, username: str, password: str) -> Dict[str, Any]:
        """Login user"""
        return self._make_request('POST', '/api/auth/login', data={
            'username': username,
            'password': password
        })

    def register(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Register new user with profile information"""
        return self._make_request('POST', '/api/auth/register', data=user_data)
    
    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token"""
        return self._make_request('POST', '/api/auth/refresh', data={
            'refreshToken': refresh_token
        })
    
    def get_profile(self, token: str) -> Dict[str, Any]:
        """Get user profile"""
        logger.info(f"Getting profile with token: {token[:20]}...")
        response = self._make_request('GET', '/api/auth/profile', token=token)
        # Avoid logging full response to prevent Unicode issues
        if response.get('success'):
            logger.info("Profile retrieved successfully")
        else:
            logger.error(f"Profile retrieval failed: {response.get('message', 'Unknown error')}")
        return response

    def update_profile(self, token: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user profile"""
        logger.info(f"Updating profile with data: {profile_data}")
        response = self._make_request('PUT', '/api/auth/profile', token=token, data=profile_data)
        logger.info(f"Profile update response: {response}")
        return response

    def change_password(self, token: str, password_data: Dict[str, Any]) -> Dict[str, Any]:
        """Change user password"""
        logger.info(f"Attempting to change password for user")
        response = self._make_request('POST', '/api/auth/change-password', token=token, data=password_data)
        logger.info(f"Change password response: {response}")
        return response

    def forgot_password(self, email: str) -> Dict[str, Any]:
        """Request password reset"""
        logger.info(f"Requesting password reset for email: {email}")
        response = self._make_request('POST', '/api/auth/forgot-password', data={'email': email})
        logger.info(f"Forgot password response: {response}")
        return response

    def reset_password(self, token: str, new_password: str) -> Dict[str, Any]:
        """Reset password with token"""
        logger.info(f"Resetting password with token: {token[:8]}...")
        response = self._make_request('POST', '/api/auth/reset-password', data={
            'token': token,
            'newPassword': new_password
        })
        logger.info(f"Reset password response: {response}")
        return response
    
    # User Management Methods (Admin only)
    def get_users(self, token: str, page: int = 1, limit: int = 20, 
                 search: Optional[str] = None, role: Optional[str] = None, 
                 is_active: Optional[bool] = None) -> Dict[str, Any]:
        """Get all users with advanced filtering"""
        params = {'page': page, 'limit': limit}
        if search:
            params['search'] = search
        if role:
            params['role'] = role
        if is_active is not None:
            params['isActive'] = is_active
        
        logger.info(f"Getting users with params: {params}")
        response = self._make_request('GET', '/api/users', token=token, params=params)
        logger.info(f"Get users response success: {response.get('success', False)}")
        return response
    
    def get_user_by_id(self, token: str, user_id: str) -> Dict[str, Any]:
        """Get user by ID"""
        logger.info(f"Getting user by ID: {user_id}")
        response = self._make_request('GET', f'/api/users/{user_id}', token=token)
        logger.info(f"Get user by ID response success: {response.get('success', False)}")
        return response
    
    def create_user(self, token: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new user"""
        logger.info(f"Creating user with username: {user_data.get('username', 'N/A')}")
        response = self._make_request('POST', '/api/users', token=token, data=user_data)
        logger.info(f"Create user response success: {response.get('success', False)}")
        return response
    
    def update_user(self, token: str, user_id: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user"""
        logger.info(f"Updating user: {user_id}")
        response = self._make_request('PUT', f'/api/users/{user_id}', token=token, data=user_data)
        logger.info(f"Update user response success: {response.get('success', False)}")
        return response
    
    def delete_user(self, token: str, user_id: str) -> Dict[str, Any]:
        """Delete user"""
        logger.info(f"Deleting user: {user_id}")
        response = self._make_request('DELETE', f'/api/users/{user_id}', token=token)
        logger.info(f"Delete user response success: {response.get('success', False)}")
        return response
    
    def activate_user(self, token: str, user_id: str, reason: Optional[str] = None) -> Dict[str, Any]:
        """Activate user"""
        logger.info(f"Activating user: {user_id}")
        data = {'reason': reason} if reason else {}
        response = self._make_request('POST', f'/api/users/{user_id}/activate', token=token, data=data)
        logger.info(f"Activate user response success: {response.get('success', False)}")
        return response
    
    def deactivate_user(self, token: str, user_id: str, reason: Optional[str] = None) -> Dict[str, Any]:
        """Deactivate user"""
        logger.info(f"Deactivating user: {user_id}")
        data = {'reason': reason} if reason else {}
        response = self._make_request('POST', f'/api/users/{user_id}/deactivate', token=token, data=data)
        logger.info(f"Deactivate user response success: {response.get('success', False)}")
        return response
    
    def search_users(self, token: str, search_term: str, role_filter: Optional[str] = None, 
                    status_filter: Optional[bool] = None, page: int = 1, limit: int = 20) -> Dict[str, Any]:
        """Search users with filters"""
        params = {
            'search': search_term,
            'page': page,
            'limit': limit
        }
        if role_filter:
            params['role'] = role_filter
        if status_filter is not None:
            params['isActive'] = status_filter
            
        logger.info(f"Searching users with term: '{search_term}' and params: {params}")
        response = self._make_request('GET', '/api/users', token=token, params=params)
        logger.info(f"Search users response success: {response.get('success', False)}")
        return response
    

    
    # Appointment Methods
    def get_appointments(self, token: str, **params) -> Dict[str, Any]:
        """Get appointments with filters"""
        return self._make_request('GET', '/api/appointments', token=token, params=params)
    
    def create_appointment(self, token: str, appointment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new appointment"""
        return self._make_request('POST', '/api/appointments', token=token, data=appointment_data)
    
    def get_appointment_slots(self, token: str, doctor_id: str, date: str) -> Dict[str, Any]:
        """Get available appointment slots"""
        return self._make_request('GET', f'/api/appointment-slots/available/{doctor_id}/{date}', token=token)
    
    def check_appointment_conflicts(self, token: str, doctor_id: str, date: str, time: str) -> Dict[str, Any]:
        """Check appointment conflicts"""
        params = {'doctorId': doctor_id, 'date': date, 'time': time}
        return self._make_request('GET', '/api/appointments/conflicts', token=token, params=params)
    
    # Medication Methods
    def search_medications(self, token: str, search_term: str) -> Dict[str, Any]:
        """Search medications"""
        return self._make_request('GET', f'/api/medications/search/{search_term}', token=token)
    
    def get_medications(self, token: str, **params) -> Dict[str, Any]:
        """Get medications with filters"""
        return self._make_request('GET', '/api/medications', token=token, params=params)
    
    # Prescription Methods
    def get_prescriptions(self, token: str, **params) -> Dict[str, Any]:
        """Get prescriptions with filters"""
        return self._make_request('GET', '/api/prescriptions', token=token, params=params)
    
    def create_prescription(self, token: str, prescription_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new prescription"""
        return self._make_request('POST', '/api/prescriptions', token=token, data=prescription_data)
    
    # Notification Methods
    def get_notifications(self, token: str, **params) -> Dict[str, Any]:
        """Get notifications"""
        return self._make_request('GET', '/api/notifications', token=token, params=params)
    
    def send_notification(self, token: str, notification_data: Dict[str, Any]) -> Dict[str, Any]:
        """Send notification"""
        return self._make_request('POST', '/api/notifications/async', token=token, data=notification_data)
    
    # Analytics Methods
    def get_dashboard_data(self, token: str) -> Dict[str, Any]:
        """Get dashboard analytics"""
        return self._make_request('GET', '/api/analytics/dashboard', token=token)
    
    def get_monthly_stats(self, token: str, year: Optional[int] = None, limit: int = 12) -> Dict[str, Any]:
        """Get monthly statistics"""
        params = {'limit': limit}
        if year:
            params['year'] = year
        return self._make_request('GET', '/api/analytics/patients/monthly', token=token, params=params)

    # Doctor Analytics Methods
    def get_doctor_dashboard(self, token: str, doctor_id: str, days: int = 30) -> Dict[str, Any]:
        """Get doctor-specific dashboard"""
        params = {'days': days}
        return self._make_request('GET', f'/api/analytics/dashboard/doctor/{doctor_id}', token=token, params=params)

    def get_doctor_patients_analytics(self, token: str, doctor_id: str, days: int = 30) -> Dict[str, Any]:
        """Get doctor's patients analytics"""
        params = {'days': days}
        return self._make_request('GET', f'/api/analytics/doctors/{doctor_id}/patients', token=token, params=params)

    def get_doctor_appointment_trends(self, token: str, doctor_id: str, days: int = 30) -> Dict[str, Any]:
        """Get doctor's appointment trends"""
        params = {'days': days}
        return self._make_request('GET', f'/api/analytics/doctors/{doctor_id}/appointments/trends', token=token, params=params)

    # Admin Analytics Methods
    def get_admin_dashboard(self, token: str, days: int = 30) -> Dict[str, Any]:
        """Get admin-specific dashboard"""
        params = {'days': days}
        return self._make_request('GET', '/api/analytics/dashboard/admin', token=token, params=params)

    def get_doctor_performance(self, token: str, doctor_id: Optional[str] = None, days: int = 30) -> Dict[str, Any]:
        """Get doctor performance metrics"""
        params = {'days': days}
        if doctor_id:
            params['doctorId'] = doctor_id
        return self._make_request('GET', '/api/analytics/doctors/performance', token=token, params=params)

    def get_prescription_reports(self, token: str, year: Optional[int] = None, limit: int = 12) -> Dict[str, Any]:
        """Get prescription reports"""
        params = {'limit': limit}
        if year:
            params['year'] = year
        return self._make_request('GET', '/api/analytics/prescriptions/reports', token=token, params=params)

    def get_appointment_stats(self, token: str, days: int = 30) -> Dict[str, Any]:
        """Get appointment statistics"""
        params = {'days': days}
        return self._make_request('GET', '/api/analytics/appointments/stats', token=token, params=params)

    # Patient Service Methods
    def get_patients(self, token: str, page: int = 1, limit: int = 10, search: Optional[str] = None,
                    sort_by: Optional[str] = None, sort_order: str = 'asc') -> Dict[str, Any]:
        """Get all patients with pagination and search"""
        params = {
            'page': page,
            'limit': limit,
            'sortBy': sort_by or 'fullName',
            'sortOrder': sort_order
        }
        if search:
            params['search'] = search
        return self._make_request('GET', '/api/patients', token=token, params=params)

    def get_patient(self, token: str, patient_id: str) -> Dict[str, Any]:
        """Get patient by ID"""
        return self._make_request('GET', f'/api/patients/{patient_id}', token=token)

    def get_patient_by_code(self, token: str, patient_code: str) -> Dict[str, Any]:
        """Get patient by patient code"""
        return self._make_request('GET', f'/api/patients/code/{patient_code}', token=token)

    def create_patient(self, token: str, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new patient"""
        return self._make_request('POST', '/api/patients', token=token, data=patient_data)

    def update_patient(self, token: str, patient_id: str, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update patient"""
        return self._make_request('PUT', f'/api/patients/{patient_id}', token=token, data=patient_data)

    def delete_patient(self, token: str, patient_id: str) -> Dict[str, Any]:
        """Delete patient (soft delete)"""
        return self._make_request('DELETE', f'/api/patients/{patient_id}', token=token)

    def get_patient_medical_history(self, token: str, patient_id: str) -> Dict[str, Any]:
        """Get patient medical history"""
        return self._make_request('GET', f'/api/patients/{patient_id}/medical-history', token=token)

    def add_patient_medical_history(self, token: str, patient_id: str, history_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add patient medical history entry"""
        return self._make_request('POST', f'/api/patients/{patient_id}/medical-history', token=token, data=history_data)

    def get_patient_visit_summary(self, token: str, patient_id: str) -> Dict[str, Any]:
        """Get patient visit summary"""
        return self._make_request('GET', f'/api/patients/{patient_id}/visit-summary', token=token)

    # Doctor Methods
    def get_doctor_by_id(self, token: str, doctor_id: str) -> Dict[str, Any]:
        """Get doctor by ID using profile endpoint (for current user)"""
        # For current user, use profile endpoint which doesn't require admin permissions
        return self.get_profile(token)



# Global API client instance
api_client = APIClient()
