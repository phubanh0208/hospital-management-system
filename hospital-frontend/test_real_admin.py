#!/usr/bin/env python3
"""
Test with real admin credentials
"""

import requests
import re
from urllib.parse import urljoin

FRONTEND_URL = "http://localhost:8000"

def test_real_admin():
    """Test with real admin credentials"""
    print("🏥 TESTING WITH REAL ADMIN CREDENTIALS")
    print("=" * 50)
    
    session = requests.Session()
    
    # Get login page
    login_url = urljoin(FRONTEND_URL, "/auth/login/")
    response = session.get(login_url)
    
    csrf_match = re.search(r'name="csrfmiddlewaretoken" value="([^"]+)"', response.text)
    if not csrf_match:
        print("❌ Could not find CSRF token")
        return False
    
    csrf_token = csrf_match.group(1)
    print(f"✅ CSRF token extracted")
    
    # Login with provided credentials
    login_data = {
        'username': 'Phuttsseo.gcl@gmail.com',
        'password': 'Phu0969727782@',
        'csrfmiddlewaretoken': csrf_token,
    }
    
    print("🔐 Attempting login...")
    login_response = session.post(login_url, data=login_data, allow_redirects=True)
    
    if login_response.status_code == 200:
        if 'logout' in login_response.text.lower():
            print("✅ Login successful!")
            
            # Check user role in page
            if 'admin' in login_response.text.lower():
                print("✅ Admin role detected")
            elif 'doctor' in login_response.text.lower():
                print("⚠️ Doctor role detected")
            elif 'staff' in login_response.text.lower():
                print("⚠️ Staff role detected")
            else:
                print("⚠️ Role not clearly detected")
                
            # Check navbar for analytics
            if 'Admin Analytics' in login_response.text:
                print("✅ Admin Analytics link found in navbar")
            elif 'My Analytics' in login_response.text:
                print("✅ My Analytics link found in navbar")
            elif 'Analytics' in login_response.text:
                print("✅ Analytics link found in navbar")
            else:
                print("❌ No analytics link found")
                
            # Save dashboard for inspection
            with open('real_admin_dashboard.html', 'w', encoding='utf-8') as f:
                f.write(login_response.text)
            print("📄 Dashboard saved to real_admin_dashboard.html")
            
        else:
            print("❌ Login failed - still on login page")
            if 'invalid username or password' in login_response.text.lower():
                print("💡 Invalid credentials")
            return False
    else:
        print(f"❌ Login failed: {login_response.status_code}")
        return False
    
    # Test analytics access
    print("\n📊 Testing analytics access...")
    analytics_urls = [
        "/analytics/admin/",
        "/analytics/doctor/",
        "/analytics/dashboard/"
    ]
    
    for url_path in analytics_urls:
        print(f"\nTesting: {url_path}")
        analytics_url = urljoin(FRONTEND_URL, url_path)
        analytics_response = session.get(analytics_url, allow_redirects=False)
        
        if analytics_response.status_code == 200:
            print(f"✅ Analytics loaded: {analytics_response.status_code}")
            
            # Check content type
            if 'admin analytics' in analytics_response.text.lower():
                print("✅ Admin analytics content")
            elif 'my analytics' in analytics_response.text.lower():
                print("✅ Doctor analytics content")
            elif 'analytics dashboard coming soon' in analytics_response.text.lower():
                print("⚠️ Placeholder content")
            else:
                print("⚠️ Unknown analytics content")
                
            # Save analytics page
            filename = f"real_admin_analytics_{url_path.replace('/', '_')}.html"
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(analytics_response.text)
            print(f"📄 Saved to {filename}")
            
        elif analytics_response.status_code == 403:
            print(f"❌ Access denied: {analytics_response.status_code}")
        elif analytics_response.status_code == 302:
            redirect_location = analytics_response.headers.get('Location', '')
            print(f"⚠️ Redirected: {analytics_response.status_code}")
            print(f"   Location: {redirect_location}")
        else:
            print(f"❌ Failed: {analytics_response.status_code}")
    
    print("\n" + "=" * 50)
    print("🎉 Real admin test complete!")
    print("💡 Check saved HTML files for detailed content")
    
    return True

if __name__ == "__main__":
    test_real_admin()
