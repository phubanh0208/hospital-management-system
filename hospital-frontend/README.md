# 🏥 Hospital Management Frontend - Django

**Modern Django frontend for Hospital Management System**  
**Connects to API Gateway v2.2.0 backend**

## 🎯 **Overview**

A comprehensive Django web application that provides a user-friendly interface for the Hospital Management System. Features role-based dashboards, real-time notifications, and responsive design.

## 🚀 **Features**

### **🔐 Authentication & Security**
- JWT-based authentication with API Gateway
- Role-based access control (Admin, Staff, Doctor, Nurse, Patient)
- Automatic token refresh
- Secure session management

### **📊 Role-Based Dashboards**
- **Admin**: User management, system analytics, full access
- **Staff**: Patient management, appointment scheduling
- **Doctor**: Patient care, prescriptions, own schedule
- **Nurse**: Patient monitoring, appointment assistance
- **Patient**: Personal appointments, medical records

### **🎨 Modern UI/UX**
- Responsive Bootstrap 5 design
- Interactive forms with validation
- Real-time notifications via WebSocket
- Mobile-friendly interface
- Dark/light theme support

### **⚡ Real-time Features**
- Live notifications
- Auto-refreshing dashboards
- WebSocket integration
- Toast notifications

## 📋 **Requirements**

- Python 3.8+
- Django 4.2+
- PostgreSQL (for sessions)
- Redis (for WebSocket channels)
- API Gateway v2.2.0 running

## 🛠️ **Installation**

### **1. Clone and Setup**
```bash
cd hospital-frontend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### **2. Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your settings
```

### **3. Database Setup**
```bash
python manage.py migrate
python manage.py collectstatic
```

### **4. Run Development Server**
```bash
python manage.py runserver 8000
```

## 🔧 **Configuration**

### **Environment Variables (.env)**
```env
# Django Settings
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (for Django sessions)
DB_NAME=hospital_frontend
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5437

# API Gateway
API_GATEWAY_BASE_URL=http://localhost:3000
WEBSOCKET_URL=ws://localhost:3000/ws/notifications

# Hospital Info
HOSPITAL_NAME=General Hospital
HOSPITAL_ADDRESS=123 Medical Center Drive
HOSPITAL_PHONE=+1-555-HOSPITAL
HOSPITAL_EMAIL=info@hospital.com
```

## 🏗️ **Architecture**

### **Project Structure**
```
hospital-frontend/
├── manage.py
├── requirements.txt
├── hospital_frontend/          # Django project settings
├── apps/                       # Django applications
│   ├── authentication/        # Login, logout, profile
│   ├── dashboard/             # Role-based dashboards
│   ├── patients/              # Patient management
│   ├── appointments/          # Appointment booking
│   ├── prescriptions/         # Prescription management
│   ├── users/                 # User management (Admin)
│   ├── analytics/             # Reports & analytics
│   └── notifications/         # Real-time notifications
├── templates/                  # HTML templates
├── static/                     # CSS, JS, images
└── utils/                      # Utilities and helpers
    ├── api_client.py          # API Gateway integration
    ├── decorators.py          # Role-based access decorators
    ├── middleware.py          # Custom middleware
    └── context_processors.py  # Template context
```

### **API Integration**
- **APIClient**: Centralized API communication
- **Token Management**: Automatic refresh and validation
- **Error Handling**: Graceful API error handling
- **Role-based Filtering**: Smart data filtering by user role

## 🎭 **User Roles & Access**

| Role | Dashboard Access | Features |
|------|------------------|----------|
| **Admin** | Full System | User management, all patients, system analytics |
| **Staff** | Administrative | Patient management, appointment scheduling |
| **Doctor** | Medical | Own patients, prescriptions, medical records |
| **Nurse** | Support | Assigned patients, appointment assistance |
| **Patient** | Personal | Own appointments, medical records, prescriptions |

## 🔗 **API Integration**

### **Authentication Flow**
```python
# Login
response = api_client.login(username, password)
if response['success']:
    # Store tokens in session
    request.session['access_token'] = response['data']['accessToken']
    request.session['refresh_token'] = response['data']['refreshToken']
```

