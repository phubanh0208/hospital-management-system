"""
Django settings for Hospital Management Frontend
Connects to API Gateway v2.2.0 backend
"""

import os
from pathlib import Path
# from decouple import config

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-hospital-management-frontend-key-change-in-production'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# Application definition
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'corsheaders',
    'crispy_forms',
    'crispy_bootstrap5',
    'widget_tweaks',
    'channels',
]

LOCAL_APPS = [
    'apps.authentication',
    'apps.dashboard',
    'apps.patients',
    'apps.doctors',
    'apps.appointments',
    'apps.prescriptions',
    'apps.users',
    'apps.analytics',
    'apps.notifications',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'utils.middleware.APIAuthMiddleware',  # Custom middleware for API authentication
]

ROOT_URLCONF = 'hospital_frontend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'utils.context_processors.user_role',  # Custom context processor
            ],
        },
    },
]

WSGI_APPLICATION = 'hospital_frontend.wsgi.application'
ASGI_APPLICATION = 'hospital_frontend.asgi.application'

# Database (for Django sessions, not main data - main data comes from API)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Ho_Chi_Minh'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# API Gateway Configuration
API_GATEWAY_BASE_URL = 'http://localhost:3000'
API_GATEWAY_TIMEOUT = 30

# WebSocket Configuration for Real-time Features (In-memory for development)
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

# WebSocket URL for notifications
WEBSOCKET_URL = 'ws://localhost:3000/ws/notifications'

# Encryption Configuration
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY', 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456')

# Crispy Forms Configuration
CRISPY_ALLOWED_TEMPLATE_PACKS = "bootstrap5"
CRISPY_TEMPLATE_PACK = "bootstrap5"

# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # API Gateway
    "http://127.0.0.1:3000",
]

# Session Configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_AGE = 86400  # 24 hours
SESSION_SAVE_EVERY_REQUEST = True

# Messages Framework
from django.contrib.messages import constants as messages
MESSAGE_TAGS = {
    messages.DEBUG: 'debug',
    messages.INFO: 'info',
    messages.SUCCESS: 'success',
    messages.WARNING: 'warning',
    messages.ERROR: 'danger',
}

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
}

# Create logs directory if it doesn't exist
os.makedirs(BASE_DIR / 'logs', exist_ok=True)

# Cache Configuration (In-memory for development)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'hospital-frontend-cache',
    }
}

# Security Settings
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# Custom Settings for Hospital Management
HOSPITAL_SETTINGS = {
    'HOSPITAL_NAME': 'General Hospital',
    'HOSPITAL_ADDRESS': '123 Medical Center Drive',
    'HOSPITAL_PHONE': '+1-555-HOSPITAL',
    'HOSPITAL_EMAIL': 'info@hospital.com',
    'PAGINATION_PER_PAGE': 20,
    'MAX_UPLOAD_SIZE': 5242880,  # 5MB
}

# Role-based Access Control
USER_ROLES = {
    'admin': 'Administrator',
    'staff': 'Staff',
    'doctor': 'Doctor',
    'nurse': 'Nurse',
    'patient': 'Patient',
}

# API Endpoints Configuration
API_ENDPOINTS = {
    'AUTH': '/api/auth',
    'USERS': '/api/users',
    'PATIENTS': '/api/patients',
    'APPOINTMENTS': '/api/appointments',
    'APPOINTMENT_SLOTS': '/api/appointment-slots',
    'DOCTOR_AVAILABILITY': '/api/doctor-availability',
    'PRESCRIPTIONS': '/api/prescriptions',
    'MEDICATIONS': '/api/medications',
    'NOTIFICATIONS': '/api/notifications',
    'ANALYTICS': '/api/analytics',
}
