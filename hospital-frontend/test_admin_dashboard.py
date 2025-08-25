#!/usr/bin/env python3
"""
Test Admin Dashboard with Doctor User
"""

import requests
import re
from urllib.parse import urljoin

FRONTEND_URL = "http://localhost:8000"

def test_admin_dashboard():
    """Test admin dashboard access"""
    print("🏥 TESTING ADMIN DASHBOARD ACCESS")
    print("=" * 40)
    
    session = requests.Session()
    
    # Login with doctor user
    login_url = urljoin(FRONTEND_URL, "/auth/login/")
    response = session.get(login_url)
    
    csrf_match = re.search(r'name="csrfmiddlewaretoken" value="([^"]+)"', response.text)
    if not csrf_match:
        print("❌ Could not find CSRF token")
        return False
    
    csrf_token = csrf_match.group(1)
    
    # Login
    login_data = {
        'username': 'Doctortest1@',
        'password': 'Doctortest1@',
        'csrfmiddlewaretoken': csrf_token,
    }
    
    login_response = session.post(login_url, data=login_data, allow_redirects=True)
    
    if login_response.status_code == 200:
        print("✅ Login successful")
    else:
        print(f"❌ Login failed: {login_response.status_code}")
        return False
    
    # Test admin analytics URL
    admin_urls = [
        "/analytics/admin/",
        "/analytics/dashboard/"
    ]
    
    for url_path in admin_urls:
        print(f"\nTesting: {url_path}")
        admin_url = urljoin(FRONTEND_URL, url_path)
        admin_response = session.get(admin_url)
        
        if admin_response.status_code == 200:
            print(f"✅ Admin dashboard loaded: {admin_response.status_code}")
            
            # Check content
            if 'admin analytics' in admin_response.text.lower():
                print("✅ Admin analytics content found")
            elif 'analytics dashboard coming soon' in admin_response.text.lower():
                print("⚠️ Placeholder content found")
            else:
                print("⚠️ Unknown content")
                
            # Save for inspection
            filename = f"admin_dashboard_{url_path.replace('/', '_')}.html"
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(admin_response.text)
            print(f"📄 Saved to {filename}")
            
        elif admin_response.status_code == 403:
            print(f"❌ Access denied: {admin_response.status_code}")
        elif admin_response.status_code == 302:
            print(f"⚠️ Redirected: {admin_response.status_code}")
            print(f"   Location: {admin_response.headers.get('Location')}")
        else:
            print(f"❌ Failed: {admin_response.status_code}")
    
    print("\n" + "=" * 40)
    print("🎉 Admin dashboard test complete!")
    
    return True

if __name__ == "__main__":
    test_admin_dashboard()
