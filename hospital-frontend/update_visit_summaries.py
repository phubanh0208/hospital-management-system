#!/usr/bin/env python3
"""
Script to update visit summaries for all patients
"""

import requests
import json
import time

API_BASE_URL = "http://localhost:3000"

def login_admin():
    """Login as admin to get access token"""
    print("🔐 Logging in as admin...")
    
    login_data = {
        'username': 'admin_user',
        'password': 'Admin123!'
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/api/auth/login", json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                token = data.get('data', {}).get('accessToken')
                print("✅ Admin login successful")
                return token
            else:
                print(f"❌ Login failed: {data.get('message')}")
        else:
            print(f"❌ Login failed: HTTP {response.status_code}")
            
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        
    return None

def update_all_visit_summaries(token):
    """Update visit summaries for all patients"""
    print("\n🔄 Updating visit summaries for all patients...")
    
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        response = requests.post(f"{API_BASE_URL}/api/patients/update-all-visit-summaries", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                updated = data.get('data', {}).get('updated', 0)
                print(f"✅ Successfully updated visit summaries for {updated} patients")
                return True
            else:
                print(f"❌ Update failed: {data.get('message')}")
        else:
            print(f"❌ Update failed: HTTP {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('message', 'Unknown error')}")
            except:
                print(f"   Response: {response.text[:200]}...")
                
    except Exception as e:
        print(f"❌ Update error: {str(e)}")
        
    return False

def get_patient_visit_summary(token, patient_id):
    """Get visit summary for a specific patient"""
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        response = requests.get(f"{API_BASE_URL}/api/patients/{patient_id}/visit-summary", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                return data.get('data', {})
            else:
                print(f"❌ Get summary failed: {data.get('message')}")
        else:
            print(f"❌ Get summary failed: HTTP {response.status_code}")
            
    except Exception as e:
        print(f"❌ Get summary error: {str(e)}")
        
    return None

def test_visit_summaries(token):
    """Test visit summaries for a few patients"""
    print("\n📊 Testing visit summaries...")
    
    # Get some patients first
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        response = requests.get(f"{API_BASE_URL}/api/patients?limit=3", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                patients = data.get('data', {}).get('patients', [])
                
                for patient in patients[:3]:  # Test first 3 patients
                    patient_id = patient.get('id')
                    patient_name = patient.get('fullName', 'Unknown')
                    
                    print(f"\n👤 Testing patient: {patient_name} ({patient_id})")
                    
                    summary = get_patient_visit_summary(token, patient_id)
                    if summary:
                        print(f"   📅 Total Appointments: {summary.get('totalAppointments', 0)}")
                        print(f"   💊 Active Prescriptions: {summary.get('activePrescriptions', 0)}")
                        print(f"   📆 Last Appointment: {summary.get('lastAppointmentDate', 'None')}")
                        print(f"   📋 Last Prescription: {summary.get('lastPrescriptionDate', 'None')}")
                    else:
                        print("   ❌ Failed to get visit summary")
                        
            else:
                print(f"❌ Get patients failed: {data.get('message')}")
        else:
            print(f"❌ Get patients failed: HTTP {response.status_code}")
            
    except Exception as e:
        print(f"❌ Test error: {str(e)}")

def main():
    """Main function"""
    print("🏥 HOSPITAL MANAGEMENT SYSTEM - VISIT SUMMARY UPDATER")
    print("=" * 60)
    
    # Check if API Gateway is running
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ API Gateway is running")
        else:
            print("❌ API Gateway health check failed")
            return
    except Exception as e:
        print(f"❌ Cannot connect to API Gateway: {str(e)}")
        print("Please ensure all backend services are running")
        return
    
    # Login as admin
    token = login_admin()
    if not token:
        print("❌ Failed to login as admin")
        return
    
    # Update all visit summaries
    success = update_all_visit_summaries(token)
    if not success:
        print("❌ Failed to update visit summaries")
        return
    
    # Test some visit summaries
    test_visit_summaries(token)
    
    print("\n" + "=" * 60)
    print("🎉 Visit summary update completed!")
    print("You can now check patient detail pages to see updated statistics.")

if __name__ == "__main__":
    main()
