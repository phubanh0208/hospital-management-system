#!/usr/bin/env python
"""
Test script for registration functionality
"""

import requests
import json
from datetime import datetime

def test_registration():
    """Test registration with proper password"""
    api_base_url = 'http://localhost:3000'
    
    print("🔍 Testing Registration API...")
    print(f"API Base URL: {api_base_url}")
    print("-" * 50)
    
    # Test data with strong password
    test_users = [
        {
            'username': 'testdoctor1',
            'email': 'testdoctor1@hospital.com',
            'password': 'TestDoctor123!@#',  # Strong password
            'role': 'doctor',
            'profile': {
                'firstName': 'Test',
                'lastName': 'Doctor',
                'phone': '+1234567890',
                'dateOfBirth': '1985-05-15',
                'address': '123 Medical Center Drive, Health City'
            }
        },
        {
            'username': 'testnurse1',
            'email': 'testnurse1@hospital.com',
            'password': 'TestNurse456!@#',  # Strong password
            'role': 'nurse',
            'profile': {
                'firstName': 'Test',
                'lastName': 'Nurse',
                'phone': '+1234567891',
                'dateOfBirth': '1990-08-20',
                'address': '456 Care Street, Health City'
            }
        }
    ]
    
    for i, user_data in enumerate(test_users, 1):
        print(f"\n{i}. Testing registration for {user_data['username']}...")
        
        try:
            response = requests.post(
                f"{api_base_url}/api/auth/register",
                json=user_data,
                headers={'Content-Type': 'application/json'},
                timeout=15
            )
            
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code == 200 or response.status_code == 201:
                data = response.json()
                if data.get('success'):
                    print(f"   ✅ Registration successful!")
                    print(f"   📧 Email: {user_data['email']}")
                    print(f"   👤 Role: {user_data['role']}")
                    print(f"   📱 Phone: {user_data['profile']['phone']}")
                    
                    # Test login with new user
                    print(f"   🔐 Testing login...")
                    login_response = requests.post(
                        f"{api_base_url}/api/auth/login",
                        json={
                            'username': user_data['username'],
                            'password': user_data['password']
                        },
                        headers={'Content-Type': 'application/json'},
                        timeout=10
                    )
                    
                    if login_response.status_code == 200:
                        login_data = login_response.json()
                        if login_data.get('success'):
                            print(f"   ✅ Login successful!")
                            token = login_data.get('data', {}).get('accessToken')
                            if token:
                                print(f"   🔑 Token received: {token[:20]}...")
                        else:
                            print(f"   ❌ Login failed: {login_data.get('message')}")
                    else:
                        print(f"   ❌ Login request failed: {login_response.status_code}")
                        
                else:
                    print(f"   ❌ Registration failed: {data.get('message')}")
                    if 'errors' in data:
                        for error in data['errors']:
                            print(f"      - {error}")
            else:
                print(f"   ❌ Registration request failed: {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data.get('message', 'Unknown error')}")
                    if 'errors' in error_data:
                        for error in error_data['errors']:
                            print(f"      - {error}")
                except:
                    print(f"   Response: {response.text}")
                    
        except Exception as e:
            print(f"   ❌ Exception: {str(e)}")
    
    print("\n" + "=" * 50)
    print("🎯 Registration Test Complete!")
    
    # Test weak password
    print("\n🔍 Testing weak password validation...")
    weak_password_user = {
        'username': 'weakpasstest',
        'email': 'weak@hospital.com',
        'password': 'weak123',  # Weak password - no special chars, no uppercase
        'role': 'staff',
        'profile': {
            'firstName': 'Weak',
            'lastName': 'Password',
            'phone': '+1111111111'
        }
    }
    
    try:
        response = requests.post(
            f"{api_base_url}/api/auth/register",
            json=weak_password_user,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 400:
            data = response.json()
            print(f"   ✅ Weak password correctly rejected!")
            print(f"   📝 Message: {data.get('message')}")
            if 'errors' in data:
                for error in data['errors']:
                    print(f"      - {error}")
        else:
            print(f"   ❌ Weak password was accepted (should be rejected)")
            
    except Exception as e:
        print(f"   ❌ Exception testing weak password: {str(e)}")
    
    return True

if __name__ == '__main__':
    test_registration()
