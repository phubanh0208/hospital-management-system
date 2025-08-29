from django.shortcuts import render, redirect, get_object_or_404
from django.views import View
from django.views.generic import CreateView, UpdateView
from django.http import JsonResponse, Http404
from django.contrib import messages
from django.utils.decorators import method_decorator
from django.core.paginator import Paginator
from django.urls import reverse_lazy, reverse
from utils.decorators import admin_required, ajax_login_required
from utils.api_client import api_client
import logging
import json

logger = logging.getLogger(__name__)

@method_decorator(admin_required, name='dispatch')
class UserListView(View):
    """List all users with search and filtering capabilities"""
    
    def get(self, request):
        token = request.session.get('access_token')
        if not token:
            messages.error(request, 'Please login to access user management.')
            return redirect('authentication:login')
        
        # Get query parameters
        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 20))
        search = request.GET.get('search', '').strip()
        role_filter = request.GET.get('role', '').strip()
        status_filter = request.GET.get('status', '').strip()
        
        # Convert status filter to boolean
        is_active_filter = None
        if status_filter == 'active':
            is_active_filter = True
        elif status_filter == 'inactive':
            is_active_filter = False
        
        # API call to get users
        response = api_client.get_users(
            token=token,
            page=page,
            limit=limit,
            search=search if search else None,
            role=role_filter if role_filter else None,
            is_active=is_active_filter
        )
        
        users = []
        total_users = 0
        total_pages = 1
        
        if response.get('success'):
            data = response.get('data', {})
            users = data.get('users', [])
            pagination = data.get('pagination', {})
            total_users = pagination.get('total', 0)
            total_pages = pagination.get('totalPages', 1)
        else:
            messages.error(request, f"Failed to load users: {response.get('message', 'Unknown error')}")
        
        # Role choices for filter dropdown
        role_choices = [
            ('admin', 'Administrator'),
            ('doctor', 'Doctor'),
            ('nurse', 'Nurse'),
            ('staff', 'Staff'),
            ('patient', 'Patient'),
        ]
        
        # Status choices for filter dropdown
        status_choices = [
            ('active', 'Active'),
            ('inactive', 'Inactive'),
        ]
        
        # Create page range for pagination
        page_range = list(range(1, total_pages + 1))
        
        context = {
            'users': users,
            'total_users': total_users,
            'current_page': page,
            'total_pages': total_pages,
            'page_range': page_range,
            'has_previous': page > 1,
            'has_next': page < total_pages,
            'previous_page': page - 1 if page > 1 else None,
            'next_page': page + 1 if page < total_pages else None,
            'search_query': search,
            'role_filter': role_filter,
            'status_filter': status_filter,
            'role_choices': role_choices,
            'status_choices': status_choices,
            'limit': limit,
        }
        
        return render(request, 'users/list.html', context)


@method_decorator(admin_required, name='dispatch')
class UserDetailView(View):
    """View and edit user details"""
    
    def get(self, request, user_id):
        token = request.session.get('access_token')
        if not token:
            messages.error(request, 'Please login to access user management.')
            return redirect('authentication:login')
        
        # Get user details
        response = api_client.get_user_by_id(token=token, user_id=user_id)
        
        if not response.get('success'):
            messages.error(request, f"Failed to load user: {response.get('message', 'Unknown error')}")
            return redirect('users:list')
        
        user_data = response.get('data')
        if not user_data:
            messages.error(request, 'User not found.')
            return redirect('users:list')
        
        context = {
            'user': user_data,
            'user_id': user_id,
        }
        
        return render(request, 'users/detail.html', context)
    
    def post(self, request, user_id):
        """Handle user update"""
        token = request.session.get('access_token')
        if not token:
            return JsonResponse({'success': False, 'message': 'Authentication required'})
        
        try:
            # Get form data
            username = request.POST.get('username', '').strip()
            email = request.POST.get('email', '').strip()
            role = request.POST.get('role', '').strip()
            is_active = request.POST.get('is_active') == 'on'
            
            # Profile data
            first_name = request.POST.get('first_name', '').strip()
            last_name = request.POST.get('last_name', '').strip()
            phone = request.POST.get('phone', '').strip()
            address = request.POST.get('address', '').strip()
            
            # Prepare update data
            update_data = {
                'username': username,
                'email': email,
                'role': role,
                'isActive': is_active,
                'profile': {
                    'firstName': first_name,
                    'lastName': last_name,
                    'phone': phone,
                    'address': address,
                }
            }
            
            # Remove empty fields
            update_data = {k: v for k, v in update_data.items() if v}
            if 'profile' in update_data:
                update_data['profile'] = {k: v for k, v in update_data['profile'].items() if v}
                if not update_data['profile']:
                    del update_data['profile']
            
            # API call to update user
            response = api_client.update_user(token=token, user_id=user_id, user_data=update_data)
            
            if response.get('success'):
                messages.success(request, 'User updated successfully!')
                return redirect('users:detail', user_id=user_id)
            else:
                messages.error(request, f"Failed to update user: {response.get('message', 'Unknown error')}")
                
        except Exception as e:
            logger.error(f"Error updating user {user_id}: {str(e)}")
            messages.error(request, 'An unexpected error occurred while updating the user.')
        
        return redirect('users:detail', user_id=user_id)


