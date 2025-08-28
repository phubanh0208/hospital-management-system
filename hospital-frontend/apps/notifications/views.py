from django.shortcuts import render, redirect
from django.views import View
from django.contrib import messages
from utils.decorators import login_required
from django.utils.decorators import method_decorator
from utils.api_client import api_client
import logging

logger = logging.getLogger(__name__)

@method_decorator(login_required, name='dispatch')
class NotificationListView(View):
    def get(self, request):
        token = request.session.get('access_token')
        page = int(request.GET.get('page', 1))
        limit = 15  # Show more items per page than the dropdown

        try:
            response = api_client.get_notifications(
                token,
                page=page,
                limit=limit,
                userId=request.session.get('user_id')
            )

            if response.get('success'):
                data = response.get('data', {}) or {}
                notifications = data.get('notifications', [])
                pagination = data.get('pagination', {})

                # Build a safe page_range for template (avoid custom filter dependency)
                total_pages = int(pagination.get('totalPages', 1) or 1)
                page_range = list(range(1, total_pages + 1))

                context = {
                    'notifications': notifications,
                    'pagination': pagination,
                    'current_page': page,
                    'page_range': page_range,
                }
                return render(request, 'notifications/notification_list.html', context)
            else:
                messages.error(request, f"Failed to load notifications: {response.get('message', 'Unknown error')}")
                return render(request, 'notifications/notification_list.html', {'notifications': []})

        except Exception as e:
            logger.error(f"Error loading notifications page: {str(e)}")
            messages.error(request, 'An error occurred while trying to fetch your notifications.')
            return redirect('dashboard:index')

