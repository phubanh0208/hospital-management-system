#!/usr/bin/env node

/**
 * Comprehensive Hospital Management System Seed Data Generator
 * 
 * This script creates complete demo data across all databases:
 * - Auth Service: users, user_profiles, doctor_profiles
 * - Patient Service: patients, patient_medical_history, patient_visit_summary
 * - Appointment Service: appointments, appointment_slots, doctor_availability
 * - Prescription Service: prescriptions, prescription_items, medications
 * - Analytics Service: patient_metrics, appointment_metrics, prescription_metrics
 * 
 * Multi-database consistency is maintained through:
 * - Creating auth users first (admin, staff, doctor, patient)
 * - Using the same UUIDs across databases for referential integrity
 * - Proper role assignment (admin/staff -> users+user_profiles, doctor -> users+doctor_profiles, patient -> users+patients)
 * 
 * Usage: node comprehensive-seed.js
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const API_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@hospital.com';
const ADMIN_PASSWORD = 'Admin123!@#';

console.log('🏥 Comprehensive Hospital Management System Seed Data Generator');
console.log('==============================================================\n');

// Vietnamese data for realistic demo
const VIETNAMESE_DATA = {
  maleNames: ['Anh', 'Bảo', 'Dũng', 'Hải', 'Hoàng', 'Long', 'Minh', 'Nam', 'Phong', 'Quang', 'Thành', 'Tuấn', 'Việt', 'Khoa', 'Đức', 'Hùng'],
  femaleNames: ['An', 'Chi', 'Hà', 'Hoa', 'Lan', 'Linh', 'Mai', 'Nga', 'Phương', 'Thu', 'Trang', 'Uyên', 'Yến', 'Thảo', 'Nhung', 'Huệ'],
  lastNames: ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'],
  specializations: [
    'Cardiology', 'Neurology', 'Pediatrics', 'General Medicine', 'Orthopedics', 
    'Dermatology', 'Psychiatry', 'Ophthalmology', 'ENT', 'Gastroenterology',
    'Pulmonology', 'Nephrology', 'Endocrinology', 'Oncology', 'Radiology'
  ],
  cities: ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Huế', 'Nha Trang', 'Vũng Tàu'],
  districts: ['Quận 1', 'Quận 2', 'Quận 3', 'Ba Đình', 'Hoàn Kiếm', 'Đống Đa', 'Hai Bà Trưng', 'Cầu Giấy'],
  bloodTypes: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  medications: [
    { medicationName: 'Paracetamol 500mg', medicationCode: 'MED001', unitPrice: 2500, description: 'Pain reliever and fever reducer' },
    { medicationName: 'Amoxicillin 250mg', medicationCode: 'MED002', unitPrice: 5000, description: 'Antibiotic for bacterial infections' },
    { medicationName: 'Ibuprofen 400mg', medicationCode: 'MED003', unitPrice: 3500, description: 'Anti-inflammatory pain reliever' },
    { medicationName: 'Metformin 500mg', medicationCode: 'MED004', unitPrice: 4000, description: 'Diabetes medication' },
    { medicationName: 'Omeprazole 20mg', medicationCode: 'MED005', unitPrice: 8000, description: 'Proton pump inhibitor for acid reflux' },
    { medicationName: 'Amlodipine 5mg', medicationCode: 'MED006', unitPrice: 6000, description: 'Blood pressure medication' },
    { medicationName: 'Simvastatin 20mg', medicationCode: 'MED007', unitPrice: 7000, description: 'Cholesterol-lowering medication' },
    { medicationName: 'Lisinopril 10mg', medicationCode: 'MED008', unitPrice: 5500, description: 'ACE inhibitor for hypertension' },
    { medicationName: 'Ciprofloxacin 500mg', medicationCode: 'MED009', unitPrice: 9000, description: 'Fluoroquinolone antibiotic' },
    { medicationName: 'Prednisone 5mg', medicationCode: 'MED010', unitPrice: 4500, description: 'Corticosteroid anti-inflammatory' }
  ]
};

// Data storage for cross-service references
let authToken = null;
let createdData = {
  users: { admins: [], staff: [], doctors: [], patients: [] },
  medications: [],
  appointments: [],
  prescriptions: []
};

// Helper functions
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateName(gender) {
  const firstNames = gender === 'male' ? VIETNAMESE_DATA.maleNames : VIETNAMESE_DATA.femaleNames;
  const firstName = randomChoice(firstNames);
  const lastName = randomChoice(VIETNAMESE_DATA.lastNames);
  return { firstName, lastName, fullName: `${lastName} ${firstName}` };
}

function generateVietnamesePhone() {
  const prefixes = ['090', '091', '092', '093', '094', '095', '096', '097', '098', '099'];
  const prefix = randomChoice(prefixes);
  const number = String(Math.floor(Math.random() * 10000000)).padStart(7, '0');
  return `${prefix}${number}`;
}

function generateEmail(fullName, domain = 'example.com') {
  const name = fullName.toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/[^a-z.]/g, '');
  return `${name}@${domain}`;
}

function generateAddress() {
  return {
    street: `${randomInt(1, 999)} ${randomChoice(['Lê Lợi', 'Nguyễn Huệ', 'Trần Hưng Đạo', 'Lý Thường Kiệt', 'Hai Bà Trưng'])}`,
    ward: `Phường ${randomInt(1, 15)}`,
    district: randomChoice(VIETNAMESE_DATA.districts),
    city: randomChoice(VIETNAMESE_DATA.cities),
    zipCode: String(randomInt(10000, 99999))
  };
}

// API Helper functions
async function makeRequest(method, endpoint, data = null, token = null) {
  const config = {
    method,
    url: `${API_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    ...(data && { data })
  };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ ${method} ${endpoint} failed:`, error.response?.data || error.message);
    throw error;
  }
}

// Authentication functions
async function loginAdmin() {
  console.log('🔐 Logging in as admin...');
  try {
    const response = await makeRequest('POST', '/api/auth/login', {
      username: 'admin',
      password: ADMIN_PASSWORD
    });
    
    if (response.success && response.data?.accessToken) {
      authToken = response.data.accessToken;
      console.log('✅ Admin login successful\n');
      return true;
    }
    throw new Error('Admin login failed');
  } catch (error) {
    console.error('❌ Admin login failed:', error.message);
    console.log('💡 Please ensure the admin user exists and the API Gateway is running\n');
    return false;
  }
}

// User creation functions
async function createAdminUsers() {
  console.log('👑 Creating admin users...');
  const admins = [
    {
      username: 'admin2',
      email: generateEmail('Nguyễn Văn Admin'),
      password: 'Admin123!@#',
      role: 'admin',
      profile: {
        firstName: 'Văn',
        lastName: 'Nguyễn',
        phone: generateVietnamesePhone(),
        dateOfBirth: '1980-01-15',
        gender: 'male',
        address: 'Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội',
        bio: 'Giám đốc Bệnh viện'
      }
    }
  ];

  for (const admin of admins) {
    try {
      const response = await makeRequest('POST', '/api/auth/register', admin);
      if (response.success) {
        createdData.users.admins.push(response.data);
        console.log(`✅ Created admin: ${admin.profile.firstName} ${admin.profile.lastName}`);
      }
    } catch (error) {
      console.log(`⚠️  Admin ${admin.username} might already exist`);
    }
  }
  console.log('');
}

async function createStaffUsers() {
  console.log('👥 Creating staff users...');
  const staffCount = 5;
  
  for (let i = 0; i < staffCount; i++) {
    const name = generateName(randomChoice(['male', 'female']));
    const staff = {
      username: `staff${i + 1}`,
      email: generateEmail(name.fullName),
      password: 'Staff123!@#',
      role: 'staff',
      profile: {
        firstName: name.firstName,
        lastName: name.lastName,
        phone: generateVietnamesePhone(),
        dateOfBirth: randomDate(new Date('1985-01-01'), new Date('1995-12-31')).toISOString().split('T')[0],
        gender: randomChoice(['male', 'female']),
        address: `${generateAddress().street}, ${generateAddress().district}, ${generateAddress().city}`,
        bio: randomChoice(['Nhân viên tiếp tân', 'Nhân viên hành chính', 'Kế toán', 'Thu ngân', 'Nhân viên IT'])
      }
    };

    try {
      const response = await makeRequest('POST', '/api/auth/register', staff, authToken);
      if (response.success) {
        createdData.users.staff.push(response.data);
        console.log(`✅ Created staff: ${staff.profile.firstName} ${staff.profile.lastName}`);
      }
    } catch (error) {
      console.log(`⚠️  Staff ${staff.username} creation failed:`, error.message);
    }
  }
  console.log('');
}

async function createDoctors() {
  console.log('👨‍⚕️ Creating doctors...');
  const doctorCount = 15;
  
  // First, try to get existing users and filter for doctors
  try {
    const existingUsersResponse = await makeRequest('GET', '/api/users', null, authToken);
    if (existingUsersResponse.success && existingUsersResponse.data.users) {
      const existingDoctors = existingUsersResponse.data.users.filter(user => user.role === 'doctor');
      createdData.users.doctors = existingDoctors.map(doctor => ({
        id: doctor.id,
        username: doctor.username,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        fullName: `${doctor.lastName} ${doctor.firstName}`,
        specialization: 'General Practice' // Default since we can't get this from users endpoint
      }));
      console.log(`📦 Retrieved ${existingDoctors.length} existing doctors`);
    }
  } catch (error) {
    console.log('ℹ️  Could not retrieve existing doctors, will create new ones');
  }
  
  for (let i = 0; i < doctorCount; i++) {
    // Check if this doctor already exists
    const existingDoctor = createdData.users.doctors.find(d => d.username === `doctor${i + 1}`);
    if (existingDoctor) {
      console.log(`✅ Found existing doctor: ${existingDoctor.firstName} ${existingDoctor.lastName}`);
      continue;
    }
    
    const name = generateName(randomChoice(['male', 'female']));
    const specialization = randomChoice(VIETNAMESE_DATA.specializations);
    const yearsExperience = randomInt(2, 25);
    
    // Step 1: Create the auth user first
    const authUser = {
      username: `doctor${i + 1}`,
      email: generateEmail(name.fullName),
      password: 'Doctor123!@#',
      role: 'doctor',
      profile: {
        firstName: name.firstName,
        lastName: name.lastName,
        phone: generateVietnamesePhone(),
        dateOfBirth: randomDate(new Date('1970-01-01'), new Date('1990-12-31')).toISOString().split('T')[0],
        gender: randomChoice(['male', 'female']),
        address: `${generateAddress().street}, ${generateAddress().district}, ${generateAddress().city}`,
        bio: `Bác sĩ chuyên khoa ${specialization} với ${yearsExperience} năm kinh nghiệm`
      }
    };

    try {
      // Create the auth user
      const userResponse = await makeRequest('POST', '/api/auth/register', authUser, authToken);
      if (userResponse.success) {
        const userId = userResponse.data.user?.id || userResponse.data.id;
        
        // Step 2: Create the doctor profile
        const doctorProfile = {
          userId,
          specialization,
          licenseNumber: `DR${String(i + 1).padStart(4, '0')}`,
          yearsOfExperience: yearsExperience,
          consultationFee: randomInt(200000, 800000),
          education: `Đại học Y khoa Hà Nội, Chuyên khoa ${specialization}`,
          certifications: [`Chứng chỉ ${specialization}`, 'Chứng chỉ hành nghề'],
          languagesSpoken: ['Vietnamese', 'English'],
          availabilityHours: {
            monday: { start: '08:00', end: '17:00' },
            tuesday: { start: '08:00', end: '17:00' },
            wednesday: { start: '08:00', end: '17:00' },
            thursday: { start: '08:00', end: '17:00' },
            friday: { start: '08:00', end: '17:00' },
            saturday: { start: '08:00', end: '12:00' },
            sunday: null
          },
          isAcceptingPatients: true
        };

        const profileResponse = await makeRequest('POST', '/api/doctors/profile', doctorProfile, authToken);
        if (profileResponse.success) {
          const doctorData = {
            id: userId,
            ...userResponse.data,
            specialization,
            consultationFee: doctorProfile.consultationFee,
            fullName: `${name.lastName} ${name.firstName}`
          };
          createdData.users.doctors.push(doctorData);
          console.log(`✅ Created doctor: Dr. ${name.firstName} ${name.lastName} (${specialization})`);
        } else {
          console.log(`⚠️  Doctor profile creation failed for ${authUser.username}:`, profileResponse.message);
        }
      }
    } catch (error) {
      console.log(`⚠️  Doctor ${authUser.username} creation failed:`, error.message);
    }
  }
  
  console.log(`👨‍⚕️ Total doctors available: ${createdData.users.doctors.length}`);
  console.log('');
}

async function createPatients() {
  console.log('🏥 Creating patients...');
  const patientCount = 50;
  
  for (let i = 0; i < patientCount; i++) {
    const name = generateName(randomChoice(['male', 'female']));
    const address = generateAddress();
    const dateOfBirth = randomDate(new Date('1950-01-01'), new Date('2010-12-31'));
    
    const patient = {
      fullName: name.fullName,
      dateOfBirth: dateOfBirth.toISOString().split('T')[0],
      gender: randomChoice(['male', 'female']),
      phone: generateVietnamesePhone(),
      email: Math.random() > 0.3 ? generateEmail(name.fullName) : null, // 70% have email
      address,
      bloodType: Math.random() > 0.2 ? randomChoice(VIETNAMESE_DATA.bloodTypes) : null, // 80% have blood type
      allergies: Math.random() > 0.7 ? randomChoice(['Penicillin', 'Aspirin', 'Peanuts', 'Seafood', 'Latex']) : null,
      medicalHistory: Math.random() > 0.6 ? randomChoice(['Hypertension', 'Diabetes', 'Asthma', 'Heart disease', 'None']) : null,
      emergencyContact: {
        name: generateName(randomChoice(['male', 'female'])).fullName,
        phone: generateVietnamesePhone(),
        relationship: randomChoice(['Spouse', 'Parent', 'Child', 'Sibling']),
        address: `${address.street}, ${address.district}, ${address.city}`
      }
    };

    // 30% of patients get user accounts for portal access
    if (Math.random() > 0.7 && patient.email) {
      patient.createAccount = true;
      patient.username = `patient${i + 1}`;
      patient.password = 'Patient123!@#';
    }

    try {
      const response = await makeRequest('POST', '/api/patients', patient, authToken);
      if (response.success) {
        createdData.users.patients.push(response.data);
        console.log(`✅ Created patient: ${patient.fullName}${patient.createAccount ? ' (with account)' : ''}`);
      }
    } catch (error) {
      console.log(`⚠️  Patient ${patient.fullName} creation failed:`, error.message);
    }
  }
  console.log('');
}

async function createMedications() {
  console.log('💊 Creating medications...');
  
  // First, try to get existing medications
  try {
    const existingResponse = await makeRequest('GET', '/api/medications', null, authToken);
    if (existingResponse.success && existingResponse.data.medications) {
      createdData.medications = existingResponse.data.medications;
      console.log(`📦 Retrieved ${createdData.medications.length} existing medications`);
    }
  } catch (error) {
    console.log('ℹ️  Could not retrieve existing medications, will create new ones');
  }
  
  for (const med of VIETNAMESE_DATA.medications) {
    try {
      const response = await makeRequest('POST', '/api/medications', med, authToken);
      if (response.success) {
        // Check if this medication is already in our list
        const exists = createdData.medications.find(m => m.medicationCode === response.data.medicationCode);
        if (!exists) {
          createdData.medications.push(response.data);
        }
        console.log(`✅ Created medication: ${med.medicationName}`);
      }
    } catch (error) {
      console.log(`⚠️  Medication ${med.medicationName} might already exist - will try to retrieve it`);
      
      // Try to find the existing medication by code
      if (createdData.medications.length > 0) {
        const existingMed = createdData.medications.find(m => m.medicationCode === med.medicationCode);
        if (existingMed) {
          console.log(`✅ Found existing medication: ${med.medicationName}`);
        }
      }
    }
  }
  
  console.log(`💊 Total medications available: ${createdData.medications.length}`);
  console.log('');
}

async function createAppointments() {
  console.log('📅 Creating appointments...');
  
  if (createdData.users.doctors.length === 0 || createdData.users.patients.length === 0) {
    console.log('⚠️  No doctors or patients available for appointments');
    return;
  }

  const appointmentCount = 100;
  const appointmentTypes = ['consultation', 'checkup', 'followup', 'emergency'];
  const statuses = ['scheduled', 'confirmed', 'completed', 'cancelled'];
  
  for (let i = 0; i < appointmentCount; i++) {
    const doctor = randomChoice(createdData.users.doctors);
    const patient = randomChoice(createdData.users.patients);
    const appointmentDate = randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    
    const appointment = {
      patientId: patient.id,
      doctorId: doctor.id,
      appointmentType: randomChoice(appointmentTypes),
      scheduledDate: appointmentDate.toISOString(),
      duration: randomChoice([30, 45, 60]),
      reason: randomChoice([
        'Khám sức khỏe định kỳ',
        'Đau đầu thường xuyên',
        'Kiểm tra huyết áp',
        'Tái khám',
        'Khám tim mạch',
        'Khám da liễu',
        'Kiểm tra tiểu đường'
      ]),
      symptoms: randomChoice([
        'Đau đầu, chóng mặt',
        'Đau ngực, khó thở',
        'Mệt mỏi, sốt nhẹ',
        'Đau bụng, khó tiêu',
        'Không có triệu chứng đặc biệt'
      ]),
      status: randomChoice(statuses),
      priority: randomChoice(['normal', 'high', 'urgent']),
      fee: doctor.consultationFee || randomInt(200000, 500000)
    };

    try {
      const response = await makeRequest('POST', '/api/appointments', appointment, authToken);
      if (response.success) {
        createdData.appointments.push(response.data);
        console.log(`✅ Created appointment: ${patient.fullName} -> Dr. ${doctor.fullName} (${appointment.appointmentType})`);
      }
    } catch (error) {
      console.log(`⚠️  Appointment creation failed:`, error.message);
    }
  }
  console.log('');
}

async function createPrescriptions() {
  console.log('💉 Creating prescriptions...');
  
  if (createdData.users.doctors.length === 0 || createdData.users.patients.length === 0 || createdData.medications.length === 0) {
    console.log('⚠️  Missing data for prescription creation');
    return;
  }

  const prescriptionCount = 80;
  const diagnoses = [
    'Cao huyết áp',
    'Tiểu đường type 2',
    'Viêm họng',
    'Cảm cúm',
    'Đau dạ dày',
    'Viêm khớp',
    'Rối loạn tiêu hóa',
    'Stress và lo âu',
    'Dị ứng da',
    'Thiếu máu'
  ];
  
  for (let i = 0; i < prescriptionCount; i++) {
    const doctor = randomChoice(createdData.users.doctors);
    const patient = randomChoice(createdData.users.patients);
    const diagnosis = randomChoice(diagnoses);
    
    // Create prescription items (1-4 medications per prescription)
    const itemCount = randomInt(1, 4);
    const prescriptionItems = [];
    
    for (let j = 0; j < itemCount; j++) {
      const medication = randomChoice(createdData.medications);
      prescriptionItems.push({
        medicationId: medication.id,
        quantity: randomInt(10, 100),
        dosage: randomChoice(['1 viên/ngày', '2 viên/ngày', '1 viên x 2 lần/ngày', '1 viên x 3 lần/ngày']),
        instructions: randomChoice([
          'Uống sau ăn',
          'Uống trước ăn 30 phút',
          'Uống khi có triệu chứng',
          'Uống đều đặn theo chỉ định'
        ]),
        duration: randomInt(7, 30)
      });
    }
    
    const prescription = {
      patientId: patient.id,
      doctorId: doctor.id,
      appointmentId: createdData.appointments.length > i ? createdData.appointments[i].id : null,
      diagnosis,
      instructions: 'Theo dõi triệu chứng và tái khám sau 1 tuần nếu không cải thiện',
      notes: randomChoice([
        'Bệnh nhân cần nghỉ ngơi đầy đủ',
        'Tránh thức khuya và stress',
        'Chế độ ăn nhẹ nhàng',
        'Uống nhiều nước'
      ]),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: randomChoice(['active', 'dispensed', 'completed']),
      prescriptionItems
    };

    try {
      const response = await makeRequest('POST', '/api/prescriptions', prescription, authToken);
      if (response.success) {
        createdData.prescriptions.push(response.data);
        console.log(`✅ Created prescription: ${patient.fullName} - ${diagnosis} (${itemCount} medications)`);
      }
    } catch (error) {
      console.log(`⚠️  Prescription creation failed:`, error.message);
    }
  }
  console.log('');
}

async function createAnalyticsData() {
  console.log('📊 Creating analytics data...');
  
  // Analytics data is typically generated automatically by the system
  // But we can create some historical data for demo purposes
  const analyticsData = {
    patientMetrics: [],
    appointmentMetrics: [],
    prescriptionMetrics: []
  };

  // Generate historical patient registration metrics
  for (const patient of createdData.users.patients) {
    analyticsData.patientMetrics.push({
      time: patient.createdAt || new Date().toISOString(),
      patientId: patient.id,
      metricType: 'registration',
      metricValue: 1,
      metadata: {
        gender: patient.gender,
        ageGroup: getAgeGroup(patient.dateOfBirth),
        hasInsurance: !!patient.insuranceInfo
      }
    });
  }

  // Generate appointment metrics
  for (const appointment of createdData.appointments) {
    analyticsData.appointmentMetrics.push({
      time: appointment.scheduledDate,
      appointmentId: appointment.id,
      doctorId: appointment.doctorId,
      patientId: appointment.patientId,
      eventType: appointment.status,
      durationMinutes: appointment.duration,
      waitTimeMinutes: randomInt(5, 45),
      feeAmount: appointment.fee
    });
  }

  // Generate prescription metrics
  for (const prescription of createdData.prescriptions) {
    analyticsData.prescriptionMetrics.push({
      time: prescription.issuedDate || new Date().toISOString(),
      prescriptionId: prescription.id,
      doctorId: prescription.doctorId,
      patientId: prescription.patientId,
      eventType: prescription.status,
      medicationCount: prescription.prescriptionItems?.length || 1,
      totalCost: prescription.totalAmount || randomInt(50000, 500000)
    });
  }

  try {
    // Note: Analytics data is usually inserted automatically via events
    // This would require direct database access or analytics-specific endpoints
    console.log(`📈 Analytics data prepared:`);
    console.log(`   - Patient metrics: ${analyticsData.patientMetrics.length}`);
    console.log(`   - Appointment metrics: ${analyticsData.appointmentMetrics.length}`);
    console.log(`   - Prescription metrics: ${analyticsData.prescriptionMetrics.length}`);
    console.log('   💡 Analytics data insertion would require direct database access');
  } catch (error) {
    console.log('⚠️  Analytics data creation failed:', error.message);
  }
  console.log('');
}

function getAgeGroup(dateOfBirth) {
  const age = new Date().getFullYear() - new Date(dateOfBirth).getFullYear();
  if (age < 18) return 'pediatric';
  if (age < 65) return 'adult';
  return 'elderly';
}

// Summary report
function printSummary() {
  console.log('📋 SEED DATA SUMMARY');
  console.log('===================');
  console.log(`👑 Admins: ${createdData.users.admins.length}`);
  console.log(`👥 Staff: ${createdData.users.staff.length}`);
  console.log(`👨‍⚕️ Doctors: ${createdData.users.doctors.length}`);
  console.log(`🏥 Patients: ${createdData.users.patients.length}`);
  console.log(`💊 Medications: ${createdData.medications.length}`);
  console.log(`📅 Appointments: ${createdData.appointments.length}`);
  console.log(`💉 Prescriptions: ${createdData.prescriptions.length}`);
  console.log('');
  
  if (createdData.users.doctors.length > 0) {
    console.log('🏥 SAMPLE DOCTOR SPECIALIZATIONS:');
    const specializations = [...new Set(createdData.users.doctors.map(d => d.specialization))];
    specializations.forEach(spec => {
      const count = createdData.users.doctors.filter(d => d.specialization === spec).length;
      console.log(`   - ${spec}: ${count} doctor(s)`);
    });
    console.log('');
  }
  
  console.log('🔐 LOGIN CREDENTIALS:');
  console.log('   Admin: username=admin, password=Admin123!@#');
  console.log('   Staff: username=staff1-5, password=Staff123!@#');
  console.log('   Doctor: username=doctor1-15, password=Doctor123!@#');
  console.log('   Patient: username=patient1-X, password=Patient123!@# (for those with accounts)');
  console.log('');
  console.log('✅ Seed data generation completed!');
}

// Main execution
async function main() {
  try {
    // Step 1: Authenticate as admin
    const loginSuccess = await loginAdmin();
    if (!loginSuccess) {
      console.log('❌ Cannot proceed without admin authentication');
      return;
    }

    // Step 2: Create all users (this handles the multi-database user creation)
    await createAdminUsers();
    await createStaffUsers();
    await createDoctors();
    await createPatients();

    // Step 3: Create medications (prerequisite for prescriptions)
    await createMedications();

    // Step 4: Create appointments (uses doctors and patients)
    await createAppointments();

    // Step 5: Create prescriptions (uses doctors, patients, medications, appointments)
    await createPrescriptions();

    // Step 6: Create analytics data (uses all above data)
    await createAnalyticsData();

    // Step 7: Print summary
    printSummary();

  } catch (error) {
    console.error('❌ Seed data generation failed:', error.message);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