### **API Calls**
```python
# Get patients (with role-based filtering)
patients = api_client.get_patients(token, page=1, limit=20)

# Create appointment
appointment = api_client.create_appointment(token, {
    'patientId': 'patient-id',
    'doctorId': 'doctor-id',
    'date': '2025-08-15',
    'time': '10:00'
})
```

## 🌐 **Real-time Features**

### **WebSocket Integration**
```javascript
// Connect to notifications
const ws = new WebSocket('ws://localhost:3000/ws/notifications');

ws.onmessage = function(event) {
    const notification = JSON.parse(event.data);
    showToast(notification.title, notification.message);
    updateNotificationCount();
};
```

### **Live Updates**
- Real-time appointment notifications
- System alerts and messages
- Auto-refreshing dashboard data
- Live patient status updates

## 🎨 **UI Components**

### **Dashboard Cards**
```html
<div class="dashboard-card">
    <div class="icon primary">
        <i class="fas fa-users"></i>
    </div>
    <h3>{{ total_patients }}</h3>
    <p>Total Patients</p>
</div>
```

### **Data Tables**
- Sortable columns
- Search functionality
- Pagination
- Responsive design

### **Forms**
- Crispy Forms integration
- Client-side validation
- AJAX form submission
- File upload support

## 🔒 **Security Features**

### **Role-based Decorators**
```python
@role_required(['admin', 'staff'])
def manage_patients(request):
    # Only admin and staff can access
    pass

@patient_or_staff_required
def view_patient(request, patient_id):
    # Patients can view own data, staff can view all
    pass
```

### **Middleware Protection**
- Automatic token validation
- Session management
- CSRF protection
- XSS prevention

## 📱 **Responsive Design**

### **Mobile-First Approach**
- Bootstrap 5 responsive grid
- Touch-friendly interfaces
- Mobile navigation
- Optimized forms

### **Cross-browser Support**
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Progressive enhancement
- Graceful degradation

## 🚀 **Deployment**

### **Production Setup**
```bash
# Install dependencies
pip install -r requirements.txt

# Collect static files
python manage.py collectstatic --noinput

# Run with Gunicorn
gunicorn hospital_frontend.wsgi:application --bind 0.0.0.0:8000
```

### **Docker Deployment**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "hospital_frontend.wsgi:application", "--bind", "0.0.0.0:8000"]
```

## 🧪 **Testing**

### **Run Tests**
```bash
python manage.py test
```

### **Test Coverage**
- Unit tests for views
- Integration tests for API calls
- Form validation tests
- Template rendering tests

## 📊 **Performance**

### **Optimization Features**
- Static file compression
- Database query optimization
- Caching with Redis
- Lazy loading
- Image optimization

### **Monitoring**
- Django Debug Toolbar (development)
- Performance metrics
- Error tracking
- User activity logging

## 🔧 **Development**

### **Local Development**
```bash
# Install development dependencies
pip install -r requirements.txt

# Run development server
python manage.py runserver 8000

# Run with debug
DEBUG=True python manage.py runserver 8000
```

### **Code Quality**
- PEP 8 compliance
- Type hints
- Comprehensive documentation
- Clean architecture

## 📚 **Documentation**

### **Template Documentation**
- Base templates with blocks
- Component templates
- Form templates
- Error pages

### **API Documentation**
- API client methods
- Error handling
- Response formats
- Authentication flow

## 🎯 **Next Steps**

1. **Complete all Django apps** (patients, appointments, etc.)
2. **Add comprehensive testing**
3. **Implement caching strategy**
4. **Add API rate limiting**
5. **Create deployment scripts**
6. **Add monitoring and logging**

---

## 🏥 **Hospital Management Django Frontend**

**Ready to provide a modern, responsive interface for your hospital management system!**

**Access the application at: http://localhost:8000**

**Login with demo credentials:**
- **Admin**: admin / Admin123!@#
- **Doctor**: doctor1 / Doctor123!@#
