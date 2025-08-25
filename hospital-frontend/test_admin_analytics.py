#!/usr/bin/env python3
"""
Test Admin Analytics Dashboard
"""

import requests
import re
from urllib.parse import urljoin

FRONTEND_URL = "http://localhost:8000"
API_URL = "http://localhost:3000"

def test_admin_analytics():
    """Test admin analytics dashboard"""
    print("🏥 TESTING ADMIN ANALYTICS DASHBOARD")
    print("=" * 50)
    
    # First, try to create admin user via API
    print("1. Creating admin user...")
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
        response = requests.post(
            f"{API_URL}/api/auth/register",
            json=admin_data,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            if data.get('success'):
                print("   ✅ Admin user created successfully")
            else:
                print(f"   ⚠️ Admin user creation: {data.get('message')}")
        else:
            print(f"   ⚠️ Admin user creation failed: {response.status_code}")
            if response.status_code == 400:
                print("   💡 Admin user might already exist")
                
    except Exception as e:
        print(f"   ❌ Admin user creation error: {str(e)}")
    
    # Test login with admin credentials
    session = requests.Session()
    
    print("\n2. Testing admin login...")
    login_url = urljoin(FRONTEND_URL, "/auth/login/")
    response = session.get(login_url)
    
    csrf_match = re.search(r'name="csrfmiddlewaretoken" value="([^"]+)"', response.text)
    if not csrf_match:
        print("   ❌ Could not find CSRF token")
        return False
    
    csrf_token = csrf_match.group(1)
    
    # Try admin login with demo credentials
    login_data = {
        'username': 'admin',
        'password': 'Admin123!@#',
        'csrfmiddlewaretoken': csrf_token,
    }
    
    login_response = session.post(login_url, data=login_data, allow_redirects=True)
    
    if login_response.status_code == 200:
        if 'logout' in login_response.text.lower():
            print("   ✅ Admin login successful")
            
            # Check navbar for admin analytics
            if 'Analytics' in login_response.text:
                print("   ✅ Analytics link found in admin navbar")
            else:
                print("   ❌ Analytics link not found in admin navbar")
                
        else:
            print("   ❌ Admin login failed - still on login page")
            return False
    else:
        print(f"   ❌ Admin login failed: {login_response.status_code}")
        return False
    
    # Test admin analytics access
    print("\n3. Testing admin analytics access...")
    admin_analytics_urls = [
        "/analytics/dashboard/",
        "/analytics/admin/"
    ]
    
    for analytics_path in admin_analytics_urls:
        analytics_url = urljoin(FRONTEND_URL, analytics_path)
        print(f"\n   Testing: {analytics_path}")
        
        analytics_response = session.get(analytics_url, allow_redirects=False)
        
        if analytics_response.status_code == 200:
            print(f"   ✅ Admin analytics loaded: {analytics_response.status_code}")
            
            # Check for admin analytics content
            content_checks = [
                ('admin analytics', 'Admin analytics content'),
                ('total_appointments', 'Appointment data'),
                ('total_patients', 'Patient data'),
                ('total_doctors', 'Doctor data'),
                ('chart', 'Chart elements')
            ]
            
            for check_text, description in content_checks:
                if check_text.lower() in analytics_response.text.lower():
                    print(f"   ✅ {description} found")
                else:
                    print(f"   ⚠️ {description} not found")
                    
            # Save admin analytics page
            filename = f"admin_analytics_{analytics_path.replace('/', '_')}.html"
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(analytics_response.text)
            print(f"   📄 Admin analytics saved to {filename}")
                    
        elif analytics_response.status_code == 302:
            redirect_location = analytics_response.headers.get('Location', '')
            print(f"   ⚠️ Admin analytics redirected: {analytics_response.status_code}")
            print(f"   📍 Redirected to: {redirect_location}")
            
        elif analytics_response.status_code == 403:
            print(f"   ❌ Admin analytics access denied: {analytics_response.status_code}")
            
        else:
            print(f"   ❌ Admin analytics failed: {analytics_response.status_code}")
    
    # Test API directly
    print("\n4. Testing admin analytics API...")
    try:
        api_response = requests.post(
            f"{API_URL}/api/auth/login",
            json={'username': 'admin', 'password': 'Admin123!@#'},
            timeout=10
        )
        
        if api_response.status_code == 200:
            api_data = api_response.json()
            if api_data.get('success'):
                print("   ✅ Admin API login successful")
                token = api_data.get('data', {}).get('accessToken')
                
                # Test admin dashboard API
                admin_dashboard_response = requests.get(
                    f"{API_URL}/api/analytics/dashboard/admin?days=30",
                    headers={'Authorization': f'Bearer {token}'},
                    timeout=10
                )
                
                if admin_dashboard_response.status_code == 200:
                    dashboard_data = admin_dashboard_response.json()
                    print("   ✅ Admin dashboard API successful")
                    print(f"   📊 Sample data: {str(dashboard_data)[:200]}...")
                else:
                    print(f"   ❌ Admin dashboard API failed: {admin_dashboard_response.status_code}")
            else:
                print(f"   ❌ Admin API login failed: {api_data.get('message')}")
        else:
            print(f"   ❌ Admin API login failed: {api_response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Admin API test error: {str(e)}")
    
    print("\n" + "=" * 50)
    print("🎉 Admin Analytics Testing Complete!")
    print(f"🌐 Frontend URL: {FRONTEND_URL}")
    print(f"🔑 Admin Credentials: admin / Admin123!@#")
    print("💡 Check saved HTML files for admin analytics content")
    
    return True

if __name__ == "__main__":
    test_admin_analytics()
