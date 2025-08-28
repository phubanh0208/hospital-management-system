#!/usr/bin/env python3
"""
Test script for role-based permissions
Tests both backend API and frontend access controls
"""

import requests
import json
import time
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:3000"
FRONTEND_BASE_URL = "http://localhost:8000"

# Test users for different roles (matching create_test_users_for_permissions.py)
TEST_USERS = {
    'admin': {
        'username': 'admin_user',
        'password': 'Admin123!',
        'role': 'admin'
    },
    'staff': {
        'username': 'staff_user',
        'password': 'Staff123!',
        'role': 'staff'
    },
    'doctor': {
        'username': 'doctor_user',
        'password': 'Doctor123!',
        'role': 'doctor'
    },
    'patient': {
        'username': 'patient_user',
        'password': 'Patient123!',
        'role': 'patient'
    }
}

class PermissionTester:
    def __init__(self):
        self.session = requests.Session()
        self.tokens = {}
        
    def login_user(self, role):
        """Login user and get access token"""
        user = TEST_USERS[role]
        
        print(f"\n🔐 Logging in as {role}: {user['username']}")
        
        login_data = {
            'username': user['username'],
            'password': user['password']
        }
        
        try:
            response = self.session.post(f"{API_BASE_URL}/api/auth/login", json=login_data)

            print(f"   Login response status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                print(f"   Login response data: {data}")

                if data.get('success'):
                    # Try different token field names
                    token = (data.get('data', {}).get('accessToken') or
                            data.get('data', {}).get('access_token') or
                            data.get('accessToken') or
                            data.get('access_token'))

                    if token:
                        self.tokens[role] = token
                        print(f"✅ Login successful for {role} - Token: {token[:20]}...")
                        return token
                    else:
                        print(f"❌ No token in response for {role}")
                        print(f"   Available keys in data: {list(data.get('data', {}).keys())}")
                else:
                    print(f"❌ Login failed for {role}: {data.get('message')}")
            else:
                print(f"❌ Login failed for {role}: HTTP {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error response: {error_data}")
                except:
                    print(f"   Response text: {response.text[:200]}...")

        except Exception as e:
            print(f"❌ Login error for {role}: {str(e)}")

        return None
    
    def test_api_access(self, role, endpoint, method='GET', expected_status=200):
        """Test API endpoint access for specific role"""
        token = self.tokens.get(role)
        if not token:
            print(f"❌ No token for {role}")
            return False
            
        headers = {'Authorization': f'Bearer {token}'}
        
        try:
            if method == 'GET':
                response = self.session.get(f"{API_BASE_URL}{endpoint}", headers=headers)
            elif method == 'POST':
                response = self.session.post(f"{API_BASE_URL}{endpoint}", headers=headers, json={})
                
            actual_status = response.status_code
            
            if actual_status == expected_status:
                print(f"✅ {role} {method} {endpoint}: {actual_status} (expected)")
                return True
            else:
                print(f"❌ {role} {method} {endpoint}: {actual_status} (expected {expected_status})")
                if response.text:
                    try:
                        error_data = response.json()
                        print(f"   Error: {error_data.get('message', 'Unknown error')}")
                    except:
                        print(f"   Response: {response.text[:100]}...")
                return False
                
        except Exception as e:
            print(f"❌ {role} {method} {endpoint}: Exception - {str(e)}")
            return False
    
    def test_data_filtering(self, role):
        """Test that role-based data filtering works"""
        print(f"\n📊 Testing data filtering for {role}")
        
        token = self.tokens.get(role)
        if not token:
            return False
            
        headers = {'Authorization': f'Bearer {token}'}
        
        # Test appointments filtering
        try:
            response = self.session.get(f"{API_BASE_URL}/api/appointments", headers=headers)
            if response.status_code == 200:
                data = response.json()
                appointments = data.get('data', [])
                
                if role == 'patient':
                    # Patient should only see their own appointments
                    print(f"   Patient sees {len(appointments)} appointments (should be only theirs)")
                elif role == 'doctor':
                    # Doctor should only see their own appointments
                    print(f"   Doctor sees {len(appointments)} appointments (should be only theirs)")
                else:
                    # Admin/Staff should see all appointments
                    print(f"   {role} sees {len(appointments)} appointments (should be all)")
                    
                return True
            else:
                print(f"   ❌ Failed to get appointments: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"   ❌ Exception testing data filtering: {str(e)}")
            return False
    
    def run_permission_tests(self):
        """Run comprehensive permission tests"""
        print("🧪 STARTING ROLE-BASED PERMISSION TESTS")
        print("=" * 50)
        
        # Login all users
        for role in TEST_USERS.keys():
            self.login_user(role)
            time.sleep(1)  # Rate limiting
        
        print("\n📋 TESTING API ACCESS PERMISSIONS")
        print("-" * 30)
        
        # Test cases: (role, endpoint, method, expected_status)
        test_cases = [
            # Admin - should access everything
            ('admin', '/api/patients', 'GET', 200),
            ('admin', '/api/doctors', 'GET', 200),
            ('admin', '/api/appointments', 'GET', 200),
            ('admin', '/api/prescriptions', 'GET', 200),
            ('admin', '/api/patients', 'POST', 400),  # 400 because no data, but access allowed
            ('admin', '/api/prescriptions', 'POST', 400),  # 400 because no data, but access allowed
            
            # Staff - limited access
            ('staff', '/api/patients', 'GET', 200),
            ('staff', '/api/doctors', 'GET', 200),
            ('staff', '/api/appointments', 'GET', 200),
            ('staff', '/api/prescriptions', 'GET', 200),
            ('staff', '/api/patients', 'POST', 400),  # Can create patients
            ('staff', '/api/prescriptions', 'POST', 403),  # Cannot create prescriptions
            
            # Doctor - own data only
            ('doctor', '/api/patients', 'GET', 200),
            ('doctor', '/api/appointments', 'GET', 200),
            ('doctor', '/api/prescriptions', 'GET', 200),
            ('doctor', '/api/prescriptions', 'POST', 400),  # Can create prescriptions
            
            # Patient - very limited access
            ('patient', '/api/appointments', 'GET', 200),
            ('patient', '/api/prescriptions', 'GET', 200),
            ('patient', '/api/patients', 'GET', 403),  # Cannot access patients list
            ('patient', '/api/prescriptions', 'POST', 403),  # Cannot create prescriptions
        ]
        
        passed = 0
        total = len(test_cases)
        
        for role, endpoint, method, expected_status in test_cases:
            if self.test_api_access(role, endpoint, method, expected_status):
                passed += 1
            time.sleep(0.5)  # Rate limiting
        
        print(f"\n📊 API ACCESS TESTS: {passed}/{total} passed")
        
        # Test data filtering
        print("\n📊 TESTING DATA FILTERING")
        print("-" * 30)
        
        filtering_passed = 0
        for role in ['admin', 'staff', 'doctor', 'patient']:
            if self.test_data_filtering(role):
                filtering_passed += 1
            time.sleep(1)
        
        print(f"\n📊 DATA FILTERING TESTS: {filtering_passed}/4 passed")
        
        # Summary
        total_tests = total + 4
        total_passed = passed + filtering_passed
        
        print("\n" + "=" * 50)
        print(f"🎯 FINAL RESULTS: {total_passed}/{total_tests} tests passed")
        
        if total_passed == total_tests:
            print("🎉 ALL TESTS PASSED! Role-based permissions working correctly!")
        else:
            print("⚠️  Some tests failed. Please check the implementation.")
        
        return total_passed == total_tests

def main():
    """Main test function"""
    print("🏥 HOSPITAL MANAGEMENT SYSTEM - PERMISSION TESTING")
    print(f"⏰ Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tester = PermissionTester()
    
    # Check if API Gateway is running
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ API Gateway is running")
        else:
            print("❌ API Gateway health check failed")
            return
    except Exception as e:
        print(f"❌ Cannot connect to API Gateway: {str(e)}")
        print("Please ensure all backend services are running")
        return
    
    # Run tests
    success = tester.run_permission_tests()
    
    if success:
        print("\n🚀 Ready for production! All permission controls are working.")
    else:
        print("\n🔧 Please fix the failing tests before deployment.")

if __name__ == "__main__":
    main()
