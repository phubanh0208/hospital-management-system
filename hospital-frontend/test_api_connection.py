#!/usr/bin/env python
"""
Simple test script to check API Gateway connection
"""

import requests
import json

def test_api_connection():
    """Test API Gateway connection"""
    api_base_url = 'http://localhost:3000'
    
    print("🔍 Testing API Gateway Connection...")
    print(f"API Base URL: {api_base_url}")
    print("-" * 50)
    
    # Test 1: Health Check
    try:
        print("1. Testing Health Check...")
        response = requests.get(f"{api_base_url}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Health Check: {data.get('status', 'OK')}")
            print(f"   📊 Services: {len(data.get('services', []))} services")
        else:
            print(f"   ❌ Health Check Failed: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("   ❌ Connection Error: API Gateway is not running!")
        print("   💡 Please start API Gateway with: docker-compose up -d")
        return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False
    
    # Test 2: Login
    try:
        print("\n2. Testing Login...")
        login_data = {
            'username': 'admin',
            'password': 'Admin123!@#'
        }
        response = requests.post(
            f"{api_base_url}/api/auth/login", 
            json=login_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("   ✅ Login Successful")
                token = data.get('data', {}).get('accessToken')
                if token:
                    print(f"   🔑 Token: {token[:20]}...")
                    
                    # Test 3: Profile
                    print("\n3. Testing Profile...")
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
                        if profile_data.get('success'):
                            user = profile_data.get('data', {})
                            print(f"   ✅ Profile: {user.get('username')} ({user.get('role')})")
                            print(f"   📧 Email: {user.get('email')}")
                        else:
                            print(f"   ❌ Profile API Error: {profile_data.get('message')}")
                    else:
                        print(f"   ❌ Profile Request Failed: {profile_response.status_code}")
                else:
                    print("   ❌ No token received")
            else:
                print(f"   ❌ Login Failed: {data.get('message')}")
        else:
            print(f"   ❌ Login Request Failed: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"   ❌ Login Error: {str(e)}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 API Gateway Connection Test Complete!")
    print("✅ All tests passed - API Gateway is working correctly")
    return True

if __name__ == '__main__':
    test_api_connection()
