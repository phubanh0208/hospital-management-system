from django import template
from datetime import datetime, date
from dateutil.parser import parse
import logging
import json

register = template.Library()
logger = logging.getLogger(__name__)

@register.filter
def calculate_age(birth_date):
    """Calculate age from birth date string or datetime object"""
    try:
        if isinstance(birth_date, str):
            # Extract just the date part to avoid timezone issues
            if 'T' in birth_date:
                date_part = birth_date.split('T')[0]  # Get "1993-01-14" from "1993-01-14T17:00:00.000Z"
                birth_date = datetime.strptime(date_part, '%Y-%m-%d').date()
            else:
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

@register.filter
def iso_to_date(value, fmt="F d, Y"):
    """Parse ISO 8601 datetime string and format as date only (ignoring time/timezone).
    Usage: {{ patient.dateOfBirth|iso_to_date:"F d, Y" }}
    This avoids timezone conversion issues by extracting only the date part.
    """
    if not value:
        return ""
    try:
        if isinstance(value, str):
            # Extract just the date part from ISO string (before 'T')
            if 'T' in value:
                date_part = value.split('T')[0]  # Get "1993-01-14" from "1993-01-14T17:00:00.000Z"
            else:
                date_part = value
            
            # Parse as date only (no time/timezone)
            dt = datetime.strptime(date_part, '%Y-%m-%d')
        elif isinstance(value, datetime):
            dt = value
        else:
            return ""
        
        # Format the date
        if fmt == "F d, Y":
            return dt.strftime("%B %d, %Y")  # "February 09, 2003"
        else:
            return dt.strftime(fmt)
    except Exception as e:
        logger.error(f"iso_to_date parse error: {e}; value={value}")
        return ""

@register.filter
def generate_page_numbers(pagination, current_page):
    """Generate page numbers for pagination with ellipsis for large page counts"""
    if not pagination or 'totalPages' not in pagination:
        return []
    
    total_pages = pagination['totalPages']
    current_page = int(current_page)
    
    if total_pages <= 7:
        # If 7 or fewer pages, show all page numbers
        return list(range(1, total_pages + 1))
    
    # For more than 7 pages, show smart pagination with ellipsis
    page_numbers = []
    
    # Always show first page
    page_numbers.append(1)
    
    if current_page <= 4:
        # Show pages 2, 3, 4, 5, 6, 7, ..., last
        for i in range(2, min(7, total_pages)):
            page_numbers.append(i)
        if total_pages > 7:
            page_numbers.append('...')
            page_numbers.append(total_pages)
    elif current_page >= total_pages - 3:
        # Show first, ..., last-6, last-5, last-4, last-3, last-2, last-1, last
        page_numbers.append('...')
        for i in range(max(2, total_pages - 6), total_pages):
            page_numbers.append(i)
        page_numbers.append(total_pages)
    else:
        # Show first, ..., current-1, current, current+1, ..., last
        page_numbers.append('...')
        for i in range(current_page - 1, current_page + 2):
            page_numbers.append(i)
        page_numbers.append('...')
        page_numbers.append(total_pages)
    
    return page_numbers

@register.filter
def add_number(value, arg):
    """Add a number to the value"""
    try:
        return int(value) + int(arg)
    except (ValueError, TypeError):
        return value

@register.filter
def subtract_number(value, arg):
    """Subtract a number from the value"""
    try:
        return int(value) - int(arg)
    except (ValueError, TypeError):
        return value
