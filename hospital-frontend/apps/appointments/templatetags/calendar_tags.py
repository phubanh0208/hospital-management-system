from django import template
from datetime import datetime, timedelta
from django.conf import settings
from zoneinfo import ZoneInfo
import calendar
import logging

register = template.Library()
logger = logging.getLogger(__name__)

@register.simple_tag
def get_calendar(year, month):
    """Generate calendar data for the given year and month"""
    import logging
    logger = logging.getLogger(__name__)

    # Ensure year and month are integers
    try:
        if not year or not month:
            # Use current date as fallback
            now = datetime.now()
            year = now.year
            month = now.month
        else:
            year = int(year)
            month = int(month)
        logger.info(f"Calendar tag - year: {year} (type: {type(year)}), month: {month} (type: {type(month)})")
    except (ValueError, TypeError) as e:
        logger.error(f"Error converting year/month to int: {e}")
        # Use current date as fallback
        now = datetime.now()
        year = now.year
        month = now.month

    # Use simpler approach with calendar.monthcalendar
    cal = calendar.Calendar(firstweekday=6)  # Start with Sunday
    month_calendar = cal.monthdatescalendar(year, month)  # This returns actual date objects

    today = datetime.now().date()
    calendar_data = []

    for week in month_calendar:
        week_data = []
        for date_obj in week:
            is_current_month = date_obj.month == month
            week_data.append({
                'day': date_obj.day,
                'date': date_obj,
                'other_month': not is_current_month,
                'is_today': date_obj == today
            })
        calendar_data.append(week_data)

    return calendar_data

@register.filter
def get_item(dictionary, key):
    """Get item from dictionary by key"""
    if isinstance(dictionary, dict):
        return dictionary.get(key, [])
    return []

@register.filter
def parse_utc_datetime(value):
    """Parse UTC datetime string and convert to local timezone"""
    if not value:
        return None

    try:
        # Handle different datetime formats
        if isinstance(value, str):
            # Remove timezone info if present and parse as UTC
            if value.endswith('Z'):
                value = value[:-1]
            elif '+' in value or '-' in value.split('T')[-1]:
                # Remove timezone offset (handle both + and - offsets)
                if 'T' in value:
                    date_part, time_part = value.split('T')
                    # Remove timezone from time part
                    if '+' in time_part:
                        time_part = time_part.split('+')[0]
                    elif '-' in time_part and len(time_part.split('-')) > 1:
                        time_part = time_part.split('-')[0]
                    value = f"{date_part}T{time_part}"

            # Replace space with T if needed
            if ' ' in value and 'T' not in value:
                value = value.replace(' ', 'T')

            # Parse as UTC datetime
            dt = datetime.fromisoformat(value)

            # Make timezone-aware as UTC
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=ZoneInfo('UTC'))

            # Convert to local timezone
            local_tz = ZoneInfo(settings.TIME_ZONE)
            local_dt = dt.astimezone(local_tz)

            logger.debug(f"Datetime conversion: {value} -> UTC: {dt} -> Local: {local_dt}")
            return local_dt

        elif isinstance(value, datetime):
            # Already a datetime object, check if it's timezone-aware
            if value.tzinfo is None:
                # Assume it's already in local timezone if no timezone info
                local_tz = ZoneInfo(settings.TIME_ZONE)
                return value.replace(tzinfo=local_tz)
            else:
                # Convert to local timezone
                local_tz = ZoneInfo(settings.TIME_ZONE)
                return value.astimezone(local_tz)

        return value

    except Exception as e:
        logger.error(f"Error parsing datetime '{value}': {e}")
        return None

@register.filter
def format_local_date(value, format_string="F d, Y"):
    """Format datetime as local date"""
    parsed_dt = parse_utc_datetime(value)
    if parsed_dt:
        try:
            if format_string == "F d, Y":
                return parsed_dt.strftime("%B %d, %Y")
            elif format_string == "M d, Y":
                return parsed_dt.strftime("%b %d, %Y")
            elif format_string == "Y-m-d":
                return parsed_dt.strftime("%Y-%m-%d")
            else:
                return parsed_dt.strftime(format_string)
        except Exception as e:
            logger.error(f"Error formatting date '{value}' with format '{format_string}': {e}")
            return "Invalid date"
    return "Not scheduled"

@register.filter
def format_local_time(value, format_string="g:i A"):
    """Format datetime as local time"""
    parsed_dt = parse_utc_datetime(value)
    if parsed_dt:
        try:
            # Handle different format strings
            if format_string == "g:i A":
                # 12-hour format with AM/PM
                return parsed_dt.strftime("%I:%M %p").lstrip('0')
            elif format_string == "H:i":
                # 24-hour format
                return parsed_dt.strftime("%H:%M")
            elif format_string == "g:i":
                # 12-hour format without AM/PM
                return parsed_dt.strftime("%I:%M").lstrip('0')
            else:
                # Use the format string as-is
                return parsed_dt.strftime(format_string)
        except Exception as e:
            logger.error(f"Error formatting time '{value}' with format '{format_string}': {e}")
            return "Invalid time"
    return "Not scheduled"

@register.filter
def equals(value, arg):
    """Check if two values are equal"""
    return value == arg
