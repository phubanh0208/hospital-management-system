"""
Views for Authentication app
"""

from django.shortcuts import render, redirect
from django.views import View
from django.contrib import messages
from django.urls import reverse_lazy
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect, csrf_exempt
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse
from django.conf import settings
from utils.api_client import api_client
from utils.decorators import login_required
from .forms import LoginForm, ChangePasswordForm, RegistrationForm, ProfileEditForm, ForgotPasswordForm
import logging
import json

logger = logging.getLogger(__name__)

@method_decorator([csrf_protect, never_cache], name='dispatch')
class LoginView(View):
    """
    User login view
    """
    template_name = 'authentication/login.html'
    form_class = LoginForm
    
    def get(self, request):
        # Redirect if already logged in
        if request.session.get('access_token'):
            return redirect('dashboard:index')
        
        form = self.form_class()
        return render(request, self.template_name, {'form': form})
    
    def post(self, request):
        form = self.form_class(request.POST)
        
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            remember_me = form.cleaned_data.get('remember_me', False)
            
            # Call API Gateway login
            response = api_client.login(username, password)
            
            if response.get('success'):
                # Login successful
                data = response.get('data', {})
                user = data.get('user', {})
                
                # Store tokens and user info in session
                request.session['access_token'] = data.get('accessToken')
                request.session['refresh_token'] = data.get('refreshToken')
                request.session['user_id'] = user.get('id')
                request.session['username'] = user.get('username')
                request.session['user_role'] = user.get('role')
                request.session['user_email'] = user.get('email')
                request.session['user_full_name'] = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip()
                
                # Set session expiry
                if remember_me:
                    request.session.set_expiry(86400 * 30)  # 30 days
                else:
                    request.session.set_expiry(86400)  # 1 day
                
                logger.info(f"User {username} logged in successfully with role {user.get('role')}")
                messages.success(request, f'Welcome back, {user.get("firstName", username)}!')
                
                # Redirect based on role
                next_url = request.GET.get('next')
                if next_url:
                    return redirect(next_url)
                else:
                    return redirect('dashboard:index')
            else:
                # Login failed
                error_message = response.get('message', 'Invalid username or password')
                messages.error(request, error_message)
                logger.warning(f"Failed login attempt for username: {username}")
        
        return render(request, self.template_name, {'form': form})

class LogoutView(View):
    """
    User logout view
    """
    
    def get(self, request):
        return self.post(request)
    
    def post(self, request):
        username = request.session.get('username', 'Unknown')
        
        # Clear session
        session_keys = [
            'access_token', 'refresh_token', 'user_id', 
            'username', 'user_role', 'user_email', 'user_full_name'
        ]
        for key in session_keys:
            if key in request.session:
                del request.session[key]
        
        request.session.flush()
        
        logger.info(f"User {username} logged out")
        messages.success(request, 'You have been logged out successfully.')
        return redirect('authentication:login')

class ProfileView(View):
    """
    User profile view - simplified without middleware dependency
    """
    template_name = 'authentication/profile.html'

    def get(self, request):
        # Check if user is logged in via session
        token = request.session.get('access_token')
        username = request.session.get('username')

        if not token and not username:
            messages.info(request, 'Please login to view your profile.')
            return redirect('authentication:login')

        # Try to get fresh profile data from API
        user_data = None
        api_error = None

        if token:
            try:
                logger.info(f"Getting profile for user: {username}")
                response = api_client.get_profile(token)
                # Avoid logging full response to prevent Unicode issues
                if response.get('success'):
                    logger.info("Profile API response: SUCCESS")
                    # Handle different response formats
                    data = response.get('data', {})
                    if 'user' in data:
                        user_data = data['user']
                    else:
                        user_data = data
                    logger.info(f"Profile data extracted for user: {user_data.get('username', 'unknown')}")
                else:
                    api_error = response.get('message', 'API returned error')
                    logger.error(f"Profile API error: {api_error}")

            except Exception as e:
                api_error = f"Connection error: {str(e)}"
                logger.error(f"Exception getting profile: {str(e)}")

        # Prepare context with both API data and session fallback
        context = {
            'user_data': user_data,
            'api_error': api_error,
            'session_data': {
                'username': request.session.get('username'),
                'user_email': request.session.get('user_email'),
                'user_role': request.session.get('user_role'),
                'user_id': request.session.get('user_id'),
                'user_full_name': request.session.get('user_full_name'),
            },
            'has_token': bool(token),
            'token_preview': token[:20] + '...' if token else 'None'
        }

        return render(request, self.template_name, context)


