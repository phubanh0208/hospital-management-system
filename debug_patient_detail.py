#!/usr/bin/env python3
"""
Debug script to test patient detail API calls and compare with Django frontend
"""

import sys
import os
import json
import requests
from datetime import datetime

# Add the Django project path
sys.path.append('hospital-frontend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hospital_frontend.settings')

import django
django.setup()

from utils.api_client import api_client

def test_patient_apis():
    """Test patient detail APIs"""
    
    print("=== Testing Patient Detail APIs ===\n")
    
    # Login first
    print("1. Logging in...")
    login_response = api_client.login("Phuttsseo.gcl@gmail.com", "Phu0969727782@")
    
    if not login_response.get('success'):
        print(f"❌ Login failed: {login_response.get('message')}")
        return
    
    token = login_response['data']['accessToken']
    print(f"✅ Login successful. Token: {token[:20]}...")
    
    # Test patient ID (from earlier tests)
    patient_id = "ecdc049b-d6ea-4f3e-a670-699f2e790b70"
    
    print(f"\n2. Testing patient detail API for ID: {patient_id}")
    
    # Test get_patient
    print("\n--- get_patient() ---")
    patient_response = api_client.get_patient(token=token, patient_id=patient_id)
    
    if patient_response.get('success'):
        patient = patient_response['data']
        print("✅ Patient API successful")
        print(f"Patient Name: {patient.get('fullName')}")
        print(f"Date of Birth: {patient.get('dateOfBirth')}")
        print(f"Phone: {patient.get('phone')}")
        print(f"Email: {patient.get('email')}")
        print(f"Blood Type: {patient.get('bloodType')}")
    else:
        print(f"❌ Patient API failed: {patient_response.get('message')}")
        return
    
    # Test visit summary
    print("\n--- get_patient_visit_summary() ---")
    visit_summary_response = api_client.get_patient_visit_summary(token=token, patient_id=patient_id)
    
    if visit_summary_response.get('success'):
        visit_summary = visit_summary_response['data']
        print("✅ Visit Summary API successful")
        print(f"Total Appointments: {visit_summary.get('totalAppointments')}")
        print(f"Active Prescriptions: {visit_summary.get('activePrescriptions')}")
        print(f"Last Appointment Date: {visit_summary.get('lastAppointmentDate')}")
        print(f"Last Prescription Date: {visit_summary.get('lastPrescriptionDate')}")
    else:
        print(f"❌ Visit Summary API failed: {visit_summary_response.get('message')}")
        visit_summary = {}
    
    # Test medical history
    print("\n--- get_patient_medical_history() ---")
    medical_history_response = api_client.get_patient_medical_history(token=token, patient_id=patient_id)
    
    if medical_history_response.get('success'):
        medical_history = medical_history_response['data']
        print(f"✅ Medical History API successful. Records: {len(medical_history) if medical_history else 0}")
        if medical_history:
            for i, history in enumerate(medical_history):
                print(f"  {i+1}. {history.get('conditionName')} - {history.get('status')}")
    else:
        print(f"❌ Medical History API failed: {medical_history_response.get('message')}")
        medical_history = []
    
    print(f"\n=== Summary ===")
    print(f"Patient loaded: {'✅' if patient_response.get('success') else '❌'}")
    print(f"Visit summary loaded: {'✅' if visit_summary_response.get('success') else '❌'}")
    print(f"Medical history loaded: {'✅' if medical_history_response.get('success') else '❌'}")
    
    # Test age calculation (simulating the template filter)
    if patient_response.get('success'):
        from apps.patients.templatetags.patient_filters import calculate_age
        birth_date = patient.get('dateOfBirth')
        age = calculate_age(birth_date)
        print(f"\nAge calculation test:")
        print(f"Birth Date: {birth_date}")
        print(f"Calculated Age: {age}")
    
    # Save test data to file for further inspection
    test_data = {
        'patient': patient_response.get('data') if patient_response.get('success') else None,
        'visit_summary': visit_summary_response.get('data') if visit_summary_response.get('success') else None,
        'medical_history': medical_history_response.get('data') if medical_history_response.get('success') else None,
        'timestamp': datetime.now().isoformat()
    }
    
    with open('patient_debug_data.json', 'w', encoding='utf-8') as f:
        json.dump(test_data, f, indent=2, ensure_ascii=False)
    print(f"\n📄 Test data saved to patient_debug_data.json")

if __name__ == "__main__":
    test_patient_apis()
