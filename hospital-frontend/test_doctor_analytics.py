#!/usr/bin/env python3
"""
Test Doctor Analytics endpoints
"""

import requests
import json

API_BASE_URL = "http://localhost:3000"

def test_doctor_analytics():
    """Test doctor analytics with Doctortest1@ account"""
    print("🏥 TESTING DOCTOR ANALYTICS")
    print("=" * 50)
    
    # Login
    print("🔐 Logging in as Doctortest1@...")
    login_data = {
        'username': 'Doctortest1@',
        'password': 'Doctortest1@'
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/api/auth/login", json=login_data)
        print(f"Login Response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                token = data.get('data', {}).get('accessToken')
                user_data = data.get('data', {}).get('user', {})
                user_id = user_data.get('id')
                username = user_data.get('username')
                role = user_data.get('role')
                
                print(f"✅ Login successful")
                print(f"   Username: {username}")
                print(f"   Role: {role}")
                print(f"   User ID: {user_id}")
                print(f"   Token: {token[:50]}...")
                
                headers = {'Authorization': f'Bearer {token}'}
                
                # Test 1: Doctor Dashboard
                print(f"\n📊 Testing Doctor Dashboard...")
                dashboard_response = requests.get(
                    f"{API_BASE_URL}/api/analytics/dashboard/doctor/{user_id}?days=30", 
                    headers=headers
                )
                print(f"Dashboard Response: {dashboard_response.status_code}")
                
                if dashboard_response.status_code == 200:
                    dashboard_data = dashboard_response.json()
                    print("✅ Dashboard data retrieved successfully")
                    
                    if dashboard_data.get('success'):
                        dashboard = dashboard_data.get('data', {}).get('dashboard', {})
                        print(f"   📈 Total Appointments: {dashboard.get('total_appointments', 0)}")
                        print(f"   👥 Unique Patients: {dashboard.get('unique_patients', 0)}")
                        print(f"   💊 Total Prescriptions: {dashboard.get('total_prescriptions', 0)}")
                        print(f"   ✅ Completion Rate: {dashboard.get('completion_rate', 0):.1f}%")
                        print(f"   💰 Total Revenue: ${dashboard.get('total_revenue', 0)}")
                    else:
                        print(f"   ❌ Dashboard error: {dashboard_data.get('message')}")
                else:
                    print(f"❌ Dashboard failed: {dashboard_response.text[:200]}")
                
                # Test 2: Doctor Patients Analytics
                print(f"\n👥 Testing Doctor Patients Analytics...")
                patients_response = requests.get(
                    f"{API_BASE_URL}/api/analytics/doctors/{user_id}/patients?days=30", 
                    headers=headers
                )
                print(f"Patients Response: {patients_response.status_code}")
                
                if patients_response.status_code == 200:
                    patients_data = patients_response.json()
                    print("✅ Patients analytics retrieved successfully")
                    
                    if patients_data.get('success'):
                        summary = patients_data.get('data', {}).get('summary', {})
                        patients = patients_data.get('data', {}).get('patients', [])
                        print(f"   👥 Total Patients: {summary.get('total_patients', 0)}")
                        print(f"   📅 Total Appointments: {summary.get('total_appointments', 0)}")
                        print(f"   📊 Avg Appointments/Patient: {summary.get('avg_appointments_per_patient', 0)}")
                        
                        if patients:
                            print(f"   📋 Top Patients:")
                            for i, patient in enumerate(patients[:3]):
                                print(f"      {i+1}. {patient.get('patient_name')} - {patient.get('appointment_count')} appointments")
                    else:
                        print(f"   ❌ Patients error: {patients_data.get('message')}")
                else:
                    print(f"❌ Patients analytics failed: {patients_response.text[:200]}")
                
                # Test 3: Doctor Appointment Trends
                print(f"\n📈 Testing Doctor Appointment Trends...")
                trends_response = requests.get(
                    f"{API_BASE_URL}/api/analytics/doctors/{user_id}/appointments/trends?days=30", 
                    headers=headers
                )
                print(f"Trends Response: {trends_response.status_code}")
                
                if trends_response.status_code == 200:
                    trends_data = trends_response.json()
                    print("✅ Appointment trends retrieved successfully")
                    
                    if trends_data.get('success'):
                        summary = trends_data.get('data', {}).get('summary', {})
                        trends = trends_data.get('data', {}).get('trends', [])
                        print(f"   📊 Total Days: {summary.get('total_days', 0)}")
                        print(f"   📅 Total Appointments: {summary.get('total_appointments', 0)}")
                        print(f"   📈 Avg Per Day: {summary.get('avg_per_day', 0)}")
                        
                        peak_day = summary.get('peak_day')
                        if peak_day:
                            print(f"   🔥 Peak Day: {peak_day.get('appointment_date')} ({peak_day.get('appointment_count')} appointments)")
                        
                        if trends:
                            print(f"   📋 Recent Trends:")
                            for i, trend in enumerate(trends[:5]):
                                print(f"      {trend.get('appointment_date')}: {trend.get('appointment_count')} appointments, ${trend.get('daily_revenue', 0)} revenue")
                    else:
                        print(f"   ❌ Trends error: {trends_data.get('message')}")
                else:
                    print(f"❌ Appointment trends failed: {trends_response.text[:200]}")
                
                print(f"\n" + "=" * 50)
                print("🎉 Doctor Analytics Testing Completed!")
                
            else:
                print(f"❌ Login failed: {data.get('message')}")
        else:
            print(f"❌ Login failed: HTTP {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            
    except Exception as e:
        print(f"❌ Test error: {str(e)}")

if __name__ == "__main__":
    test_doctor_analytics()
