"""
Custom decorators for Hospital Management Frontend
Role-based access control and authentication
"""

from functools import wraps
from django.shortcuts import redirect
from django.contrib import messages
from django.http import HttpResponseForbidden
from django.urls import reverse
import logging

logger = logging.getLogger(__name__)

def login_required(view_func):
    """
    Decorator to require user login
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.session.get('access_token'):
            messages.warning(request, 'Please login to access this page.')
            return redirect('authentication:login')
        return view_func(request, *args, **kwargs)
    return wrapper

def role_required(allowed_roles):
    """
    Decorator to require specific user roles
    Usage: @role_required(['admin', 'staff'])
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Check if user is logged in
            if not request.session.get('access_token'):
                messages.warning(request, 'Please login to access this page.')
                return redirect('authentication:login')
            
            # Check user role
            user_role = request.session.get('user_role')
            if user_role not in allowed_roles:
                logger.warning(f"Access denied for user {request.session.get('username')} with role {user_role}")
                messages.error(request, 'You do not have permission to access this page.')
                return HttpResponseForbidden('Access denied')
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

def admin_required(view_func):
    """
    Decorator to require admin role
    """
    return role_required(['admin'])(view_func)

def staff_or_admin_required(view_func):
    """
    Decorator to require staff or admin role
    """
    return role_required(['admin', 'staff'])(view_func)

def medical_staff_required(view_func):
    """
    Decorator to require medical staff (admin, staff, doctor, nurse)
    """
    return role_required(['admin', 'staff', 'doctor', 'nurse'])(view_func)

def doctor_required(view_func):
    """
    Decorator to require doctor role
    """
    return role_required(['admin', 'staff', 'doctor'])(view_func)

def patient_or_staff_required(view_func):
    """
    Decorator for views that patients can access their own data
    or staff can access all data
    """
    return role_required(['admin', 'staff', 'doctor', 'nurse', 'patient'])(view_func)

def ajax_login_required(view_func):
    """
    Decorator for AJAX views that require login
    Returns JSON response instead of redirect
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.session.get('access_token'):
            from django.http import JsonResponse
            return JsonResponse({
                'success': False,
                'message': 'Authentication required',
                'redirect': reverse('authentication:login')
            }, status=401)
        return view_func(request, *args, **kwargs)
    return wrapper

def ajax_role_required(allowed_roles):
    """
    Decorator for AJAX views that require specific roles
    Returns JSON response instead of redirect
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Check if user is logged in
            if not request.session.get('access_token'):
                from django.http import JsonResponse
                return JsonResponse({
                    'success': False,
                    'message': 'Authentication required',
                    'redirect': reverse('authentication:login')
                }, status=401)

            # Check user role
            user_role = request.session.get('user_role')
            if user_role not in allowed_roles:
                from django.http import JsonResponse
                return JsonResponse({
                    'success': False,
                    'message': 'Access denied. Insufficient permissions.',
                }, status=403)

            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

def doctor_own_data_required(view_func):
    """
    Decorator for views where doctors should only see their own data
    Automatically adds doctor_id filter for doctors
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        user_role = request.session.get('user_role')
        user_id = request.session.get('user_id')

        if user_role == 'doctor':
            # Add doctor filter to GET parameters (use camelCase for API compatibility)
            request.GET = request.GET.copy()
            if 'doctorId' not in request.GET and 'doctor_id' not in request.GET:
                request.GET['doctorId'] = user_id
                logger.info(f"Added doctorId filter: {user_id} for doctor {request.session.get('username')}")

        return view_func(request, *args, **kwargs)
    return wrapper

def patient_own_data_required(view_func):
    """
    Decorator for views where patients should only see their own data
    Automatically adds patient_id filter for patients
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        user_role = request.session.get('user_role')
        user_id = request.session.get('user_id')

        if user_role == 'patient':
            # Add patient filter to GET parameters (use camelCase for API compatibility)
            request.GET = request.GET.copy()
            if 'patientId' not in request.GET and 'patient_id' not in request.GET:
                request.GET['patientId'] = user_id
                logger.info(f"Added patientId filter: {user_id} for patient {request.session.get('username')}")

        return view_func(request, *args, **kwargs)
    return wrapper

def read_only_for_role(restricted_roles):
    """
    Decorator to make views read-only for specific roles
    Redirects POST/PUT/DELETE requests with error message
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            user_role = request.session.get('user_role')

            if user_role in restricted_roles and request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
                from django.contrib import messages
                messages.error(request, f'{user_role.title()} role has read-only access to this resource.')

                # Redirect to list view or previous page
                from django.http import HttpResponseRedirect
                return HttpResponseRedirect(request.META.get('HTTP_REFERER', '/'))

            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

def hide_doctors_list_for_doctors(view_func):
    """
    Decorator to prevent doctors from accessing doctors list
    Doctors should not see other doctors
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        user_role = request.session.get('user_role')

        if user_role == 'doctor':
            from django.contrib import messages
            from django.shortcuts import redirect
            messages.warning(request, 'Doctors cannot access the doctors list.')
            return redirect('dashboard:index')

        return view_func(request, *args, **kwargs)
    return wrapper

def handle_api_errors(view_func):
    """
    Decorator to handle API errors and display appropriate messages
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        try:
            return view_func(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error in view {view_func.__name__}: {str(e)}")
            messages.error(request, 'An unexpected error occurred. Please try again.')
            return redirect('dashboard:index')
    return wrapper
