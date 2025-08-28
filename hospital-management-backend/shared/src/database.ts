import { Pool } from 'pg';
import { MongoClient, Db } from 'mongodb';
import { DatabaseConfig } from './types';
import { logger } from './logger';

// PostgreSQL connection pools
const pools: Map<string, Pool> = new Map();

export const createPostgreSQLPool = (config: DatabaseConfig): Pool => {
  const poolKey = `${config.host}:${config.port}/${config.database}`;
  
  if (pools.has(poolKey)) {
    return pools.get(poolKey)!;
  }

  const pool = new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.username,
    password: config.password,
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 10000,
    query_timeout: 10000,
    // Ensure UTF-8 encoding
    options: '--client_encoding=UTF8',
  });

  pool.on('error', (err) => {
    logger.error('PostgreSQL pool error:', err);
  });

  pools.set(poolKey, pool);
  return pool;
};

export const getPool = (serviceName: string): Pool => {
  const config = getDatabaseConfig(serviceName);
  return createPostgreSQLPool(config);
};

// MongoDB connections
const mongoClients: Map<string, MongoClient> = new Map();

export const createMongoConnection = async (config: DatabaseConfig): Promise<MongoClient> => {
  const connectionKey = `${config.host}:${config.port}`;
  
  if (mongoClients.has(connectionKey)) {
    return mongoClients.get(connectionKey)!;
  }

  const uri = `mongodb://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`;
  const client = new MongoClient(uri);
  
  await client.connect();
  mongoClients.set(connectionKey, client);
  
  logger.info(`Connected to MongoDB: ${connectionKey}`);
  return client;
};

export const getMongoDatabase = async (serviceName: string): Promise<Db> => {
  const config = getDatabaseConfig(serviceName);
  const client = await createMongoConnection(config);
  return client.db(config.database);
};

// Database configuration
export const getDatabaseConfig = (serviceName: string): DatabaseConfig => {
  const configs: Record<string, DatabaseConfig> = {
    auth: {
      host: process.env.AUTH_DB_HOST || 'localhost',
      port: parseInt(process.env.AUTH_DB_PORT || '5432'),
      database: process.env.AUTH_DB_NAME || 'auth_service_db',
      username: process.env.AUTH_DB_USER || 'auth_user',
      password: process.env.AUTH_DB_PASSWORD || 'auth_password_123'
    },
    patient: {
      host: process.env.PATIENT_DB_HOST || 'localhost',
      port: parseInt(process.env.PATIENT_DB_PORT || '5433'),
      database: process.env.PATIENT_DB_NAME || 'patient_db',
      username: process.env.PATIENT_DB_USER || 'patient_user',
      password: process.env.PATIENT_DB_PASSWORD || 'patient_password'
    },
    appointment: {
      host: process.env.APPOINTMENT_DB_HOST || 'localhost',
      port: parseInt(process.env.APPOINTMENT_DB_PORT || '5434'),
      database: process.env.APPOINTMENT_DB_NAME || 'appointment_db',
      username: process.env.APPOINTMENT_DB_USER || 'appointment_user',
      password: process.env.APPOINTMENT_DB_PASSWORD || 'appointment_password'
    },
    prescription: {
      host: process.env.PRESCRIPTION_DB_HOST || 'localhost',
      port: parseInt(process.env.PRESCRIPTION_DB_PORT || '5435'),
      database: process.env.PRESCRIPTION_DB_NAME || 'prescription_service_db',
      username: process.env.PRESCRIPTION_DB_USER || 'prescription_user',
      password: process.env.PRESCRIPTION_DB_PASSWORD || 'prescription_password_123'
    },
    analytics: {
      host: process.env.ANALYTICS_DB_HOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.ANALYTICS_DB_PORT || process.env.DB_PORT || '5436'),
      database: process.env.ANALYTICS_DB_NAME || process.env.DB_NAME || 'analytics_service_db',
      username: process.env.ANALYTICS_DB_USER || process.env.DB_USER || 'analytics_user',
      password: process.env.ANALYTICS_DB_PASSWORD || process.env.DB_PASSWORD || 'analytics_password_123'
    },
    notification: {
      host: process.env.NOTIFICATION_DB_HOST || 'localhost',
      port: parseInt(process.env.NOTIFICATION_DB_PORT || '27017'),
      database: process.env.NOTIFICATION_DB_NAME || 'notification_db',
      username: process.env.NOTIFICATION_DB_USER || 'notification_user',
      password: process.env.NOTIFICATION_DB_PASSWORD || 'notification_password'
    }
  };

  const config = configs[serviceName];
  if (!config) {
    throw new Error(`Database configuration not found for service: ${serviceName}`);
  }

  return config;
};

