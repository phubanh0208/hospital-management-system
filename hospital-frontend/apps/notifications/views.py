import requests
import json
from django.shortcuts import render, redirect
from django.views import View
from django.http import JsonResponse
from django.contrib import messages
from django.conf import settings
from utils.decorators import login_required, admin_required
from django.utils.decorators import method_decorator
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

@method_decorator(login_required, name='dispatch')
class NotificationListView(View):
    def get(self, request):
        # Fetch user notifications from API Gateway
        notifications = []
        unread_count = 0
        
        try:
            # Get notifications for user
            api_url = f"{settings.API_GATEWAY_URL}/api/notifications"
            headers = {'Authorization': f'Bearer {request.session.get("access_token")}'}
            params = {
                'userId': request.user.id,
                'page': request.GET.get('page', 1),
                'limit': request.GET.get('limit', 20)
            }
            
            response = requests.get(api_url, headers=headers, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json().get('data', {})
                notifications = data.get('notifications', [])
                pagination = data.get('pagination', {})
            else:
                messages.error(request, 'Failed to load notifications')
                
            # Get unread count
            unread_url = f"{settings.API_GATEWAY_URL}/api/notifications/unread-count"
            unread_response = requests.get(unread_url, headers=headers, params={'userId': request.user.id}, timeout=5)
            
            if unread_response.status_code == 200:
                unread_count = unread_response.json().get('data', {}).get('unreadCount', 0)
                
        except requests.RequestException:
            messages.error(request, 'Unable to connect to notification service')
            notifications = []
            pagination = {}
        
        context = {
            'is_admin': request.user.role == 'admin' if hasattr(request.user, 'role') else False,
            'notifications': notifications,
            'unread_count': unread_count,
            'pagination': pagination if 'pagination' in locals() else {},
            'current_user_id': request.user.id
        }
        return render(request, 'notifications/list.html', context)

@method_decorator(admin_required, name='dispatch')
class NotificationAdminView(View):
    """Admin-only view for managing notification retries"""
    
    def get(self, request):
        # Get retry statistics from backend
        try:
            api_url = f"{settings.API_GATEWAY_URL}/api/notifications/admin/retry-stats"
            headers = {'Authorization': f'Bearer {request.session.get("access_token")}'}
            response = requests.get(api_url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                stats = response.json().get('statistics', {})
            else:
                stats = {}
                messages.error(request, 'Failed to load retry statistics')
                
        except requests.RequestException:
            stats = {}
            messages.error(request, 'Unable to connect to notification service')
        
        context = {
            'stats': stats,
            'page_title': 'Notification Administration'
        }
        return render(request, 'notifications/admin.html', context)

@method_decorator([login_required, admin_required], name='dispatch')
class ProcessRetriesView(View):
    """Handle manual retry processing"""
    
    def post(self, request):
        try:
            api_url = f"{settings.API_GATEWAY_URL}/api/notifications/admin/process-retries"
            headers = {
                'Authorization': f'Bearer {request.session.get("access_token")}',
                'Content-Type': 'application/json'
            }
            data = {'force': request.POST.get('force', 'false').lower() == 'true'}
            
            response = requests.post(api_url, headers=headers, json=data, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                processed = result.get('processed', 0)
                messages.success(request, f'Successfully processed {processed} retry attempts')
            else:
                messages.error(request, 'Failed to process retries')
                
        except requests.RequestException as e:
            messages.error(request, f'Error processing retries: {str(e)}')
        
        return redirect('notifications:admin')

@method_decorator([login_required, admin_required], name='dispatch') 
class CleanupRetriesView(View):
    """Handle cleanup of old retry records"""
    
    def post(self, request):
        try:
            api_url = f"{settings.API_GATEWAY_URL}/api/notifications/admin/cleanup-retries"
            headers = {
                'Authorization': f'Bearer {request.session.get("access_token")}',
                'Content-Type': 'application/json'
            }
            data = {
                'olderThanDays': int(request.POST.get('older_than_days', 30)),
                'includeFailedPermanently': request.POST.get('include_failed', 'false').lower() == 'true'
            }
            
            response = requests.post(api_url, headers=headers, json=data, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                cleaned = result.get('deletedCount', 0)
                messages.success(request, f'Successfully cleaned up {cleaned} old retry records')
            else:
                messages.error(request, 'Failed to cleanup retry records')
                
        except (requests.RequestException, ValueError) as e:
            messages.error(request, f'Error during cleanup: {str(e)}')
        
        return redirect('notifications:admin')

@method_decorator([login_required, admin_required], name='dispatch')
class SendTestNotificationView(View):
    """Send test notification"""
    
    def post(self, request):
        try:
            api_url = f"{settings.API_GATEWAY_URL}/api/notifications/admin/test-notification"
            headers = {
                'Authorization': f'Bearer {request.session.get("access_token")}',
                'Content-Type': 'application/json'
            }
            data = {
                'type': 'test',
                'channels': request.POST.getlist('channels'),
                'recipient': request.POST.get('recipient'),
                'subject': request.POST.get('subject', 'Test Notification'),
                'message': request.POST.get('message', 'This is a test notification.')
            }
            
            response = requests.post(api_url, headers=headers, json=data, timeout=30)
            
            if response.status_code == 200:
                messages.success(request, 'Test notification sent successfully')
            else:
                messages.error(request, 'Failed to send test notification')
                
        except requests.RequestException as e:
            messages.error(request, f'Error sending test notification: {str(e)}')
        
        return redirect('notifications:admin')

@require_http_methods(["GET"])
@login_required
@admin_required
def retry_stats_api(request):
    """API endpoint for real-time retry statistics"""
    try:
        api_url = f"{settings.API_GATEWAY_URL}/api/notifications/admin/retry-stats"
        headers = {'Authorization': f'Bearer {request.session.get("access_token")}'}
        response = requests.get(api_url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            return JsonResponse(response.json())
        else:
            return JsonResponse({'error': 'Failed to fetch statistics'}, status=500)
            
    except requests.RequestException:
        return JsonResponse({'error': 'Service unavailable'}, status=503)

@require_http_methods(["PUT"])
@login_required
@csrf_exempt
def mark_notification_read(request, notification_id):
    """Mark notification as read"""
    try:
        api_url = f"{settings.API_GATEWAY_URL}/api/notifications/{notification_id}/read"
        headers = {
            'Authorization': f'Bearer {request.session.get("access_token")}',
            'Content-Type': 'application/json'
        }
        data = {'userId': request.user.id}
        
        response = requests.put(api_url, headers=headers, json=data, timeout=10)
        
        if response.status_code == 200:
            return JsonResponse({'success': True, 'message': 'Notification marked as read'})
        else:
            return JsonResponse({'success': False, 'error': 'Failed to mark as read'}, status=400)
            
    except requests.RequestException as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@require_http_methods(["GET"])
@login_required
def notifications_api(request):
    """API endpoint to fetch user notifications"""
    try:
        api_url = f"{settings.API_GATEWAY_URL}/api/notifications"
        headers = {'Authorization': f'Bearer {request.session.get("access_token")}'}
        params = {
            'userId': request.user.id,
            'page': request.GET.get('page', 1),
            'limit': request.GET.get('limit', 20),
            'status': request.GET.get('status'),  # unread, read, all
            'type': request.GET.get('type')  # appointment, prescription, etc.
        }
        
        # Remove None values
        params = {k: v for k, v in params.items() if v is not None}
        
        response = requests.get(api_url, headers=headers, params=params, timeout=10)
        
        if response.status_code == 200:
            return JsonResponse(response.json())
        else:
            return JsonResponse({'error': 'Failed to fetch notifications'}, status=500)
            
    except requests.RequestException:
        return JsonResponse({'error': 'Service unavailable'}, status=503)

@require_http_methods(["GET"])
@login_required
def unread_count_api(request):
    """Get unread notification count for user"""
    try:
        api_url = f"{settings.API_GATEWAY_URL}/api/notifications/unread-count"
        headers = {'Authorization': f'Bearer {request.session.get("access_token")}'}
        params = {'userId': request.user.id}
        
        response = requests.get(api_url, headers=headers, params=params, timeout=10)
        
        if response.status_code == 200:
            return JsonResponse(response.json())
        else:
            return JsonResponse({'error': 'Failed to fetch unread count'}, status=500)
            
    except requests.RequestException:
        return JsonResponse({'error': 'Service unavailable'}, status=503)
