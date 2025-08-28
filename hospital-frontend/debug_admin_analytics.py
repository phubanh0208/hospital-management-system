#!/usr/bin/env python3
"""
Debug Admin Analytics API
"""

import requests
import json

API_URL = "http://localhost:3000"

def debug_admin_analytics():
    """Debug admin analytics API calls"""
    print("🔍 DEBUGGING ADMIN ANALYTICS API")
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
    
    # Step 2: Test admin dashboard API
    print(f"\n2. Testing admin dashboard API...")
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
        else:
            print(f"   ❌ API Error: {admin_data.get('message')}")
    else:
        print(f"   ❌ Request failed: {admin_dashboard_response.text[:200]}")
    
    # Step 3: Test individual service endpoints
    print(f"\n3. Testing individual service endpoints...")
    
    # Test appointment service
    print(f"\n   3a. Testing appointment service...")
    appointment_response = requests.get(
        f"{API_URL}/api/appointments",
        headers=headers,
        timeout=10
    )
    print(f"      Appointments API: {appointment_response.status_code}")
    if appointment_response.status_code == 200:
        appt_data = appointment_response.json()
        if appt_data.get('success'):
            appointments = appt_data.get('data', {}).get('appointments', [])
            print(f"      📅 Found {len(appointments)} appointments")
            if appointments:
                print(f"      Sample: {appointments[0].get('reason', 'N/A')} - {appointments[0].get('status', 'N/A')}")
        else:
            print(f"      ❌ Appointments error: {appt_data.get('message')}")
    else:
        print(f"      ❌ Appointments failed: {appointment_response.text[:100]}")
    
    # Test patient service
    print(f"\n   3b. Testing patient service...")
    patient_response = requests.get(
        f"{API_URL}/api/patients",
        headers=headers,
        timeout=10
    )
    print(f"      Patients API: {patient_response.status_code}")
    if patient_response.status_code == 200:
        patient_data = patient_response.json()
        if patient_data.get('success'):
            patients = patient_data.get('data', {}).get('patients', [])
            print(f"      👥 Found {len(patients)} patients")
            if patients:
                print(f"      Sample: {patients[0].get('fullName', 'N/A')} - {patients[0].get('email', 'N/A')}")
        else:
            print(f"      ❌ Patients error: {patient_data.get('message')}")
    else:
        print(f"      ❌ Patients failed: {patient_response.text[:100]}")
    
    # Test doctor service
    print(f"\n   3c. Testing doctor service...")
    doctor_response = requests.get(
        f"{API_URL}/api/doctors",
        headers=headers,
        timeout=10
    )
    print(f"      Doctors API: {doctor_response.status_code}")
    if doctor_response.status_code == 200:
        doctor_data = doctor_response.json()
        if doctor_data.get('success'):
            doctors = doctor_data.get('data', {}).get('doctors', [])
            print(f"      👨‍⚕️ Found {len(doctors)} doctors")
            if doctors:
                print(f"      Sample: {doctors[0].get('fullName', 'N/A')} - {doctors[0].get('specialization', 'N/A')}")
        else:
            print(f"      ❌ Doctors error: {doctor_data.get('message')}")
    else:
        print(f"      ❌ Doctors failed: {doctor_response.text[:100]}")
    
    # Step 4: Test analytics service health
    print(f"\n4. Testing analytics service health...")
    analytics_health_response = requests.get(
        f"http://localhost:3006/health",
        timeout=5
    )
    print(f"   Analytics Service Health: {analytics_health_response.status_code}")
    if analytics_health_response.status_code == 200:
        health_data = analytics_health_response.json()
        print(f"   📊 Analytics Service: {health_data.get('status', 'Unknown')}")
        print(f"   🗄️ Database: {health_data.get('database', 'Unknown')}")
    
    # Step 5: Check analytics service logs
    print(f"\n5. Checking analytics service logs...")
    try:
        # This would require access to Docker logs
        print("   💡 Check Docker logs: docker logs hospital-analytics-service")
        print("   💡 Check API Gateway logs: docker logs hospital-api-gateway")
    except:
        pass
    
    print(f"\n" + "=" * 50)
    print("🎯 DEBUG SUMMARY:")
    print("💡 If all services return data but admin dashboard shows 0:")
    print("   1. Check analytics service database connections")
    print("   2. Check service-to-service communication")
    print("   3. Check analytics service business logic")
    print("   4. Check Docker network connectivity")
    
    return True

if __name__ == "__main__":
    debug_admin_analytics()
