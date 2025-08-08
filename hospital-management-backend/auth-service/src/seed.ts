import { Pool } from 'pg';
import { hashPassword } from '@hospital/shared';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  host: process.env.AUTH_DB_HOST || 'localhost',
  port: parseInt(process.env.AUTH_DB_PORT || '5432'),
  database: process.env.AUTH_DB_NAME || 'auth_db',
  user: process.env.AUTH_DB_USER || 'auth_user',
  password: process.env.AUTH_DB_PASSWORD || 'auth_password'
});

async function seedAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [process.env.DEFAULT_ADMIN_EMAIL || 'admin@hospital.com']
    );

    if (existingAdmin.rows.length > 0) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const adminId = uuidv4();
    const hashedPassword = await hashPassword(process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!@#');
    
    await pool.query(`
      INSERT INTO users (
        id, username, email, password_hash, role, profile, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    `, [
      adminId,
      'admin',
      process.env.DEFAULT_ADMIN_EMAIL || 'admin@hospital.com',
      hashedPassword,
      'admin',
      {
        firstName: 'System',
        lastName: 'Administrator',
        phone: '+84901234567'
      },
      true
    ]);

    console.log('Admin user created successfully');
    console.log(`Email: ${process.env.DEFAULT_ADMIN_EMAIL || 'admin@hospital.com'}`);
    console.log(`Password: ${process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!@#'}`);

    // Create sample doctor
    const doctorId = uuidv4();
    const doctorPassword = await hashPassword('Doctor123!@#');
    
    await pool.query(`
      INSERT INTO users (
        id, username, email, password_hash, role, profile, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    `, [
      doctorId,
      'doctor1',
      'doctor1@hospital.com',
      doctorPassword,
      'doctor',
      {
        firstName: 'Dr. John',
        lastName: 'Smith',
        phone: '+84901234568',
        specialization: 'Cardiology'
      },
      true
    ]);

    console.log('Sample doctor created successfully');
    console.log('Email: doctor1@hospital.com');
    console.log('Password: Doctor123!@#');

  } catch (error) {
    console.error('Error seeding users:', error);
  } finally {
    await pool.end();
  }
}

seedAdminUser();