@method_decorator(admin_required, name='dispatch')
class UserCreateView(View):
    """Create new user"""
    
    def get(self, request):
        # Role choices for form
        role_choices = [
            ('admin', 'Administrator'),
            ('doctor', 'Doctor'),
            ('nurse', 'Nurse'),
            ('staff', 'Staff'),
            ('patient', 'Patient'),
        ]
        
        context = {
            'role_choices': role_choices,
        }
        
        return render(request, 'users/create.html', context)
    
    def post(self, request):
        token = request.session.get('access_token')
        if not token:
            messages.error(request, 'Please login to create users.')
            return redirect('authentication:login')
        
        try:
            # Get form data
            username = request.POST.get('username', '').strip()
            email = request.POST.get('email', '').strip()
            password = request.POST.get('password', '').strip()
            role = request.POST.get('role', '').strip()
            is_active = request.POST.get('is_active') == 'on'
            
            # Profile data
            first_name = request.POST.get('first_name', '').strip()
            last_name = request.POST.get('last_name', '').strip()
            phone = request.POST.get('phone', '').strip()
            address = request.POST.get('address', '').strip()
            
            # Basic validation
            if not username or not email or not role:
                messages.error(request, 'Username, email, and role are required.')
                return redirect('users:create')
            
            # Prepare user data
            user_data = {
                'username': username,
                'email': email,
                'role': role,
                'isActive': is_active,
                'profile': {
                    'firstName': first_name,
                    'lastName': last_name,
                    'phone': phone,
                    'address': address,
                }
            }

            # Add password if provided
            if password:
                user_data['password'] = password
            
            # API call to create user
            response = api_client.create_user(token=token, user_data=user_data)
            
            if response.get('success'):
                messages.success(request, f'User "{username}" created successfully!')
                user_id = response.get('data', {}).get('id')
                if user_id:
                    return redirect('users:detail', user_id=user_id)
                else:
                    return redirect('users:list')
            else:
                messages.error(request, f"Failed to create user: {response.get('message', 'Unknown error')}")
                
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            messages.error(request, 'An unexpected error occurred while creating the user.')
        
        return redirect('users:create')


@method_decorator(admin_required, name='dispatch')
class UserDeleteView(View):
    """Delete user"""
    
    def post(self, request, user_id):
        token = request.session.get('access_token')
        if not token:
            return JsonResponse({'success': False, 'message': 'Authentication required'})
        
        try:
            # Get user details first for confirmation
            user_response = api_client.get_user_by_id(token=token, user_id=user_id)
            if not user_response.get('success'):
                return JsonResponse({
                    'success': False, 
                    'message': 'User not found'
                })
            
            user_data = user_response.get('data')
            username = user_data.get('username', 'Unknown')
            
            # API call to delete user
            response = api_client.delete_user(token=token, user_id=user_id)
            
            if response.get('success'):
                messages.success(request, f'User "{username}" deleted successfully!')
                return JsonResponse({
                    'success': True,
                    'message': 'User deleted successfully',
                    'redirect': reverse('users:list')
                })
            else:
                return JsonResponse({
                    'success': False,
                    'message': response.get('message', 'Failed to delete user')
                })
                
        except Exception as e:
            logger.error(f"Error deleting user {user_id}: {str(e)}")
            return JsonResponse({
                'success': False,
                'message': 'An unexpected error occurred while deleting the user'
            })


