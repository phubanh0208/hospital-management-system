"""
Custom middleware for Hospital Management Frontend
"""

from django.utils.deprecation import MiddlewareMixin
from django.shortcuts import redirect
from django.contrib import messages
from django.urls import reverse
from .api_client import api_client
import logging

logger = logging.getLogger(__name__)

class APIAuthMiddleware(MiddlewareMixin):
    """
    Middleware to handle API authentication and token refresh
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        """
        Process request to check and refresh tokens if needed
        """
        # Skip authentication for certain URLs
        skip_urls = [
            '/auth/login/',
            '/auth/register/',
            '/admin/',
            '/static/',
            '/media/',
        ]

        if any(request.path.startswith(url) for url in skip_urls):
            return None

        # Check if user has access token
        access_token = request.session.get('access_token')
        refresh_token = request.session.get('refresh_token')

        if access_token:
            try:
                # Verify token by getting user profile
                profile_response = api_client.get_profile(access_token)

                if not profile_response.get('success'):
                    # Token might be expired, try to refresh
                    if refresh_token:
                        refresh_response = api_client.refresh_token(refresh_token)

                        if refresh_response.get('success'):
                            # Update session with new tokens
                            data = refresh_response.get('data', {})
                            request.session['access_token'] = data.get('accessToken')
                            request.session['refresh_token'] = data.get('refreshToken')
                            logger.info(f"Token refreshed for user {request.session.get('username')}")
                        else:
                            # Refresh failed, clear session and redirect to login
                            self._clear_session(request)
                            if not request.path.startswith('/auth/'):
                                messages.warning(request, 'Your session has expired. Please login again.')
                                return redirect('authentication:login')
                    else:
                        # No refresh token, clear session
                        self._clear_session(request)
                        if not request.path.startswith('/auth/'):
                            messages.warning(request, 'Please login to continue.')
                            return redirect('authentication:login')
                else:
                    # Token is valid, update user info in session
                    user_data = profile_response.get('data', {})
                    if isinstance(user_data, dict):
                        # Handle both formats: {'user': {...}} and direct user data
                        if 'user' in user_data:
                            user_info = user_data.get('user', {})
                        else:
                            user_info = user_data

                        request.session['user_id'] = user_info.get('id')
                        request.session['username'] = user_info.get('username')
                        request.session['user_role'] = user_info.get('role')
                        request.session['user_email'] = user_info.get('email')
                        first_name = user_info.get('firstName', '')
                        last_name = user_info.get('lastName', '')
                        request.session['user_full_name'] = f"{first_name} {last_name}".strip() or user_info.get('username', '')
            except Exception as e:
                logger.error(f"Error in middleware: {str(e)}")
                # On error, clear session and redirect to login
                self._clear_session(request)
                if not request.path.startswith('/auth/'):
                    messages.error(request, 'Authentication error. Please login again.')
                    return redirect('authentication:login')
        else:
            # No access token, redirect to login for protected pages
            if not request.path.startswith('/auth/'):
                messages.info(request, 'Please login to access this page.')
                return redirect('authentication:login')

        return None
    
    def _clear_session(self, request):
        """Clear user session data"""
        session_keys = [
            'access_token', 'refresh_token', 'user_id', 
            'username', 'user_role', 'user_email', 'user_full_name'
        ]
        for key in session_keys:
            if key in request.session:
                del request.session[key]
