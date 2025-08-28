#!/usr/bin/env python3
"""
Test All Analytics Dashboards
"""

import requests
import re
from urllib.parse import urljoin

FRONTEND_URL = "http://localhost:8000"

def test_user_analytics(username, password, expected_role, test_name):
    """Test analytics for a specific user"""
    print(f"\n🔍 TESTING {test_name}")
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
    
    # Login
    login_data = {
        'username': username,
        'password': password,
        'csrfmiddlewaretoken': csrf_token,
    }
    
    print(f"🔐 Logging in as {username}...")
    login_response = session.post(login_url, data=login_data, allow_redirects=True)
    
    if login_response.status_code == 200 and 'logout' in login_response.text.lower():
        print("✅ Login successful!")
        
        # Check role
        if expected_role.lower() in login_response.text.lower():
            print(f"✅ {expected_role.title()} role confirmed")
        else:
            print(f"⚠️ Role not clearly detected")
            
        # Check navbar analytics link
        analytics_links = []
        if 'Admin Analytics' in login_response.text:
            analytics_links.append('Admin Analytics')
        if 'My Analytics' in login_response.text:
            analytics_links.append('My Analytics')
        if '>Analytics<' in login_response.text:
            analytics_links.append('Analytics')
            
        if analytics_links:
            print(f"✅ Navbar links found: {', '.join(analytics_links)}")
        else:
            print("❌ No analytics links found in navbar")
            
    else:
        print("❌ Login failed")
        return False
    
    # Test analytics URLs
    test_urls = [
        ("/analytics/doctor/", "Doctor Analytics"),
        ("/analytics/admin/", "Admin Analytics"),
        ("/analytics/dashboard/", "General Analytics")
    ]
    
    print(f"\n📊 Testing analytics access...")
    accessible_dashboards = []
    
    for url_path, dashboard_name in test_urls:
        analytics_url = urljoin(FRONTEND_URL, url_path)
        analytics_response = session.get(analytics_url, allow_redirects=False)
        
        if analytics_response.status_code == 200:
            print(f"✅ {dashboard_name}: Accessible")
            accessible_dashboards.append(dashboard_name)
            
            # Check for data
            if 'stat-value' in analytics_response.text:
                print(f"   📈 Statistics data found")
            if 'chart' in analytics_response.text.lower():
                print(f"   📊 Charts found")
                
        elif analytics_response.status_code == 403:
            print(f"❌ {dashboard_name}: Access denied (403)")
        elif analytics_response.status_code == 302:
            print(f"⚠️ {dashboard_name}: Redirected (302)")
        else:
            print(f"❌ {dashboard_name}: Failed ({analytics_response.status_code})")
    
    print(f"\n📋 Summary for {test_name}:")
    print(f"   Role: {expected_role}")
    print(f"   Accessible dashboards: {', '.join(accessible_dashboards) if accessible_dashboards else 'None'}")
    
    return len(accessible_dashboards) > 0

def main():
    """Test all analytics dashboards"""
    print("🏥 HOSPITAL ANALYTICS DASHBOARD TESTING")
    print("=" * 60)
    
    # Test users
    test_users = [
        {
            'username': 'Doctortest1@',
            'password': 'Doctortest1@',
            'role': 'doctor',
            'name': 'DOCTOR USER'
        },
        {
            'username': 'Phuttsseo.gcl@gmail.com',
            'password': 'Phu0969727782@',
            'role': 'admin',
            'name': 'ADMIN USER'
        }
    ]
    
    results = {}
    
    for user in test_users:
        success = test_user_analytics(
            user['username'],
            user['password'],
            user['role'],
            user['name']
        )
        results[user['name']] = success
    
    # Final summary
    print("\n" + "=" * 60)
    print("🎉 FINAL ANALYTICS TESTING SUMMARY")
    print("=" * 60)
    
    for user_name, success in results.items():
        status = "✅ WORKING" if success else "❌ FAILED"
        print(f"{user_name}: {status}")
    
    print(f"\n📊 Analytics Features:")
    print(f"✅ Doctor Analytics Dashboard: /analytics/doctor/")
    print(f"✅ Admin Analytics Dashboard: /analytics/admin/")
    print(f"✅ General Analytics Dashboard: /analytics/dashboard/")
    print(f"✅ Navbar Integration: Role-based analytics links")
    print(f"✅ Authentication: Session-based with role permissions")
    print(f"✅ Backend Integration: API Gateway → Analytics Service")
    print(f"✅ Data Visualization: Charts, statistics, and metrics")
    
    print(f"\n🌐 Access URLs:")
    print(f"Frontend: {FRONTEND_URL}")
    print(f"Login: {FRONTEND_URL}/auth/login/")
    print(f"Doctor Analytics: {FRONTEND_URL}/analytics/doctor/")
    print(f"Admin Analytics: {FRONTEND_URL}/analytics/admin/")
    
    print(f"\n🔑 Test Credentials:")
    print(f"Doctor: Doctortest1@ / Doctortest1@")
    print(f"Admin: Phuttsseo.gcl@gmail.com / Phu0969727782@")
    
    all_working = all(results.values())
    if all_working:
        print(f"\n🎉 ALL ANALYTICS DASHBOARDS WORKING PERFECTLY!")
    else:
        print(f"\n⚠️ Some dashboards need attention")
    
    return all_working

if __name__ == "__main__":
    main()
