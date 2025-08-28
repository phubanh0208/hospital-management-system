#!/usr/bin/env python
"""
Debug script to check profile API response structure
"""

import requests
import json

def debug_profile_api():
    """Debug profile API response"""
    api_base_url = 'http://localhost:3000'
    
    print("🔍 Debugging Profile API Response Structure...")
    print(f"API Base URL: {api_base_url}")
    print("-" * 60)
    
    # Step 1: Login to get token
    try:
        print("1. Logging in...")
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
                token = data.get('data', {}).get('accessToken')
                print(f"   ✅ Login successful, token: {token[:20]}...")
                
                # Step 2: Get profile with detailed response
                print("\n2. Getting profile...")
                profile_response = requests.get(
                    f"{api_base_url}/api/auth/profile",
                    headers={
                        'Authorization': f'Bearer {token}',
                        'Content-Type': 'application/json'
                    },
                    timeout=10
                )
                
                print(f"   Status Code: {profile_response.status_code}")
                print(f"   Response Headers: {dict(profile_response.headers)}")
                
                if profile_response.status_code == 200:
                    profile_data = profile_response.json()
                    print(f"   ✅ Profile API Success")
                    print(f"   📊 Full Response Structure:")
                    print(json.dumps(profile_data, indent=2, default=str))
                    
                    # Analyze structure
                    print(f"\n   🔍 Response Analysis:")
                    print(f"   - Success: {profile_data.get('success')}")
                    print(f"   - Message: {profile_data.get('message', 'None')}")
                    
                    data_section = profile_data.get('data', {})
                    print(f"   - Data keys: {list(data_section.keys())}")
                    
                    if 'user' in data_section:
                        user_data = data_section['user']
                        print(f"   - User keys: {list(user_data.keys())}")
                        if 'profile' in user_data:
                            print(f"   - Profile keys: {list(user_data['profile'].keys())}")
                        else:
                            print(f"   - ❌ No 'profile' key in user data")
                    else:
                        print(f"   - User data keys: {list(data_section.keys())}")
                        if 'profile' in data_section:
                            print(f"   - Profile keys: {list(data_section['profile'].keys())}")
                        else:
                            print(f"   - ❌ No 'profile' key in data")
                            
                else:
                    print(f"   ❌ Profile API Failed: {profile_response.status_code}")
                    print(f"   Response: {profile_response.text}")
            else:
                print(f"   ❌ Login Failed: {data.get('message')}")
        else:
            print(f"   ❌ Login Request Failed: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False
    
    print("\n" + "=" * 60)
    print("🎯 Profile API Debug Complete!")
    return True

if __name__ == '__main__':
    debug_profile_api()