class RegisterView(View):
    """
    User registration view
    """
    template_name = 'authentication/register.html'

    def get(self, request):
        # Redirect if already logged in
        if request.session.get('access_token'):
            return redirect('dashboard:index')

        form = RegistrationForm()
        return render(request, self.template_name, {'form': form})

    def post(self, request):
        form = RegistrationForm(request.POST)

        if form.is_valid():
            try:
                # Prepare user data for API
                user_data = {
                    'username': form.cleaned_data['username'],
                    'email': form.cleaned_data['email'],
                    'password': form.cleaned_data['password'],
                    'role': form.cleaned_data['role'],
                    'profile': {
                        'firstName': form.cleaned_data['first_name'],
                        'lastName': form.cleaned_data['last_name'],
                        'phone': form.cleaned_data.get('phone', ''),
                        'dateOfBirth': form.cleaned_data['date_of_birth'].isoformat() if form.cleaned_data.get('date_of_birth') else None,
                        'address': form.cleaned_data.get('address', ''),
                        'avatarUrl': ''  # Will be added later with file upload
                    }
                }

                # Call API Gateway register endpoint
                response = api_client.register(user_data)
                logger.info(f"Registration API response: {response}")

                if response.get('success'):
                    messages.success(request, 'Registration successful! You can now login with your credentials.')
                    return redirect('authentication:login')
                else:
                    error_message = response.get('message', 'Registration failed. Please try again.')

                    # Handle validation errors from API
                    if 'errors' in response and isinstance(response['errors'], list):
                        for error in response['errors']:
                            messages.error(request, error)
                    else:
                        messages.error(request, error_message)

                    logger.error(f"Registration failed: {response}")

            except Exception as e:
                logger.error(f"Registration exception: {str(e)}")
                messages.error(request, 'Registration failed due to server error. Please try again.')

        return render(request, self.template_name, {'form': form})

@method_decorator(login_required, name='dispatch')
class ChangePasswordView(View):
    """
    Change password view
    """
    template_name = 'authentication/change_password.html'
    form_class = ChangePasswordForm
    
    def get(self, request):
        form = self.form_class()
        return render(request, self.template_name, {'form': form})
    
    def post(self, request):
        form = self.form_class(request.POST)

        if form.is_valid():
            try:
                current_password = form.cleaned_data['current_password']
                new_password = form.cleaned_data['new_password']

                # Prepare change password data
                change_password_data = {
                    'currentPassword': current_password,
                    'newPassword': new_password
                }

                logger.info(f"Attempting to change password for user {request.session.get('username')}")

                # Call API to change password
                token = request.session.get('access_token')
                response = api_client.change_password(token, change_password_data)

                if response.get('success'):
                    messages.success(request, 'Password changed successfully.')
                    logger.info(f"Password changed successfully for user {request.session.get('username')}")
                    return redirect('authentication:profile')
                else:
                    error_message = response.get('message', 'Password change failed')
                    messages.error(request, error_message)
                    logger.error(f"Password change failed: {error_message}")

            except Exception as e:
                logger.error(f"Change password exception: {str(e)}")
                messages.error(request, 'Password change failed due to server error. Please try again.')

        return render(request, self.template_name, {'form': form})


