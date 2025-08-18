"""
Custom template filters for date handling
"""

from django import template
from django.utils import timezone
from datetime import datetime, timezone as dt_timezone
import re

register = template.Library()

@register.filter
def parse_iso_date(value):
    """
    Parse ISO date string and return formatted date
    """
    if not value:
        return "Not available"
    
    try:
        # Handle ISO format like "2025-08-08T19:56:07.320Z"
        if isinstance(value, str):
            # Remove milliseconds and Z if present
            clean_value = re.sub(r'\.\d+Z?$', '', value)
            if clean_value.endswith('Z'):
                clean_value = clean_value[:-1]
            
            # Parse the datetime
            dt = datetime.fromisoformat(clean_value)
            
            # Make it timezone aware if it isn't
            if dt.tzinfo is None:
                dt = timezone.make_aware(dt, dt_timezone.utc)
            
            # Format for display
            return dt.strftime("%b %d, %Y %H:%M")
        
        return value
        
    except (ValueError, TypeError):
        return "Invalid date"

@register.filter
def format_date_of_birth(value):
    """
    Format date of birth from various formats
    """
    if not value:
        return "Not provided"
    
    try:
        if isinstance(value, str):
            # Handle different date formats
            if 'T' in value:  # ISO format
                dt = datetime.fromisoformat(value.replace('Z', ''))
            else:  # Simple date format
                dt = datetime.strptime(value, "%Y-%m-%d")
            
            return dt.strftime("%b %d, %Y")
        
        return value
        
    except (ValueError, TypeError):
        return "Invalid date"

@register.filter
def safe_get(dictionary, key):
    """
    Safely get value from dictionary
    """
    if isinstance(dictionary, dict):
        return dictionary.get(key, "Not available")
    return "Not available"
