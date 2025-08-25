from django import template
from datetime import datetime, date
import re

register = template.Library()

@register.filter
def age(birth_date):
    """Calculate age from birth date string"""
    if not birth_date:
        return None
    
    try:
        # Handle different date formats
        if isinstance(birth_date, str):
            # Try ISO format first (YYYY-MM-DD)
            if re.match(r'\d{4}-\d{2}-\d{2}', birth_date):
                birth_date = datetime.strptime(birth_date[:10], '%Y-%m-%d').date()
            # Try DD/MM/YYYY format
            elif re.match(r'\d{2}/\d{2}/\d{4}', birth_date):
                birth_date = datetime.strptime(birth_date, '%d/%m/%Y').date()
            # Try MM/DD/YYYY format
            elif re.match(r'\d{2}/\d{2}/\d{4}', birth_date):
                birth_date = datetime.strptime(birth_date, '%m/%d/%Y').date()
            else:
                return None
        elif isinstance(birth_date, datetime):
            birth_date = birth_date.date()
        elif not isinstance(birth_date, date):
            return None
        
        today = date.today()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        return age
    except (ValueError, TypeError):
        return None

@register.filter
def patient_age(patient):
    """Get patient age from patient object"""
    if not patient:
        return None
    
    # Try direct age field first
    if hasattr(patient, 'age') and patient.age:
        return patient.age
    
    # Try dateOfBirth field
    if hasattr(patient, 'dateOfBirth') and patient.dateOfBirth:
        return age(patient.dateOfBirth)
    
    # Try date_of_birth field (alternative naming)
    if hasattr(patient, 'date_of_birth') and patient.date_of_birth:
        return age(patient.date_of_birth)
    
    # If patient is a dict
    if isinstance(patient, dict):
        if 'age' in patient and patient['age']:
            return patient['age']
        if 'dateOfBirth' in patient and patient['dateOfBirth']:
            return age(patient['dateOfBirth'])
        if 'date_of_birth' in patient and patient['date_of_birth']:
            return age(patient['date_of_birth'])
    
    return None

@register.filter
def parse_iso_date(value):
    """Parse ISO date string to datetime object"""
    if not value:
        return None

    try:
        # Handle ISO format with timezone
        if isinstance(value, str):
            # Remove 'Z' and parse
            if value.endswith('Z'):
                value = value[:-1] + '+00:00'

            # Parse the datetime
            dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
            return dt
        return value
    except (ValueError, AttributeError):
        return None

@register.filter
def format_date(value, format_string="d/m/Y"):
    """Format date with fallback for ISO strings"""
    if not value:
        return "N/A"

    # Try to parse if it's a string
    if isinstance(value, str):
        parsed_date = parse_iso_date(value)
        if parsed_date:
            return parsed_date.strftime(format_string.replace('d', '%d').replace('m', '%m').replace('Y', '%Y'))

    # If it's already a datetime object
    if hasattr(value, 'strftime'):
        return value.strftime(format_string.replace('d', '%d').replace('m', '%m').replace('Y', '%Y'))

    return "N/A"

@register.filter
def format_datetime(value, format_string="d/m/Y H:i"):
    """Format datetime with fallback for ISO strings"""
    if not value:
        return "N/A"

    # Try to parse if it's a string
    if isinstance(value, str):
        parsed_date = parse_iso_date(value)
        if parsed_date:
            format_py = format_string.replace('d', '%d').replace('m', '%m').replace('Y', '%Y').replace('H', '%H').replace('i', '%M')
            return parsed_date.strftime(format_py)

    # If it's already a datetime object
    if hasattr(value, 'strftime'):
        format_py = format_string.replace('d', '%d').replace('m', '%m').replace('Y', '%Y').replace('H', '%H').replace('i', '%M')
        return value.strftime(format_py)

    return "N/A"
