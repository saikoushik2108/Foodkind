import mongoose from 'mongoose';
import { env } from './env.js';

let supportsTransactions = false;

export async function connectDb() {
  const uri = env.MONGODB_URI;
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log(JSON.stringify({ time: new Date().toISOString(), level: 'info', message: 'MongoDB connected', uri }));

  // Detect replica set for transaction support
  try {
    const admin = mongoose.connection.db.admin();
    const info = await admin.replSetGetStatus().catch(() => null);
    supportsTransactions = !!info;
  } catch {
    supportsTransactions = false;
  }
  if (!supportsTransactions) {
    console.log(JSON.stringify({ time: new Date().toISOString(), level: 'warn', message: 'MongoDB deployment does not support multi-document transactions (standalone mongod detected). This is expected locally — quantity allocation uses atomic conditional updates instead.' }));
  }

  mongoose.connection.on('disconnected', () => {
    console.log(JSON.stringify({ time: new Date().toISOString(), level: 'warn', message: 'MongoDB disconnected' }));
  });
}

export function getTransactionSupport() { return supportsTransactions; }

export async function disconnectDb() {
  await mongoose.disconnect();
}
