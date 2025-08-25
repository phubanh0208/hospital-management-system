#!/usr/bin/env python
"""
Test API Gateway login after restart
"""

import requests
import json
import time

def test_api_gateway_login():
    """Test login via API Gateway"""
    api_gateway_url = 'http://localhost:3000'
    auth_service_url = 'http://localhost:3001'
    
    print("🔍 Testing API Gateway Login After Restart...")
    print(f"API Gateway: {api_gateway_url}")
    print(f"Auth Service: {auth_service_url}")
    print("-" * 60)
    
    # Test data
    login_data = {
        'username': 'admin',
        'password': 'Admin123!@#'
    }
    
    # Test 1: Direct Auth Service (should work)
    print("1. Testing Auth Service directly...")
    try:
        response = requests.post(
            f"{auth_service_url}/api/auth/login",
            json=login_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"   Status: {response.status_code}")
        print(f"   Content-Type: {response.headers.get('content-type')}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Auth Service: SUCCESS")
            print(f"   User: {data.get('data', {}).get('user', {}).get('username')}")
        else:
            print(f"   ❌ Auth Service: FAILED")
            print(f"   Response: {response.text[:200]}")
            
    except Exception as e:
        print(f"   ❌ Auth Service Exception: {str(e)}")
    
    # Test 2: API Gateway (the problematic one)
    print(f"\n2. Testing API Gateway...")
    try:
        response = requests.post(
            f"{api_gateway_url}/api/auth/login",
            json=login_data,
            headers={'Content-Type': 'application/json'},
            timeout=15
        )
        
        print(f"   Status: {response.status_code}")
        print(f"   Content-Type: {response.headers.get('content-type')}")
        print(f"   Response Length: {len(response.text)} chars")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"   ✅ API Gateway: SUCCESS")
                print(f"   User: {data.get('data', {}).get('user', {}).get('username')}")
                return True
            except json.JSONDecodeError as e:
                print(f"   ❌ API Gateway JSON Parse Error: {e}")
                print(f"   Raw Response: {response.text[:200]}...")
                return False
        else:
            print(f"   ❌ API Gateway: HTTP {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
            return False
            
    except requests.exceptions.Timeout:
        print(f"   ❌ API Gateway: TIMEOUT")
        return False
    except Exception as e:
        print(f"   ❌ API Gateway Exception: {str(e)}")
        return False
    
    print("\n" + "=" * 60)
    print("🎯 API Gateway Login Test Complete!")
    return False

def test_health_endpoints():
    """Test health endpoints"""
    print("\n🏥 Testing Health Endpoints...")
    
    endpoints = [
        ('Auth Service', 'http://localhost:3001/health'),
        ('API Gateway', 'http://localhost:3000/health')
    ]
    
    for name, url in endpoints:
        try:
            response = requests.get(url, timeout=5)
            print(f"   {name}: {response.status_code}")
            if response.status_code == 200:
                try:
                    data = response.json()
                    print(f"      Services: {len(data.get('services', []))}")
                except:
                    print(f"      Response: {response.text[:100]}...")
        except Exception as e:
            print(f"   {name}: ERROR - {str(e)}")

if __name__ == '__main__':
    # Wait a bit for API Gateway to fully start
    print("⏳ Waiting for API Gateway to fully start...")
    time.sleep(5)
    
    test_health_endpoints()
    success = test_api_gateway_login()
    
    if success:
        print("\n🎉 API Gateway login is working!")
    else:
        print("\n❌ API Gateway login still has issues")
        print("💡 Try restarting the entire Docker stack:")
        print("   docker-compose down && docker-compose up -d")
