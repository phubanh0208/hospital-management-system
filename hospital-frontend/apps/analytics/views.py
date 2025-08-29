from django.shortcuts import render, redirect
from django.contrib import messages
from django.utils.decorators import method_decorator
from django.views import View
from django.http import JsonResponse
import logging

from utils.api_client import APIClient
from utils.decorators import login_required, role_required

logger = logging.getLogger(__name__)

@method_decorator(login_required, name='dispatch')
@method_decorator(role_required(['admin', 'staff']), name='dispatch')
class AnalyticsDashboardView(View):
    """General analytics dashboard view"""
    def get(self, request):
        return render(request, 'analytics/dashboard.html')


@method_decorator(login_required, name='dispatch')
@method_decorator(role_required(['admin', 'staff', 'doctor']), name='dispatch')
class DoctorAnalyticsView(View):
    """Doctor analytics dashboard view"""

    def get(self, request, doctor_id=None):
        try:
            token = request.session.get('access_token')
            user_role = request.session.get('user_role')
            user_id = request.session.get('user_id')

            if not token:
                messages.error(request, 'Please login to access analytics.')
                return redirect('auth:login')

            api_client = APIClient(token=token)

            # If no doctor_id provided and user is doctor, use their own ID
            if not doctor_id and user_role == 'doctor':
                doctor_id = user_id
            elif not doctor_id:
                messages.error(request, 'Doctor ID is required.')
                return redirect('dashboard:index')

            # Get all doctor analytics data from the single, refactored endpoint
            response = api_client.get_doctor_dashboard(token=token, doctor_id=doctor_id)

            if not response.get('success'):
                messages.error(request, 'Failed to load analytics data for the doctor.')
                logger.error(f"Doctor analytics API failed for doctor {doctor_id}: {response.get('message', 'Unknown error')}")
                return redirect('dashboard:index')

            dashboard_data = response.get('data', {}).get('dashboard', {})




            context = {
                'doctor_id': doctor_id,
                'dashboard': dashboard_data,
                'user_role': user_role,
                'is_own_dashboard': user_role == 'doctor' and user_id == doctor_id
            }

            return render(request, 'analytics/doctor_dashboard.html', context)

        except Exception as e:
            logger.error(f"Error loading doctor analytics: {str(e)}")
            messages.error(request, 'Failed to load analytics data. Please try again.')
            return redirect('dashboard:index')


@method_decorator(login_required, name='dispatch')
@method_decorator(role_required(['admin', 'staff']), name='dispatch')
class AdminAnalyticsView(View):
    """Admin analytics dashboard view"""

    def get(self, request):
        try:
            token = request.session.get('access_token')

            if not token:
                messages.error(request, 'Please login to access analytics.')
                return redirect('auth:login')

            api_client = APIClient(token=token)

            # Get all admin analytics data from the single, refactored endpoint
            response = api_client.get_admin_dashboard(token=token)

            if not response.get('success'):
                messages.error(request, 'Failed to load analytics data from the API.')
                logger.error(f"Admin analytics API failed: {response.get('message', 'Unknown error')}")
                return redirect('dashboard:index')

            # Extract the main dashboard data object
            dashboard_data = response.get('data', {}).get('dashboard', {})



            context = {
                'dashboard': dashboard_data,
                'user_role': request.session.get('user_role')
            }

            return render(request, 'analytics/admin_dashboard.html', context)

        except Exception as e:
            logger.error(f"Error loading admin analytics: {str(e)}")
            messages.error(request, 'Failed to load analytics data. Please try again.')
            return redirect('dashboard:index')


@method_decorator(login_required, name='dispatch')
@method_decorator(role_required(['admin', 'staff', 'doctor']), name='dispatch')
class AnalyticsAPIView(View):
    """API endpoint for analytics data (AJAX requests)"""

    def get(self, request):
        try:
            token = request.session.get('access_token')
            user_role = request.session.get('user_role')
            user_id = request.session.get('user_id')

            if not token:
                return JsonResponse({'success': False, 'message': 'Authentication required'})

            api_client = APIClient(token=token)
            endpoint = request.GET.get('endpoint')
            doctor_id = request.GET.get('doctor_id')

            if endpoint == 'doctor_dashboard' and doctor_id:
                # Check permissions
                if user_role == 'doctor' and user_id != doctor_id:
                    return JsonResponse({'success': False, 'message': 'Access denied'})

                response = api_client.get_doctor_dashboard(token=token, doctor_id=doctor_id)
                return JsonResponse(response)

            elif endpoint == 'admin_dashboard' and user_role == 'admin':
                response = api_client.get_admin_dashboard(token=token)
                return JsonResponse(response)

            elif endpoint == 'doctor_patients' and doctor_id:
                if user_role == 'doctor' and user_id != doctor_id:
                    return JsonResponse({'success': False, 'message': 'Access denied'})

                response = api_client.get_doctor_patients_analytics(token=token, doctor_id=doctor_id)
                return JsonResponse(response)

            elif endpoint == 'appointment_trends' and doctor_id:
                if user_role == 'doctor' and user_id != doctor_id:
                    return JsonResponse({'success': False, 'message': 'Access denied'})

                response = api_client.get_doctor_appointment_trends(token=token, doctor_id=doctor_id)
                return JsonResponse(response)

            else:
                return JsonResponse({'success': False, 'message': 'Invalid endpoint or missing parameters'})

        except Exception as e:
            logger.error(f"Error in analytics API: {str(e)}")
            return JsonResponse({'success': False, 'message': 'Failed to fetch analytics data'})
