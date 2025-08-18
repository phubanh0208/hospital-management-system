"""
Test views for debugging API connection
"""

from django.shortcuts import render
from django.views import View
from django.http import JsonResponse
from utils.api_client import api_client
import logging

logger = logging.getLogger(__name__)

class APITestView(View):
    """
    Test API connection
    """

    def get(self, request):
        # Test API Gateway health
        try:
            # Test health endpoint (no auth required)
            health_response = api_client._make_request('GET', '/health')

            # Test login
            login_response = api_client.login('admin', 'Admin123!@#')

            # Test profile with token
            profile_response = None
            if login_response.get('success'):
                token = login_response.get('data', {}).get('accessToken')
                if token:
                    profile_response = api_client.get_profile(token)

            context = {
                'health_response': health_response,
                'login_response': login_response,
                'profile_response': profile_response,
                'api_base_url': api_client.base_url,
                'session_data': {
                    'access_token': request.session.get('access_token', 'None')[:20] + '...' if request.session.get('access_token') else 'None',
                    'username': request.session.get('username'),
                    'user_role': request.session.get('user_role'),
                    'user_email': request.session.get('user_email'),
                }
            }

            return JsonResponse(context, json_dumps_params={'indent': 2})

        except Exception as e:
            logger.error(f"API Test error: {str(e)}")
            return JsonResponse({
                'error': str(e),
                'api_base_url': api_client.base_url,
            }, status=500)
