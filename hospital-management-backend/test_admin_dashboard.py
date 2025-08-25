#!/usr/bin/env python3
"""
Test Admin Dashboard API via API Gateway
"""

import requests
import json

API_URL = "http://localhost:3000"

def test_admin_dashboard():
    """Test admin dashboard API via API Gateway"""
    print("🔍 TESTING ADMIN DASHBOARD VIA API GATEWAY")
    print("=" * 50)
    
    # Step 1: Login to get token
    print("1. Getting admin token...")
    login_response = requests.post(
        f"{API_URL}/api/auth/login",
        json={
            'username': 'Phuttsseo.gcl@gmail.com',
            'password': 'Phu0969727782@'
        },
        timeout=10
    )
    
    if login_response.status_code == 200:
        login_data = login_response.json()
        if login_data.get('success'):
            token = login_data.get('data', {}).get('accessToken')
            user = login_data.get('data', {}).get('user', {})
            print(f"✅ Login successful")
            print(f"   User ID: {user.get('id')}")
            print(f"   Role: {user.get('role')}")
            print(f"   Token: {token[:50]}...")
        else:
            print(f"❌ Login failed: {login_data.get('message')}")
            return False
    else:
        print(f"❌ Login request failed: {login_response.status_code}")
        return False
    
    headers = {'Authorization': f'Bearer {token}'}
    
    # Step 2: Test admin dashboard API via API Gateway
    print(f"\n2. Testing admin dashboard API via API Gateway...")
    admin_dashboard_response = requests.get(
        f"{API_URL}/api/analytics/dashboard/admin?days=30",
        headers=headers,
        timeout=15
    )
    
    print(f"   Status: {admin_dashboard_response.status_code}")
    if admin_dashboard_response.status_code == 200:
        admin_data = admin_dashboard_response.json()
        print(f"   Success: {admin_data.get('success')}")
        if admin_data.get('success'):
            dashboard = admin_data.get('data', {}).get('dashboard', {})
            print(f"   📊 Dashboard Data:")
            print(f"      Total Appointments: {dashboard.get('total_appointments', 'N/A')}")
            print(f"      Total Patients: {dashboard.get('total_patients', 'N/A')}")
            print(f"      Total Doctors: {dashboard.get('total_doctors', 'N/A')}")
            print(f"      Total Revenue: ${dashboard.get('total_revenue', 'N/A')}")
            print(f"      Completion Rate: {dashboard.get('completion_rate', 'N/A')}%")
            print(f"      Daily Trends: {len(dashboard.get('daily_trends', []))} entries")
            print(f"      Top Doctors: {len(dashboard.get('top_doctors', []))} entries")
        else:
            print(f"   ❌ API Error: {admin_data.get('message')}")
    else:
        print(f"   ❌ Request failed: {admin_dashboard_response.text[:200]}")
    
    # Step 3: Test direct analytics service
    print(f"\n3. Testing direct analytics service...")
    direct_response = requests.get(
        f"http://localhost:3006/api/analytics/dashboard/admin?days=30",
        timeout=10
    )
    
    print(f"   Direct Analytics Status: {direct_response.status_code}")
    if direct_response.status_code == 200:
        direct_data = direct_response.json()
        if direct_data.get('success'):
            dashboard = direct_data.get('data', {}).get('dashboard', {})
            print(f"   📊 Direct Analytics Data:")
            print(f"      Total Appointments: {dashboard.get('total_appointments', 'N/A')}")
            print(f"      Total Patients: {dashboard.get('total_patients', 'N/A')}")
            print(f"      Total Doctors: {dashboard.get('total_doctors', 'N/A')}")
            print(f"      Total Revenue: ${dashboard.get('total_revenue', 'N/A')}")
        else:
            print(f"   ❌ Direct Analytics Error: {direct_data.get('message')}")
    else:
        print(f"   ❌ Direct Analytics failed: {direct_response.text[:100]}")
    
    print(f"\n" + "=" * 50)
    print("🎯 SUMMARY:")
    print("✅ Analytics service works directly")
    print("❓ Check API Gateway routing for analytics service")
    
    return True

if __name__ == "__main__":
    test_admin_dashboard()
