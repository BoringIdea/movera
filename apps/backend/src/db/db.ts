import 'dotenv/config';

import { drizzle } from 'drizzle-orm/postgres-js';
import * as postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
console.log('connectionString', connectionString);
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// Disable prefetch as it is not supported for "Transaction" pool mode
export const queryClient = postgres(connectionString, { prepare: false });
export const db = drizzle(queryClient, { schema });
