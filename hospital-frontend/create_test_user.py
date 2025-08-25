#!/usr/bin/env python
"""
Create a test user with full profile information
"""

import requests
import json

def create_test_user():
    """Create test user with complete profile"""
    api_base_url = 'http://localhost:3000'
    
    print("🔍 Creating Test User with Full Profile...")
    print(f"API Base URL: {api_base_url}")
    print("-" * 50)
    
    # Test user with complete profile
    user_data = {
        'username': 'testdoctor',
        'email': 'testdoctor@hospital.com',
        'password': 'TestDoctor123!@#',  # Strong password
        'role': 'doctor',
        'profile': {
            'firstName': 'Dr. John',
            'lastName': 'Smith',
            'phone': '+1-555-123-4567',
            'dateOfBirth': '1980-03-15',
            'address': '123 Medical Center Drive\nHealth City, HC 12345\nUnited States',
            'avatarUrl': 'https://via.placeholder.com/150/0066cc/ffffff?text=JS'
        }
    }
    
    try:
        print("1. Creating user...")
        response = requests.post(
            f"{api_base_url}/api/auth/register",
            json=user_data,
            headers={'Content-Type': 'application/json'},
            timeout=15
        )
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code in [200, 201]:
            data = response.json()
            if data.get('success'):
                print(f"   ✅ User created successfully!")
                print(f"   👤 Username: {user_data['username']}")
                print(f"   📧 Email: {user_data['email']}")
                print(f"   🏥 Role: {user_data['role']}")
                print(f"   👨‍⚕️ Name: {user_data['profile']['firstName']} {user_data['profile']['lastName']}")
                print(f"   📱 Phone: {user_data['profile']['phone']}")
                print(f"   🎂 DOB: {user_data['profile']['dateOfBirth']}")
                
                # Test login
                print(f"\n2. Testing login...")
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
                        
                        # Test profile
                        print(f"\n3. Testing profile...")
                        profile_response = requests.get(
                            f"{api_base_url}/api/auth/profile",
                            headers={
                                'Authorization': f'Bearer {token}',
                                'Content-Type': 'application/json'
                            },
                            timeout=10
                        )
                        
                        if profile_response.status_code == 200:
                            profile_data = profile_response.json()
                            print(f"   ✅ Profile retrieved!")
                            print(f"   📊 Profile Data:")
                            print(json.dumps(profile_data, indent=2, default=str))
                        else:
                            print(f"   ❌ Profile request failed: {profile_response.status_code}")
                    else:
                        print(f"   ❌ Login failed: {login_data.get('message')}")
                else:
                    print(f"   ❌ Login request failed: {login_response.status_code}")
                    
                print(f"\n🎯 Test User Credentials:")
                print(f"   Username: {user_data['username']}")
                print(f"   Password: {user_data['password']}")
                print(f"   Django Login: http://localhost:8000/auth/login/")
                
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
    print("🎉 Test User Creation Complete!")
    return True

if __name__ == '__main__':
    create_test_user()
