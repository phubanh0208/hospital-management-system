#!/usr/bin/env python3
"""
Quick test for navbar analytics link
"""

import requests
import re
from urllib.parse import urljoin

FRONTEND_URL = "http://localhost:8000"

def test_navbar_analytics():
    """Test navbar has analytics link"""
    print("🔍 TESTING NAVBAR ANALYTICS LINK")
    print("=" * 40)
    
    session = requests.Session()
    
    # Get login page and extract CSRF token
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
        
        # Check for analytics link in navbar
        if 'My Analytics' in login_response.text:
            print("✅ 'My Analytics' link found in navbar")
        elif 'Analytics' in login_response.text:
            print("✅ 'Analytics' link found in navbar")
        else:
            print("❌ Analytics link not found in navbar")
            
        # Check for chart icon
        if 'fa-chart-line' in login_response.text:
            print("✅ Chart icon found")
        elif 'fa-chart-bar' in login_response.text:
            print("✅ Chart bar icon found")
        else:
            print("⚠️ Chart icon not found")
            
        # Save page for inspection
        with open('dashboard_with_navbar.html', 'w', encoding='utf-8') as f:
            f.write(login_response.text)
        print("📄 Dashboard saved to dashboard_with_navbar.html")
        
    else:
        print(f"❌ Login failed: {login_response.status_code}")
        return False
    
    # Test direct analytics access
    analytics_url = urljoin(FRONTEND_URL, "/analytics/doctor/")
    analytics_response = session.get(analytics_url)
    
    if analytics_response.status_code == 200:
        print("✅ Analytics page accessible")
    else:
        print(f"❌ Analytics page failed: {analytics_response.status_code}")
    
    print("\n" + "=" * 40)
    print("🎉 Navbar test complete!")
    print("💡 Check dashboard_with_navbar.html for navbar content")
    
    return True

if __name__ == "__main__":
    test_navbar_analytics()
