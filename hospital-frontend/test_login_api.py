#!/usr/bin/env python
"""
Test login API to debug JSON parse error
"""

import requests
import json

def test_login_api():
    """Test login API with proper error handling"""
    api_base_url = 'http://localhost:3000'
    
    print("🔍 Testing Login API...")
    print(f"API Base URL: {api_base_url}")
    print("-" * 50)
    
    # Test data
    login_data = {
        'username': 'admin',
        'password': 'Admin123!@#'
    }
    
    try:
        print("1. Testing API Gateway health...")
        health_response = requests.get(f"{api_base_url}/health", timeout=10)
        print(f"   Health Status: {health_response.status_code}")
        if health_response.status_code == 200:
            try:
                health_data = health_response.json()
                print(f"   Health Data: {json.dumps(health_data, indent=2)}")
            except:
                print(f"   Health Response (text): {health_response.text[:200]}...")
        
        print(f"\n2. Testing login...")
        print(f"   Username: {login_data['username']}")
        print(f"   Password: {login_data['password']}")
        
        response = requests.post(
            f"{api_base_url}/api/auth/login",
            json=login_data,
            headers={'Content-Type': 'application/json'},
            timeout=20
        )
        
        print(f"   Status Code: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        print(f"   Response Length: {len(response.text)} chars")
        
        # Check if response is JSON
        content_type = response.headers.get('content-type', '')
        print(f"   Content-Type: {content_type}")
        
        if 'application/json' in content_type:
            try:
                data = response.json()
                print(f"   ✅ JSON Response:")
                print(json.dumps(data, indent=2, default=str))
            except json.JSONDecodeError as e:
                print(f"   ❌ JSON Parse Error: {e}")
                print(f"   Raw Response: {response.text[:500]}...")
        else:
            print(f"   ❌ Non-JSON Response:")
            print(f"   Raw Response: {response.text[:500]}...")
            
        # Check for specific error patterns
        response_text = response.text
        if response_text.startswith('T'):
            print(f"   🔍 Response starts with 'T': {response_text[:50]}...")
            if 'Timeout' in response_text:
                print(f"   ⚠️  Timeout detected!")
            elif 'The' in response_text:
                print(f"   ⚠️  Error message detected!")
                
    except requests.exceptions.Timeout:
        print(f"   ❌ Request timeout!")
    except requests.exceptions.ConnectionError:
        print(f"   ❌ Connection error!")
    except Exception as e:
        print(f"   ❌ Exception: {str(e)}")
    
    print("\n" + "=" * 50)
    print("🎯 Login API Test Complete!")
    return True

if __name__ == '__main__':
    test_login_api()
