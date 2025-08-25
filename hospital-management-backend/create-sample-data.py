#!/usr/bin/env python3
"""
Script to create sample doctor data for testing
This script creates users and doctor profiles directly in the database
"""

import psycopg2
import uuid
import bcrypt
import json
from datetime import datetime

# Database connection settings
AUTH_DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'auth_service_db',
    'user': 'auth_user',
    'password': 'auth_password_123'
}

APPOINTMENT_DB_CONFIG = {
    'host': 'localhost',
    'port': 5434,
    'database': 'appointment_service_db',
    'user': 'appointment_user',
    'password': 'appointment_password_123'
}

def hash_password(password):
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_sample_users_and_doctors():
    """Create sample users and doctor profiles"""
    
    # Sample doctor data
    doctors_data = [
        {
            'username': 'dr_john_smith',
            'email': 'john.smith@hospital.com',
            'password': 'doctor123',
            'first_name': 'John',
            'last_name': 'Smith',
            'specialization': 'Cardiology',
            'license_number': 'MD001234567',
            'years_of_experience': 15,
            'consultation_fee': 200.00,
            'education': 'MD from Harvard Medical School, Fellowship in Cardiology at Johns Hopkins',
            'certifications': ['Board Certified Cardiologist', 'Advanced Cardiac Life Support', 'Interventional Cardiology'],
            'languages_spoken': ['English', 'Vietnamese'],
            'availability_hours': {
                'monday': {'start': '08:00', 'end': '17:00'},
                'tuesday': {'start': '08:00', 'end': '17:00'},
                'wednesday': {'start': '08:00', 'end': '17:00'},
                'thursday': {'start': '08:00', 'end': '17:00'},
                'friday': {'start': '08:00', 'end': '16:00'}
            },
            'is_accepting_patients': True
        },
        {
            'username': 'dr_sarah_wilson',
            'email': 'sarah.wilson@hospital.com',
            'password': 'doctor123',
            'first_name': 'Sarah',
            'last_name': 'Wilson',
            'specialization': 'Neurology',
            'license_number': 'MD002345678',
            'years_of_experience': 12,
            'consultation_fee': 180.00,
            'education': 'MD from Stanford Medical School, Neurology Residency at UCSF',
            'certifications': ['Board Certified Neurologist', 'Epilepsy Specialist', 'Stroke Certification'],
            'languages_spoken': ['English', 'Vietnamese', 'French'],
            'availability_hours': {
                'monday': {'start': '09:00', 'end': '18:00'},
                'tuesday': {'start': '09:00', 'end': '18:00'},
                'wednesday': {'start': '09:00', 'end': '18:00'},
                'thursday': {'start': '09:00', 'end': '18:00'},
                'friday': {'start': '09:00', 'end': '17:00'}
            },
            'is_accepting_patients': True
        },
        {
            'username': 'dr_michael_brown',
            'email': 'michael.brown@hospital.com',
            'password': 'doctor123',
            'first_name': 'Michael',
            'last_name': 'Brown',
            'specialization': 'General Medicine',
            'license_number': 'MD003456789',
            'years_of_experience': 8,
            'consultation_fee': 120.00,
            'education': 'MD from University of Medicine, Internal Medicine Residency',
            'certifications': ['Board Certified Internal Medicine', 'Basic Life Support'],
            'languages_spoken': ['Vietnamese', 'English'],
            'availability_hours': {
                'monday': {'start': '08:30', 'end': '17:30'},
                'tuesday': {'start': '08:30', 'end': '17:30'},
                'wednesday': {'start': '08:30', 'end': '17:30'},
                'thursday': {'start': '08:30', 'end': '17:30'},
                'friday': {'start': '08:30', 'end': '16:00'},
                'saturday': {'start': '09:00', 'end': '12:00'}
            },
            'is_accepting_patients': True
        },
        {
            'username': 'dr_emily_davis',
            'email': 'emily.davis@hospital.com',
            'password': 'doctor123',
            'first_name': 'Emily',
            'last_name': 'Davis',
            'specialization': 'Pediatrics',
            'license_number': 'MD004567890',
            'years_of_experience': 10,
            'consultation_fee': 150.00,
            'education': 'MD from Yale Medical School, Pediatrics Residency at Children\'s Hospital',
            'certifications': ['Board Certified Pediatrician', 'Pediatric Advanced Life Support', 'Neonatal Resuscitation'],
            'languages_spoken': ['English', 'Vietnamese', 'Spanish'],
            'availability_hours': {
                'monday': {'start': '08:00', 'end': '16:00'},
                'tuesday': {'start': '08:00', 'end': '16:00'},
                'wednesday': {'start': '08:00', 'end': '16:00'},
                'thursday': {'start': '08:00', 'end': '16:00'},
                'friday': {'start': '08:00', 'end': '15:00'}
            },
            'is_accepting_patients': True
        },
        {
            'username': 'dr_robert_johnson',
            'email': 'robert.johnson@hospital.com',
            'password': 'doctor123',
            'first_name': 'Robert',
            'last_name': 'Johnson',
            'specialization': 'Orthopedics',
            'license_number': 'MD005678901',
            'years_of_experience': 20,
            'consultation_fee': 250.00,
            'education': 'MD from Johns Hopkins, Orthopedic Surgery Residency and Fellowship',
            'certifications': ['Board Certified Orthopedic Surgeon', 'Sports Medicine Specialist', 'Joint Replacement Specialist'],
            'languages_spoken': ['English', 'Vietnamese'],
            'availability_hours': {
                'monday': {'start': '07:00', 'end': '15:00'},
                'tuesday': {'start': '07:00', 'end': '15:00'},
                'wednesday': {'start': '07:00', 'end': '15:00'},
                'thursday': {'start': '07:00', 'end': '15:00'},
                'friday': {'start': '07:00', 'end': '14:00'}
            },
            'is_accepting_patients': False
        }
    ]
    
    try:
        # Connect to auth database
        auth_conn = psycopg2.connect(**AUTH_DB_CONFIG)
        auth_cur = auth_conn.cursor()
        
        # Connect to appointment database
        appointment_conn = psycopg2.connect(**APPOINTMENT_DB_CONFIG)
        appointment_cur = appointment_conn.cursor()
        
        print("Creating sample doctors...")
        
        for doctor_data in doctors_data:
            try:
                # Generate UUIDs
                user_id = str(uuid.uuid4())
                profile_id = str(uuid.uuid4())
                doctor_profile_id = str(uuid.uuid4())
                
                # Hash password
                hashed_password = hash_password(doctor_data['password'])
                
                # Create user in auth database
                auth_cur.execute("""
                    INSERT INTO users (id, username, email, password_hash, role, is_active, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
                """, (user_id, doctor_data['username'], doctor_data['email'], hashed_password, 'doctor', True))
                
                # Create user profile
                auth_cur.execute("""
                    INSERT INTO user_profiles (id, user_id, first_name, last_name, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, NOW(), NOW())
                """, (profile_id, user_id, doctor_data['first_name'], doctor_data['last_name']))
                
                # Create doctor profile
                auth_cur.execute("""
                    INSERT INTO doctor_profiles (
                        id, user_id, specialization, license_number, years_of_experience,
                        consultation_fee, education, certifications, languages_spoken,
                        availability_hours, is_accepting_patients, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                """, (
                    doctor_profile_id, user_id, doctor_data['specialization'], 
                    doctor_data['license_number'], doctor_data['years_of_experience'],
                    doctor_data['consultation_fee'], doctor_data['education'],
                    doctor_data['certifications'], doctor_data['languages_spoken'],
                    json.dumps(doctor_data['availability_hours']), doctor_data['is_accepting_patients']
                ))
                
                # Sync to appointment database
                appointment_cur.execute("""
                    INSERT INTO doctors (
                        id, user_id, username, first_name, last_name, specialization,
                        rating, total_reviews, consultation_fee, is_accepting_patients,
                        availability_hours, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                    ON CONFLICT (user_id) DO UPDATE SET
                        username = EXCLUDED.username,
                        first_name = EXCLUDED.first_name,
                        last_name = EXCLUDED.last_name,
                        specialization = EXCLUDED.specialization,
                        consultation_fee = EXCLUDED.consultation_fee,
                        is_accepting_patients = EXCLUDED.is_accepting_patients,
                        availability_hours = EXCLUDED.availability_hours,
                        updated_at = NOW()
                """, (
                    doctor_profile_id, user_id, doctor_data['username'],
                    doctor_data['first_name'], doctor_data['last_name'], doctor_data['specialization'],
                    4.5, 25, doctor_data['consultation_fee'], doctor_data['is_accepting_patients'],
                    json.dumps(doctor_data['availability_hours'])
                ))
                
                print(f"✅ Created doctor: {doctor_data['first_name']} {doctor_data['last_name']} ({doctor_data['specialization']})")
                
            except Exception as e:
                print(f"❌ Error creating doctor {doctor_data['username']}: {e}")
                continue
        
        # Commit changes
        auth_conn.commit()
        appointment_conn.commit()
        
        print(f"\n🎉 Successfully created {len(doctors_data)} sample doctors!")
        print("\nYou can now test the APIs:")
        print("- GET http://localhost:3000/api/doctors")
        print("- GET http://localhost:3000/api/doctors/available")
        print("- GET http://localhost:3000/api/doctors/search?query=cardio")
        
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        print("Make sure PostgreSQL is running and databases are created")
        
    finally:
        if 'auth_cur' in locals():
            auth_cur.close()
        if 'auth_conn' in locals():
            auth_conn.close()
        if 'appointment_cur' in locals():
            appointment_cur.close()
        if 'appointment_conn' in locals():
            appointment_conn.close()

if __name__ == "__main__":
    create_sample_users_and_doctors()