// Query helpers for PostgreSQL
export const executeQuery = async (
  pool: Pool,
  query: string,
  params: any[] = []
): Promise<any[]> => {
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    logger.error('Database query error:', { query, params, error });
    throw error;
  }
};

export const executeTransaction = async (
  pool: Pool,
  queries: { query: string; params?: any[] }[]
): Promise<any[]> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const results = [];
    for (const { query, params = [] } of queries) {
      const result = await client.query(query, params);
      results.push(result.rows);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction error:', { queries, error });
    throw error;
  } finally {
    client.release();
  }
};

// MongoDB helpers
export const findDocuments = async (
  db: Db,
  collection: string,
  filter: any = {},
  options: any = {}
): Promise<any[]> => {
  try {
    return await db.collection(collection).find(filter, options).toArray();
  } catch (error) {
    logger.error('MongoDB find error:', { collection, filter, options, error });
    throw error;
  }
};

export const insertDocument = async (
  db: Db,
  collection: string,
  document: any
): Promise<any> => {
  try {
    const result = await db.collection(collection).insertOne(document);
    return result.insertedId;
  } catch (error) {
    logger.error('MongoDB insert error:', { collection, document, error });
    throw error;
  }
};

export const updateDocument = async (
  db: Db,
  collection: string,
  filter: any,
  update: any
): Promise<boolean> => {
  try {
    const result = await db.collection(collection).updateOne(filter, { $set: update });
    return result.modifiedCount > 0;
  } catch (error) {
    logger.error('MongoDB update error:', { collection, filter, update, error });
    throw error;
  }
};

export const deleteDocument = async (
  db: Db,
  collection: string,
  filter: any
): Promise<boolean> => {
  try {
    const result = await db.collection(collection).deleteOne(filter);
    return result.deletedCount > 0;
  } catch (error) {
    logger.error('MongoDB delete error:', { collection, filter, error });
    throw error;
  }
};

// Connection health checks
export const checkPostgreSQLHealth = async (pool: Pool): Promise<boolean> => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    logger.error('PostgreSQL health check failed:', error);
    return false;
  }
};

export const checkMongoHealth = async (db: Db): Promise<boolean> => {
  try {
    await db.admin().ping();
    return true;
  } catch (error) {
    logger.error('MongoDB health check failed:', error);
    return false;
  }
};

// Graceful shutdown
export const closeAllConnections = async (): Promise<void> => {
  logger.info('Closing all database connections...');
  
  // Close PostgreSQL pools
  for (const [key, pool] of pools) {
    try {
      await pool.end();
      logger.info(`Closed PostgreSQL pool: ${key}`);
    } catch (error) {
      logger.error(`Error closing PostgreSQL pool ${key}:`, error);
    }
  }
  pools.clear();
  
  // Close MongoDB connections
  for (const [key, client] of mongoClients) {
    try {
      await client.close();
      logger.info(`Closed MongoDB connection: ${key}`);
    } catch (error) {
      logger.error(`Error closing MongoDB connection ${key}:`, error);
    }
  }
  mongoClients.clear();
};
