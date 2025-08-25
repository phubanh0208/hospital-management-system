"""
URL configuration for Hospital Management Frontend
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # Redirect root to dashboard
    path('', RedirectView.as_view(url='/dashboard/', permanent=False)),
    
    # Authentication
    path('auth/', include('apps.authentication.urls')),
    
    # Main Applications
    path('dashboard/', include('apps.dashboard.urls')),
    path('patients/', include('apps.patients.urls')),
    path('doctors/', include('apps.doctors.urls')),
    path('appointments/', include('apps.appointments.urls')),
    path('prescriptions/', include('apps.prescriptions.urls')),
    path('users/', include('apps.users.urls')),
    path('analytics/', include('apps.analytics.urls')),
    path('notifications/', include('apps.notifications.urls')),
]

# Serve static and media files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    
    # Add debug toolbar
    if 'debug_toolbar' in settings.INSTALLED_APPS:
        import debug_toolbar
        urlpatterns = [
            path('__debug__/', include(debug_toolbar.urls)),
        ] + urlpatterns

# Custom error handlers
handler404 = 'apps.dashboard.views.handler404'
handler500 = 'apps.dashboard.views.handler500'