class ForgotPasswordView(View):
    """
    Forgot password view
    """
    template_name = 'authentication/forgot_password.html'
    form_class = ForgotPasswordForm

    def get(self, request):
        # Redirect if already logged in
        if request.session.get('access_token'):
            return redirect('dashboard:index')

        form = self.form_class()
        return render(request, self.template_name, {'form': form})

    def post(self, request):
        form = self.form_class(request.POST)

        if form.is_valid():
            try:
                email = form.cleaned_data['email']

                logger.info(f"Forgot password request for email: {email}")

                # Call API to send reset instructions
                response = api_client.forgot_password(email)

                if response.get('success'):
                    messages.success(request, 'If your email address exists in our system, you will receive password reset instructions shortly.')
                    logger.info(f"Forgot password request successful for email: {email}")
                    return redirect('authentication:login')
                else:
                    error_message = response.get('message', 'Password reset request failed')
                    messages.error(request, error_message)
                    logger.error(f"Forgot password request failed: {error_message}")

            except Exception as e:
                logger.error(f"Forgot password exception: {str(e)}")
                messages.error(request, 'Password reset request failed due to server error. Please try again.')

        return render(request, self.template_name, {'form': form})


class ResetPasswordView(View):
    """
    Reset password view
    """
    template_name = 'authentication/reset_password.html'

    def get(self, request):
        token = request.GET.get('token')

        if not token:
            messages.error(request, 'Invalid or missing reset token.')
            return redirect('authentication:login')

        return render(request, self.template_name, {'token': token})

    def post(self, request):
        token = request.GET.get('token') or request.POST.get('token')

        if not token:
            messages.error(request, 'Invalid or missing reset token.')
            return redirect('authentication:login')

        new_password = request.POST.get('newPassword')
        confirm_password = request.POST.get('confirmPassword')

        if new_password != confirm_password:
            messages.error(request, 'Passwords do not match.')
            return render(request, self.template_name, {'token': token})

        try:
            logger.info(f"Reset password request with token: {token[:8]}...")

            # Call API to reset password
            response = api_client.reset_password(token, new_password)

            if response.get('success'):
                messages.success(request, 'Password reset successfully! You can now login with your new password.')
                logger.info(f"Password reset successful for token: {token[:8]}...")
                return redirect('authentication:login')
            else:
                error_message = response.get('message', 'Password reset failed')
                messages.error(request, error_message)
                logger.error(f"Password reset failed: {error_message}")

        except Exception as e:
            logger.error(f"Reset password exception: {str(e)}")
            messages.error(request, 'Password reset failed due to server error. Please try again.')

        return render(request, self.template_name, {'token': token})