@method_decorator(admin_required, name='dispatch')
class UserStatusToggleView(View):
    """Toggle user active status"""
    
    def post(self, request, user_id):
        token = request.session.get('access_token')
        if not token:
            return JsonResponse({'success': False, 'message': 'Authentication required'})
        
        try:
            action = request.POST.get('action')  # 'activate' or 'deactivate'
            reason = request.POST.get('reason', '').strip()
            
            if action not in ['activate', 'deactivate']:
                return JsonResponse({'success': False, 'message': 'Invalid action'})
            
            # Get user details first
            user_response = api_client.get_user_by_id(token=token, user_id=user_id)
            if not user_response.get('success'):
                return JsonResponse({'success': False, 'message': 'User not found'})
            
            user_data = user_response.get('data')
            username = user_data.get('username', 'Unknown')
            
            # API call to change status
            if action == 'activate':
                response = api_client.activate_user(token=token, user_id=user_id, reason=reason)
                success_message = f'User "{username}" activated successfully!'
            else:
                response = api_client.deactivate_user(token=token, user_id=user_id, reason=reason)
                success_message = f'User "{username}" deactivated successfully!'
            
            if response.get('success'):
                messages.success(request, success_message)
                return JsonResponse({
                    'success': True,
                    'message': success_message,
                    'new_status': action == 'activate'
                })
            else:
                return JsonResponse({
                    'success': False,
                    'message': response.get('message', f'Failed to {action} user')
                })
                
        except Exception as e:
            logger.error(f"Error changing status for user {user_id}: {str(e)}")
            return JsonResponse({
                'success': False,
                'message': 'An unexpected error occurred while changing user status'
            })


@method_decorator(ajax_login_required, name='dispatch')
class UserSearchView(View):
    """AJAX endpoint for user search"""
    
    def get(self, request):
        token = request.session.get('access_token')
        
        search_term = request.GET.get('q', '').strip()
        role_filter = request.GET.get('role', '').strip()
        status_filter = request.GET.get('status', '').strip()
        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 20))
        
        if not search_term and not role_filter and not status_filter:
            return JsonResponse({'success': False, 'message': 'Search term or filter required'})
        
        # Convert status filter
        is_active_filter = None
        if status_filter == 'active':
            is_active_filter = True
        elif status_filter == 'inactive':
            is_active_filter = False
        
        # API call
        response = api_client.search_users(
            token=token,
            search_term=search_term,
            role_filter=role_filter if role_filter else None,
            status_filter=is_active_filter,
            page=page,
            limit=limit
        )
        
        if response.get('success'):
            data = response.get('data', {})
            return JsonResponse({
                'success': True,
                'users': data.get('users', []),
                'total': data.get('total', 0),
                'page': page,
                'limit': limit
            })
        else:
            return JsonResponse({
                'success': False,
                'message': response.get('message', 'Search failed')
            })


@method_decorator(admin_required, name='dispatch')
class UserAnalyticsView(View):
    """User management analytics dashboard"""
    
    def get(self, request):
        token = request.session.get('access_token')
        if not token:
            messages.error(request, 'Please login to access analytics.')
            return redirect('authentication:login')
        
        # Get basic user statistics
        response = api_client.get_users(token=token, page=1, limit=1000)  # Get all users for stats
        
        if response.get('success'):
            users = response.get('data', {}).get('users', [])
            total_users = response.get('data', {}).get('total', 0)
            
            # Calculate statistics
            active_users = len([u for u in users if u.get('isActive')])
            inactive_users = total_users - active_users
            active_percentage = (active_users / total_users * 100) if total_users > 0 else 0
            
            # Role distribution
            role_stats = {
                'admin': len([u for u in users if u.get('role') == 'admin']),
                'doctor': len([u for u in users if u.get('role') == 'doctor']),
                'nurse': len([u for u in users if u.get('role') == 'nurse']),
                'staff': len([u for u in users if u.get('role') == 'staff']),
                'patient': len([u for u in users if u.get('role') == 'patient']),
            }
            
            # Mock data for monthly registrations (in real app, this would come from API)
            monthly_registrations = [5, 8, 12, 15, 20, 18]  # Last 6 months
            months_labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']  # Would be dynamic
            
            # Recent activity (simplified)
            new_users_this_month = 18  # Would come from API
            users_today = 2  # Would come from API
            users_this_week = 7  # Would come from API
            last_user_created = 'Today'  # Would come from API
            
        else:
            # Fallback data if API call fails
            total_users = 0
            active_users = 0
            inactive_users = 0
            active_percentage = 0
            role_stats = {'admin': 0, 'doctor': 0, 'nurse': 0, 'staff': 0, 'patient': 0}
            monthly_registrations = [0, 0, 0, 0, 0, 0]
            months_labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
            new_users_this_month = 0
            users_today = 0
            users_this_week = 0
            last_user_created = 'N/A'
            
            messages.warning(request, 'Unable to load complete analytics data.')
        
        context = {
            'total_users': total_users,
            'active_users': active_users,
            'inactive_users': inactive_users,
            'active_percentage': round(active_percentage, 1),
            'role_stats': role_stats,
            'monthly_registrations': monthly_registrations,
            'months_labels': months_labels,
            'new_users_this_month': new_users_this_month,
            'users_today': users_today,
            'users_this_week': users_this_week,
            'last_user_created': last_user_created,
        }
        
        return render(request, 'users/analytics.html', context)
