from django import template
from datetime import datetime, timedelta
import calendar

register = template.Library()

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
