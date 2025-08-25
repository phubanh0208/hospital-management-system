#!/usr/bin/env python3
"""
Create admin user for testing
"""

import requests
import json

API_URL = "http://localhost:3000"

def create_admin_user():
    """Create admin user"""
    print("🔧 CREATING ADMIN USER")
    print("=" * 30)
    
    admin_data = {
        'username': 'admin',
        'email': 'admin@hospital.com',
        'password': 'Admin123!@#',
        'role': 'admin',
        'profile': {
            'firstName': 'Admin',
            'lastName': 'User',
            'phone': '+1-555-000-0000',
            'dateOfBirth': '1980-01-01',
            'address': 'Hospital Admin Office'
        }
    }
    
    try:
        print("Creating admin user...")
        response = requests.post(
            f"{API_URL}/api/auth/register",
            json=admin_data,
            headers={'Content-Type': 'application/json'},
            timeout=15
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code in [200, 201]:
            data = response.json()
            if data.get('success'):
                print("✅ Admin user created successfully!")
                print(f"   Username: {admin_data['username']}")
                print(f"   Password: {admin_data['password']}")
                print(f"   Role: {admin_data['role']}")
                
                # Test login
                print("\nTesting login...")
                login_response = requests.post(
                    f"{API_URL}/api/auth/login",
                    json={
                        'username': admin_data['username'],
                        'password': admin_data['password']
                    },
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                
                if login_response.status_code == 200:
                    login_data = login_response.json()
                    if login_data.get('success'):
                        print("✅ Admin login test successful!")
                        user = login_data.get('data', {}).get('user', {})
                        print(f"   User ID: {user.get('id')}")
                        print(f"   Role: {user.get('role')}")
                    else:
                        print(f"❌ Admin login test failed: {login_data.get('message')}")
                else:
                    print(f"❌ Admin login test failed: {login_response.status_code}")
                    
            else:
                print(f"❌ Admin user creation failed: {data.get('message')}")
                if 'errors' in data:
                    for error in data['errors']:
                        print(f"   - {error}")
        else:
            print(f"❌ Admin user creation failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('message', 'Unknown error')}")
                if 'User with this email or username already exists' in error_data.get('message', ''):
                    print("   💡 Admin user already exists - trying login test...")
                    
                    # Test existing user login
                    login_response = requests.post(
                        f"{API_URL}/api/auth/login",
                        json={
                            'username': admin_data['username'],
                            'password': admin_data['password']
                        },
                        headers={'Content-Type': 'application/json'},
                        timeout=10
                    )
                    
                    if login_response.status_code == 200:
                        login_data = login_response.json()
                        if login_data.get('success'):
                            print("✅ Existing admin login successful!")
                            user = login_data.get('data', {}).get('user', {})
                            print(f"   User ID: {user.get('id')}")
                            print(f"   Role: {user.get('role')}")
                        else:
                            print(f"❌ Existing admin login failed: {login_data.get('message')}")
                    else:
                        print(f"❌ Existing admin login failed: {login_response.status_code}")
                        
            except:
                print(f"   Response: {response.text}")
                
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
    
    print("\n" + "=" * 30)
    print("🎯 Admin User Setup Complete!")
    print("Credentials:")
    print("   Username: admin")
    print("   Password: Admin123!@#")
    print("   Frontend: http://localhost:8000/auth/login/")
    
    return True

if __name__ == '__main__':
    create_admin_user()
