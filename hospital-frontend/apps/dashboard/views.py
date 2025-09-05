"""
Views for Dashboard app
"""

from django.shortcuts import render
from django.views import View
from django.contrib import messages
from django.utils.decorators import method_decorator
from utils.api_client import api_client
from utils.decorators import login_required
import logging

logger = logging.getLogger(__name__)

@method_decorator(login_required, name='dispatch')
class DashboardView(View):
    """
    Main dashboard view - role-based content
    """
    template_name = 'dashboard/index.html'
    
    def get(self, request):
        token = request.session.get('access_token')
        user_role = request.session.get('user_role')
        
        context = {
            'user_role': user_role,
        }
        
        # Get dashboard data from API
        context['dashboard_data'] = {}
        if user_role == 'admin':
            try:
                dashboard_response = api_client.get_dashboard_data(token)

                if dashboard_response.get('success'):
                    context['dashboard_data'] = dashboard_response.get('data', {})
                else:
                    messages.warning(request, 'Unable to load dashboard data.')
            except Exception as e:
                logger.error(f"Error loading dashboard data: {str(e)}")
        else:
            context['dashboard_data'] = {}
        
        # Role-specific data
        if user_role == 'admin':
            context.update(self._get_admin_data(token))
        elif user_role == 'staff':
            context.update(self._get_staff_data(token))
        elif user_role == 'doctor':
            context.update(self._get_doctor_data(token))
        elif user_role == 'nurse':
            context.update(self._get_nurse_data(token))
        elif user_role == 'patient':
            context.update(self._get_patient_data(token))
        
        return render(request, self.template_name, context)
    
    def _get_admin_data(self, token):
        """Get admin-specific dashboard data"""
        try:
            # Get recent users
            users_response = api_client.get_users(token, page=1, limit=5)
            recent_users = users_response.get('data', {}).get('users', []) if users_response.get('success') else []
            
            # Get monthly stats
            stats_response = api_client.get_monthly_stats(token, limit=6)
            monthly_stats = stats_response.get('data', {}).get('monthlyStats', []) if stats_response.get('success') else []
            
            return {
                'recent_users': recent_users,
                'monthly_stats': monthly_stats,
            }
        except Exception as e:
            logger.error(f"Error loading admin data: {str(e)}")
            return {'recent_users': [], 'monthly_stats': []}
    
    def _get_staff_data(self, token):
        """Get staff-specific dashboard data"""
        try:
            # Get recent patients
            patients_response = api_client.get_patients(token, page=1, limit=5)
            recent_patients = patients_response.get('data', {}).get('patients', []) if patients_response.get('success') else []
            
            # Get today's appointments
            appointments_response = api_client.get_appointments(token, limit=10)
            recent_appointments = appointments_response.get('data', {}).get('appointments', []) if appointments_response.get('success') else []
            
            return {
                'recent_patients': recent_patients,
                'recent_appointments': recent_appointments,
            }
        except Exception as e:
            logger.error(f"Error loading staff data: {str(e)}")
            return {'recent_patients': [], 'recent_appointments': []}
    
    def _get_doctor_data(self, token):
        """Get doctor-specific dashboard data"""
        try:
            # Get doctor's appointments
            appointments_response = api_client.get_appointments(token, limit=10)
            my_appointments = appointments_response.get('data', {}).get('appointments', []) if appointments_response.get('success') else []

            # Process appointment data for template filters
            for appointment in my_appointments:
                if appointment.get('scheduled_date'):
                    # Keep original string for template filters
                    appointment['scheduled_date_original'] = appointment['scheduled_date']

            # Get doctor's prescriptions
            prescriptions_response = api_client.get_prescriptions(token, limit=5)
            my_prescriptions = prescriptions_response.get('data', {}).get('prescriptions', []) if prescriptions_response.get('success') else []

            return {
                'my_appointments': my_appointments,
                'my_prescriptions': my_prescriptions,
            }
        except Exception as e:
            logger.error(f"Error loading doctor data: {str(e)}")
            return {'my_appointments': [], 'my_prescriptions': []}
    
    def _get_nurse_data(self, token):
        """Get nurse-specific dashboard data"""
        try:
            # Get assigned patients
            patients_response = api_client.get_patients(token, page=1, limit=10)
            assigned_patients = patients_response.get('data', {}).get('patients', []) if patients_response.get('success') else []
            
            # Get today's appointments
            appointments_response = api_client.get_appointments(token, limit=10)
            today_appointments = appointments_response.get('data', {}).get('appointments', []) if appointments_response.get('success') else []
            
            return {
                'assigned_patients': assigned_patients,
                'today_appointments': today_appointments,
            }
        except Exception as e:
            logger.error(f"Error loading nurse data: {str(e)}")
            return {'assigned_patients': [], 'today_appointments': []}
    
    def _get_patient_data(self, token):
        """Get patient-specific dashboard data"""
        try:
            # Get patient's appointments
            appointments_response = api_client.get_appointments(token, limit=5)
            my_appointments = appointments_response.get('data', {}).get('appointments', []) if appointments_response.get('success') else []

            # Process appointment data for template filters
            for appointment in my_appointments:
                if appointment.get('scheduled_date'):
                    # Keep original string for template filters
                    appointment['scheduled_date_original'] = appointment['scheduled_date']

            # Get patient's prescriptions
            prescriptions_response = api_client.get_prescriptions(token, limit=5)
            my_prescriptions = prescriptions_response.get('data', {}).get('prescriptions', []) if prescriptions_response.get('success') else []

            return {
                'my_appointments': my_appointments,
                'my_prescriptions': my_prescriptions,
            }
        except Exception as e:
            logger.error(f"Error loading patient data: {str(e)}")
            return {'my_appointments': [], 'my_prescriptions': []}

# Error handlers
def handler404(request, exception):
    """Custom 404 error handler"""
    return render(request, 'errors/404.html', status=404)

def handler500(request):
    """Custom 500 error handler"""
    return render(request, 'errors/500.html', status=500)
