#!/usr/bin/env python3
"""
Create test users for permission testing
"""

import requests
import json
import time

API_BASE_URL = "http://localhost:3000"

# Test users to create (passwords must meet requirements: 8+ chars, uppercase, lowercase, number, special char)
TEST_USERS = [
    {
        'username': 'admin_user',
        'email': 'admin@hospital.com',
        'password': 'Admin123!',
        'role': 'admin'
    },
    {
        'username': 'staff_user',
        'email': 'staff@hospital.com',
        'password': 'Staff123!',
        'role': 'staff'
    },
    {
        'username': 'doctor_user',
        'email': 'doctor@hospital.com',
        'password': 'Doctor123!',
        'role': 'doctor'
    },
    {
        'username': 'patient_user',
        'email': 'patient@hospital.com',
        'password': 'Patient123!',
        'role': 'patient'
    }
]

def create_test_users():
    """Create test users for permission testing"""
    print("👥 Creating test users for permission testing...")
    
    session = requests.Session()
    created_count = 0
    
    for user in TEST_USERS:
        print(f"\n📝 Creating {user['role']}: {user['username']}")
        
        try:
            response = session.post(f"{API_BASE_URL}/api/auth/register", json=user)
            
            if response.status_code == 201:
                data = response.json()
                if data.get('success'):
                    print(f"✅ Created {user['role']} user successfully")
                    created_count += 1
                else:
                    print(f"❌ Failed to create {user['role']}: {data.get('message')}")
            elif response.status_code == 409:
                print(f"ℹ️  {user['role']} user already exists")
                created_count += 1
            else:
                print(f"❌ Failed to create {user['role']}: HTTP {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data.get('message', 'Unknown error')}")
                except:
                    print(f"   Response: {response.text[:100]}...")
                    
        except Exception as e:
            print(f"❌ Exception creating {user['role']}: {str(e)}")
        
        time.sleep(1)  # Rate limiting
    
    print(f"\n📊 Created/Verified {created_count}/{len(TEST_USERS)} test users")
    
    if created_count == len(TEST_USERS):
        print("🎉 All test users ready for permission testing!")
        return True
    else:
        print("⚠️  Some users could not be created. Check the errors above.")
        return False

def main():
    """Main function"""
    print("🏥 HOSPITAL MANAGEMENT SYSTEM - TEST USER CREATION")
    
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
    
    # Create test users
    success = create_test_users()
    
    if success:
        print("\n🚀 Test users created! You can now run permission tests.")
        print("Run: python test_role_permissions.py")
    else:
        print("\n🔧 Please fix the user creation issues before running tests.")

if __name__ == "__main__":
    main()