class ProfileEditView(View):
    """
    Profile editing view
    """
    template_name = 'authentication/profile_edit.html'

    def get(self, request):
        # Check if user is logged in
        if not request.session.get('access_token'):
            return redirect('authentication:login')

        try:
            # Get current user profile
            token = request.session.get('access_token')
            response = api_client.get_profile(token)

            if response.get('success'):
                user_data = response.get('data', {})
                form = ProfileEditForm(user_data=user_data)

                context = {
                    'form': form,
                    'user_data': user_data,
                    'hospital_name': getattr(settings, 'HOSPITAL_NAME', 'Hospital Management System')
                }
                return render(request, self.template_name, context)
            else:
                messages.error(request, 'Failed to load profile data')
                return redirect('authentication:profile')

        except Exception as e:
            logger.error(f"Profile edit GET error: {str(e)}")
            messages.error(request, 'Error loading profile edit form')
            return redirect('authentication:profile')

    def post(self, request):
        # Check if user is logged in
        if not request.session.get('access_token'):
            return redirect('authentication:login')

        form = ProfileEditForm(request.POST)

        if form.is_valid():
            try:
                # Prepare profile data for API - Auth Service expects nested profile object
                profile_fields = {
                    'firstName': form.cleaned_data['first_name'],
                    'lastName': form.cleaned_data['last_name'],
                    'phone': form.cleaned_data.get('phone', ''),
                    'address': form.cleaned_data.get('address', ''),
                    'avatarUrl': form.cleaned_data.get('avatar_url', ''),
                }

                # Handle date of birth
                if form.cleaned_data.get('date_of_birth'):
                    profile_fields['dateOfBirth'] = form.cleaned_data['date_of_birth'].isoformat()

                # Nest profile data as Auth Service expects
                profile_data = {
                    'profile': profile_fields
                }

                logger.info(f"Sending profile update data: {profile_data}")

                # Call API to update profile
                token = request.session.get('access_token')
                response = api_client.update_profile(token, profile_data)

                if response.get('success'):
                    messages.success(request, 'Profile updated successfully!')
                    return redirect('authentication:profile')
                else:
                    error_message = response.get('message', 'Profile update failed')
                    messages.error(request, error_message)

            except Exception as e:
                logger.error(f"Profile update error: {str(e)}")
                messages.error(request, 'Profile update failed due to server error')

        # If form is invalid or update failed, reload form with current data
        try:
            token = request.session.get('access_token')
            response = api_client.get_profile(token)
            user_data = response.get('data', {}) if response.get('success') else {}
        except:
            user_data = {}

        context = {
            'form': form,
            'user_data': user_data,
            'hospital_name': getattr(settings, 'HOSPITAL_NAME', 'Hospital Management System')
        }
        return render(request, self.template_name, context)


# Doctor Profile API Proxy Views

@csrf_exempt
@require_http_methods(["GET", "PUT"])
def doctor_profile_detail(request, user_id):
    """Get or update doctor profile by user ID"""
    try:
        if request.method == 'GET':
            response = api_client._make_request(
                'GET',
                f'/api/doctors/profile/{user_id}',
                token=None  # Public endpoint
            )
        elif request.method == 'PUT':
            data = json.loads(request.body)
            token = request.session.get('access_token')

            # Debug logging
            logger.info(f"PUT request for user {user_id}, token exists: {bool(token)}")

            # Check if user is authenticated
            if not token:
                return JsonResponse({
                    'success': False,
                    'message': 'Authentication required. Please login again.'
                }, status=401)

            response = api_client._make_request(
                'PUT',
                f'/api/doctors/profile/{user_id}',
                data=data,
                token=token
            )

        return JsonResponse(response)
    except Exception as e:
        logger.error(f"Error with doctor profile: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Error with doctor profile operation'
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def doctor_profile_create(request):
    """Create new doctor profile"""
    try:
        data = json.loads(request.body)
        token = request.session.get('access_token')

        # Check if user is authenticated
        if not token:
            return JsonResponse({
                'success': False,
                'message': 'Authentication required. Please login again.'
            }, status=401)

        response = api_client._make_request(
            'POST',
            '/api/doctors/profile',
            data=data,
            token=token
        )
        return JsonResponse(response)
    except Exception as e:
        logger.error(f"Error creating doctor profile: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Error creating doctor profile'
        }, status=500)

@csrf_exempt
@require_http_methods(["GET", "POST", "PUT"])
def doctor_my_profile(request):
    """Doctor's own profile management (GET, POST, PUT)"""
    try:
        token = request.session.get('access_token')

        # Debug logging
        logger.info(f"{request.method} request for my profile, token exists: {bool(token)}")

        # Check if user is authenticated
        if not token:
            return JsonResponse({
                'success': False,
                'message': 'Authentication required. Please login again.'
            }, status=401)

        if request.method == 'GET':
            response = api_client._make_request(
                'GET',
                '/api/doctors/my/profile',
                token=token
            )
        elif request.method in ['POST', 'PUT']:
            data = json.loads(request.body)

            response = api_client._make_request(
                request.method,
                '/api/doctors/my/profile',
                data=data,
                token=token
            )

        return JsonResponse(response)
    except Exception as e:
        logger.error(f"Error with my doctor profile: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Error with doctor profile operation'
        }, status=500)


