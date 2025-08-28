#!/usr/bin/env python3
"""
Test Django Login and Analytics Access
"""

import requests
import re
from urllib.parse import urljoin

FRONTEND_URL = "http://localhost:8000"

def test_django_login_and_analytics():
    """Test complete Django login flow and analytics access"""
    print("🏥 TESTING DJANGO LOGIN AND ANALYTICS ACCESS")
    print("=" * 60)
    
    # Create session to maintain cookies
    session = requests.Session()
    
    # Step 1: Get login page and extract CSRF token
    print("1. Getting login page...")
    login_url = urljoin(FRONTEND_URL, "/auth/login/")
    response = session.get(login_url)
    
    if response.status_code != 200:
        print(f"   ❌ Failed to get login page: {response.status_code}")
        return False
    
    # Extract CSRF token using regex
    csrf_match = re.search(r'name="csrfmiddlewaretoken" value="([^"]+)"', response.text)
    if not csrf_match:
        print("   ❌ Could not find CSRF token")
        return False
    
    csrf_token = csrf_match.group(1)
    print(f"   ✅ CSRF token extracted: {csrf_token[:20]}...")
    
    # Step 2: Submit login form
    print("\n2. Submitting login form...")
    login_data = {
        'username': 'Doctortest1@',
        'password': 'Doctortest1@',
        'csrfmiddlewaretoken': csrf_token,
        'remember_me': 'on'
    }
    
    login_response = session.post(login_url, data=login_data, allow_redirects=False)
    
    if login_response.status_code == 302:
        redirect_location = login_response.headers.get('Location', '')
        print(f"   ✅ Login successful - redirected to: {redirect_location}")
        
        # Follow redirect
        if redirect_location.startswith('/'):
            redirect_url = urljoin(FRONTEND_URL, redirect_location)
        else:
            redirect_url = redirect_location
            
        dashboard_response = session.get(redirect_url)
        if dashboard_response.status_code == 200:
            print(f"   ✅ Dashboard loaded successfully")
        else:
            print(f"   ⚠️ Dashboard load failed: {dashboard_response.status_code}")
    else:
        print(f"   ❌ Login failed: {login_response.status_code}")
        # Check for error messages in response
        if 'Invalid username or password' in login_response.text:
            print("   💡 Error: Invalid credentials")
        return False
    
    # Step 3: Test analytics access
    print("\n3. Testing analytics access...")
    analytics_urls = [
        "/analytics/doctor/",
        "/analytics/dashboard/",
        "/analytics/admin/"
    ]
    
    for analytics_path in analytics_urls:
        analytics_url = urljoin(FRONTEND_URL, analytics_path)
        print(f"\n   Testing: {analytics_path}")
        
        analytics_response = session.get(analytics_url, allow_redirects=False)
        
        if analytics_response.status_code == 200:
            print(f"   ✅ Analytics loaded: {analytics_response.status_code}")
            
            # Check for analytics content
            content_checks = [
                ('analytics', 'Analytics content'),
                ('dashboard', 'Dashboard content'),
                ('chart', 'Chart elements'),
                ('total_appointments', 'Appointment data'),
                ('total_prescriptions', 'Prescription data')
            ]
            
            for check_text, description in content_checks:
                if check_text.lower() in analytics_response.text.lower():
                    print(f"   ✅ {description} found")
                else:
                    print(f"   ⚠️ {description} not found")
                    
        elif analytics_response.status_code == 302:
            redirect_location = analytics_response.headers.get('Location', '')
            print(f"   ⚠️ Analytics redirected: {analytics_response.status_code}")
            print(f"   📍 Redirected to: {redirect_location}")
            
            if 'login' in redirect_location:
                print("   💡 Redirected to login - authentication issue")
            
        elif analytics_response.status_code == 403:
            print(f"   ❌ Analytics access denied: {analytics_response.status_code}")
            print("   💡 User might not have permission")
            
        elif analytics_response.status_code == 404:
            print(f"   ❌ Analytics not found: {analytics_response.status_code}")
            print("   💡 URL might be incorrect or view not implemented")
            
        else:
            print(f"   ❌ Analytics failed: {analytics_response.status_code}")
    
    # Step 4: Test specific doctor analytics
    print("\n4. Testing specific doctor analytics...")
    
    # Try to get user ID from session or use test ID
    doctor_analytics_url = urljoin(FRONTEND_URL, "/analytics/doctor/427d58ad-38ad-4a3c-9b9e-d918bcdad497/")
    doctor_response = session.get(doctor_analytics_url, allow_redirects=False)
    
    if doctor_response.status_code == 200:
        print(f"   ✅ Doctor analytics loaded: {doctor_response.status_code}")
        
        # Save the response for inspection
        with open('doctor_analytics.html', 'w', encoding='utf-8') as f:
            f.write(doctor_response.text)
        print("   📄 Doctor analytics saved to doctor_analytics.html")
        
    elif doctor_response.status_code == 302:
        redirect_location = doctor_response.headers.get('Location', '')
        print(f"   ⚠️ Doctor analytics redirected: {doctor_response.status_code}")
        print(f"   📍 Redirected to: {redirect_location}")
        
    else:
        print(f"   ❌ Doctor analytics failed: {doctor_response.status_code}")
    
    # Step 5: Check session info
    print("\n5. Checking session info...")
    profile_url = urljoin(FRONTEND_URL, "/auth/profile/")
    profile_response = session.get(profile_url)
    
    if profile_response.status_code == 200:
        print("   ✅ Profile accessible - user is logged in")
        
        # Look for user info in the response
        if 'Doctortest1@' in profile_response.text:
            print("   ✅ User info found in profile")
        if 'doctor' in profile_response.text.lower():
            print("   ✅ Doctor role confirmed")
            
    else:
        print(f"   ⚠️ Profile not accessible: {profile_response.status_code}")
    
    print("\n" + "=" * 60)
    print("🎉 Django Login and Analytics Testing Complete!")
    print(f"🌐 Frontend URL: {FRONTEND_URL}")
    print(f"🔑 Test Credentials: Doctortest1@ / Doctortest1@")
    print("💡 Try accessing analytics manually in browser after login")
    
    return True

if __name__ == "__main__":
    test_django_login_and_analytics()
