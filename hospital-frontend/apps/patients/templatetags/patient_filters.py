from django import template
from datetime import datetime, date
from dateutil.parser import parse
import logging

register = template.Library()
logger = logging.getLogger(__name__)

@register.filter
def calculate_age(birth_date):
    """Calculate age from birth date string or datetime object"""
    try:
        if isinstance(birth_date, str):
            # Parse ISO date string
            birth_date = parse(birth_date).date()
        elif isinstance(birth_date, datetime):
            birth_date = birth_date.date()
        elif not isinstance(birth_date, date):
            return "N/A"
        
        today = date.today()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        return age
    except Exception as e:
        logger.error(f"Error calculating age: {e}")
        return "N/A"

@register.filter
def format_phone(phone):
    """Format phone number for display"""
    if not phone:
        return ""
    
    # Remove all non-digit characters
    digits = ''.join(filter(str.isdigit, phone))
    
    if digits.startswith('84'):
        # Vietnamese international format
        return f"+{digits[:2]} {digits[2:5]} {digits[5:8]} {digits[8:]}"
    elif digits.startswith('0') and len(digits) == 10:
        # Vietnamese local format
        return f"{digits[:4]} {digits[4:7]} {digits[7:]}"
    else:
        return phone

@register.filter
def format_address(address):
    """Format address object for display"""
    if not address or not isinstance(address, dict):
        return ""
    
    parts = []
    if address.get('street'):
        parts.append(address['street'])
    if address.get('ward'):
        parts.append(address['ward'])
    if address.get('district'):
        parts.append(address['district'])
    if address.get('city'):
        parts.append(address['city'])
    
    return ', '.join(parts)

@register.filter
def blood_type_color(blood_type):
    """Get Bootstrap color class for blood type"""
    if not blood_type:
        return "secondary"
    
    color_map = {
        'A+': 'danger',
        'A-': 'danger',
        'B+': 'warning',
        'B-': 'warning', 
        'AB+': 'info',
        'AB-': 'info',
        'O+': 'success',
        'O-': 'success'
    }
    
    return color_map.get(blood_type, 'secondary')

@register.filter
def gender_icon(gender):
    """Get FontAwesome icon for gender"""
    if not gender:
        return "fas fa-question"
    
    icon_map = {
        'male': 'fas fa-mars',
        'female': 'fas fa-venus',
        'other': 'fas fa-genderless'
    }
    
    return icon_map.get(gender.lower(), 'fas fa-question')
