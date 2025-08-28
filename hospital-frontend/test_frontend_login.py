#!/usr/bin/env python3
"""
Test Frontend Login and Analytics Dashboard
"""

import requests
import json
from urllib.parse import urljoin

FRONTEND_URL = "http://localhost:8000"
API_URL = "http://localhost:3000"

def test_frontend_login():
    """Test login through Django frontend"""
    print("🏥 TESTING FRONTEND LOGIN AND ANALYTICS")
    print("=" * 60)
    
    # Create session
    session = requests.Session()
    
    # Step 1: Get login page to get CSRF token
    print("1. Getting login page...")
    login_page_url = urljoin(FRONTEND_URL, "/auth/login/")
    response = session.get(login_page_url)
    
    if response.status_code == 200:
        print(f"   ✅ Login page loaded: {response.status_code}")
        
        # Extract CSRF token
        csrf_token = None
        for line in response.text.split('\n'):
            if 'csrfmiddlewaretoken' in line and 'value=' in line:
                start = line.find('value="') + 7
                end = line.find('"', start)
                csrf_token = line[start:end]
                break
        
        if csrf_token:
            print(f"   ✅ CSRF token extracted: {csrf_token[:20]}...")
        else:
            print("   ❌ Could not extract CSRF token")
            return False
    else:
        print(f"   ❌ Failed to load login page: {response.status_code}")
        return False
    
    # Step 2: Login with test credentials
    print("\n2. Attempting login...")
    login_data = {
        'username': 'Doctortest1@',
        'password': 'Doctortest1@',
        'csrfmiddlewaretoken': csrf_token
    }
    
    login_response = session.post(login_page_url, data=login_data)
    
    if login_response.status_code == 302:  # Redirect after successful login
        print(f"   ✅ Login successful: {login_response.status_code}")
        print(f"   📍 Redirected to: {login_response.headers.get('Location', 'Unknown')}")
    elif login_response.status_code == 200:
        # Check if still on login page (failed login)
        if 'login' in login_response.url.lower():
            print("   ❌ Login failed - still on login page")
            # Check for error messages
            if 'Invalid username or password' in login_response.text:
                print("   💡 Error: Invalid username or password")
            return False
        else:
            print(f"   ✅ Login successful: {login_response.status_code}")
    else:
        print(f"   ❌ Login failed: {login_response.status_code}")
        return False
    
    # Step 3: Access dashboard
    print("\n3. Accessing dashboard...")
    dashboard_url = urljoin(FRONTEND_URL, "/dashboard/")
    dashboard_response = session.get(dashboard_url)
    
    if dashboard_response.status_code == 200:
        print(f"   ✅ Dashboard loaded: {dashboard_response.status_code}")
        
        # Check if user is logged in
        if 'logout' in dashboard_response.text.lower():
            print("   ✅ User is logged in (logout link found)")
        else:
            print("   ⚠️ User might not be logged in")
    else:
        print(f"   ❌ Dashboard failed: {dashboard_response.status_code}")
    
    # Step 4: Access analytics dashboard
    print("\n4. Accessing analytics dashboard...")
    analytics_url = urljoin(FRONTEND_URL, "/analytics/doctor/")
    analytics_response = session.get(analytics_url)
    
    if analytics_response.status_code == 200:
        print(f"   ✅ Analytics dashboard loaded: {analytics_response.status_code}")
        
        # Check for analytics content
        if 'analytics' in analytics_response.text.lower():
            print("   ✅ Analytics content found")
        if 'total_appointments' in analytics_response.text.lower():
            print("   ✅ Analytics data found")
        if 'chart' in analytics_response.text.lower():
            print("   ✅ Charts found")
            
        # Save response for debugging
        with open('analytics_response.html', 'w', encoding='utf-8') as f:
            f.write(analytics_response.text)
        print("   📄 Analytics page saved to analytics_response.html")
        
    elif analytics_response.status_code == 302:
        print(f"   ⚠️ Analytics redirected: {analytics_response.status_code}")
        print(f"   📍 Redirected to: {analytics_response.headers.get('Location', 'Unknown')}")
    elif analytics_response.status_code == 403:
        print(f"   ❌ Analytics access denied: {analytics_response.status_code}")
        print("   💡 User might not have permission to access analytics")
    else:
        print(f"   ❌ Analytics failed: {analytics_response.status_code}")
    
    # Step 5: Test API connection from frontend
    print("\n5. Testing API connection...")
    try:
        # Test direct API call
        api_response = requests.post(
            f"{API_URL}/api/auth/login",
            json={'username': 'Doctortest1@', 'password': 'Doctortest1@'},
            timeout=10
        )
        
        if api_response.status_code == 200:
            api_data = api_response.json()
            if api_data.get('success'):
                print("   ✅ API login successful")
                token = api_data.get('data', {}).get('accessToken')
                user_id = api_data.get('data', {}).get('user', {}).get('id')
                
                # Test analytics API
                analytics_api_response = requests.get(
                    f"{API_URL}/api/analytics/dashboard/doctor/{user_id}?days=30",
                    headers={'Authorization': f'Bearer {token}'},
                    timeout=10
                )
                
                if analytics_api_response.status_code == 200:
                    analytics_data = analytics_api_response.json()
                    print("   ✅ Analytics API successful")
                    print(f"   📊 Data: {json.dumps(analytics_data, indent=2)[:200]}...")
                else:
                    print(f"   ❌ Analytics API failed: {analytics_api_response.status_code}")
            else:
                print(f"   ❌ API login failed: {api_data.get('message')}")
        else:
            print(f"   ❌ API login failed: {api_response.status_code}")
            
    except Exception as e:
        print(f"   ❌ API test error: {str(e)}")
    
    print("\n" + "=" * 60)
    print("🎉 Frontend Testing Complete!")
    print(f"🌐 Frontend URL: {FRONTEND_URL}")
    print(f"📊 Analytics URL: {urljoin(FRONTEND_URL, '/analytics/doctor/')}")
    print(f"🔑 Test Credentials: Doctortest1@ / Doctortest1@")
    
    return True

if __name__ == "__main__":
    test_frontend_login()
