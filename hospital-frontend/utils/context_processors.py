"""
Context processors for Hospital Management Frontend
Add common data to all templates
"""

from django.conf import settings

def user_role(request):
    """
    Add user role and permissions to template context
    """
    context = {
        'user_role': request.session.get('user_role'),
        'user_full_name': request.session.get('user_full_name'),
        'username': request.session.get('username'),
        'user_email': request.session.get('user_email'),
        'user_id': request.session.get('user_id'),
        'is_admin': request.session.get('user_role') == 'admin',
        'is_staff': request.session.get('user_role') in ['admin', 'staff'],
        'is_doctor': request.session.get('user_role') in ['admin', 'staff', 'doctor'],
        'is_nurse': request.session.get('user_role') in ['admin', 'staff', 'doctor', 'nurse'],
        'is_patient': request.session.get('user_role') == 'patient',
        'is_authenticated': bool(request.session.get('access_token')),
    }

    # Add hospital settings
    context.update({
        'hospital_name': settings.HOSPITAL_SETTINGS.get('HOSPITAL_NAME'),
        'hospital_address': settings.HOSPITAL_SETTINGS.get('HOSPITAL_ADDRESS'),
        'hospital_phone': settings.HOSPITAL_SETTINGS.get('HOSPITAL_PHONE'),
        'hospital_email': settings.HOSPITAL_SETTINGS.get('HOSPITAL_EMAIL'),
    })

    # Add WebSocket URL for real-time features
    context['websocket_url'] = settings.WEBSOCKET_URL

    context['api_gateway_url'] = settings.API_GATEWAY_URL
    context['access_token'] = request.session.get('access_token')
    return context
