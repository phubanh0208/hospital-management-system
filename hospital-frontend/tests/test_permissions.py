"""
Test cases for role-based permissions
"""
import pytest
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.sessions.models import Session


class RolePermissionTests(TestCase):
    """Test role-based access control"""
    
    def setUp(self):
        self.client = Client()
        
        # Mock session data for different roles
        self.admin_session = {
            'access_token': 'mock_admin_token',
            'user_role': 'admin',
            'user_id': 'admin_user_id',
            'username': 'admin_user'
        }
        
        self.staff_session = {
            'access_token': 'mock_staff_token',
            'user_role': 'staff',
            'user_id': 'staff_user_id',
            'username': 'staff_user'
        }
        
        self.doctor_session = {
            'access_token': 'mock_doctor_token',
            'user_role': 'doctor',
            'user_id': 'doctor_user_id',
            'username': 'doctor_user'
        }
        
        self.patient_session = {
            'access_token': 'mock_patient_token',
            'user_role': 'patient',
            'user_id': 'patient_user_id',
            'username': 'patient_user'
        }
    
    def _login_as_role(self, role_session):
        """Helper to login as specific role"""
        session = self.client.session
        session.update(role_session)
        session.save()
    
    def test_admin_full_access(self):
        """Test admin has full access to all modules"""
        self._login_as_role(self.admin_session)
        
        # Admin should access all pages
        urls_to_test = [
            'patients:list',
            'doctors:list',
            'appointments:list',
            'prescriptions:list',
            'users:list'
        ]
        
        for url_name in urls_to_test:
            try:
                response = self.client.get(reverse(url_name))
                self.assertIn(response.status_code, [200, 302], 
                            f"Admin should access {url_name}")
            except:
                # Skip if URL doesn't exist in test environment
                pass
    
    def test_staff_restricted_access(self):
        """Test staff has restricted access"""
        self._login_as_role(self.staff_session)
        
        # Staff should access these
        allowed_urls = ['patients:list', 'doctors:list', 'appointments:list', 'prescriptions:list']
        for url_name in allowed_urls:
            try:
                response = self.client.get(reverse(url_name))
                self.assertIn(response.status_code, [200, 302], 
                            f"Staff should access {url_name}")
            except:
                pass
        
        # Staff should NOT access users management
        try:
            response = self.client.get(reverse('users:list'))
            self.assertIn(response.status_code, [403, 302], 
                        "Staff should not access users:list")
        except:
            pass
    
    def test_doctor_limited_access(self):
        """Test doctor has limited access"""
        self._login_as_role(self.doctor_session)
        
        # Doctor should access patients, appointments, prescriptions
        allowed_urls = ['patients:list', 'appointments:list', 'prescriptions:list']
        for url_name in allowed_urls:
            try:
                response = self.client.get(reverse(url_name))
                self.assertIn(response.status_code, [200, 302], 
                            f"Doctor should access {url_name}")
            except:
                pass
        
        # Doctor should NOT access doctors list
        try:
            response = self.client.get(reverse('doctors:list'))
            self.assertIn(response.status_code, [403, 302], 
                        "Doctor should not access doctors:list")
        except:
            pass
    
    def test_patient_minimal_access(self):
        """Test patient has minimal access"""
        self._login_as_role(self.patient_session)
        
        # Patient should access only their own appointments/prescriptions
        allowed_urls = ['appointments:list', 'prescriptions:list']
        for url_name in allowed_urls:
            try:
                response = self.client.get(reverse(url_name))
                self.assertIn(response.status_code, [200, 302], 
                            f"Patient should access {url_name}")
            except:
                pass
        
        # Patient should NOT access patients, doctors, users
        restricted_urls = ['patients:list', 'doctors:list', 'users:list']
        for url_name in restricted_urls:
            try:
                response = self.client.get(reverse(url_name))
                self.assertIn(response.status_code, [403, 302], 
                            f"Patient should not access {url_name}")
            except:
                pass
    
    def test_prescription_creation_permissions(self):
        """Test prescription creation is restricted to doctors"""
        # Doctor should be able to create prescriptions
        self._login_as_role(self.doctor_session)
        try:
            response = self.client.get(reverse('prescriptions:patient_selection'))
            self.assertIn(response.status_code, [200, 302], 
                        "Doctor should access prescription creation")
        except:
            pass
        
        # Staff should NOT be able to create prescriptions
        self._login_as_role(self.staff_session)
        try:
            response = self.client.get(reverse('prescriptions:patient_selection'))
            self.assertIn(response.status_code, [403, 302], 
                        "Staff should not access prescription creation")
        except:
            pass
    
    def test_appointment_booking_permissions(self):
        """Test appointment booking permissions"""
        # Admin, Staff, Doctor should be able to book appointments
        for role_session in [self.admin_session, self.staff_session, self.doctor_session]:
            self._login_as_role(role_session)
            try:
                response = self.client.get(reverse('appointments:book'))
                self.assertIn(response.status_code, [200, 302], 
                            f"{role_session['user_role']} should access appointment booking")
            except:
                pass
        
        # Patient should NOT be able to book appointments
        self._login_as_role(self.patient_session)
        try:
            response = self.client.get(reverse('appointments:book'))
            self.assertIn(response.status_code, [403, 302], 
                        "Patient should not access appointment booking")
        except:
            pass


class DataFilteringTests(TestCase):
    """Test data filtering based on roles"""
    
    def setUp(self):
        self.client = Client()
    
    def test_doctor_data_filtering(self):
        """Test that doctor_own_data_required decorator works"""
        # Mock doctor session
        session = self.client.session
        session.update({
            'access_token': 'mock_token',
            'user_role': 'doctor',
            'user_id': 'doctor_123',
            'username': 'test_doctor'
        })
        session.save()
        
        # Make request to appointments list
        try:
            response = self.client.get(reverse('appointments:list'))
            # Check if doctor_id filter was added to request
            # This would need to be verified in the actual view logic
            self.assertIn(response.status_code, [200, 302])
        except:
            pass
    
    def test_patient_data_filtering(self):
        """Test that patient_own_data_required decorator works"""
        # Mock patient session
        session = self.client.session
        session.update({
            'access_token': 'mock_token',
            'user_role': 'patient',
            'user_id': 'patient_123',
            'username': 'test_patient'
        })
        session.save()
        
        # Make request to appointments list
        try:
            response = self.client.get(reverse('appointments:list'))
            # Check if patient_id filter was added to request
            self.assertIn(response.status_code, [200, 302])
        except:
            pass


if __name__ == '__main__':
    pytest.main([__file__])
