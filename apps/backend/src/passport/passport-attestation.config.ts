export interface PassportAttestationConfig {
  enabled: boolean;
  schemaAddress: string;
  packageAddress: string;
  cronExpression: string;
  maxUsersPerBatch: number;
  expirationTime: number; // 0 for no expiration
  isRevocable: boolean;
}

export function getPassportAttestationConfig(): PassportAttestationConfig {
  return {
    enabled: process.env.PASSPORT_ATTESTATION_ENABLED === 'true',
    schemaAddress: process.env.PASSPORT_SCHEMA_ADDRESS || '0xa99423b1624bcad43d1a1abadba29b038b2e466fe24a0f9a98b22d52a6bca84f',
    packageAddress: process.env.APTOS_PACKAGE_ADDRESS || '',
    cronExpression: process.env.PASSPORT_ATTESTATION_CRON || '0 0 * * * *', // Every hour
    maxUsersPerBatch: parseInt(process.env.PASSPORT_ATTESTATION_BATCH_SIZE || '100'),
    expirationTime: parseInt(process.env.PASSPORT_ATTESTATION_EXPIRATION || '0'), // 0 for no expiration
    isRevocable: process.env.PASSPORT_ATTESTATION_REVOCABLE === 'true',
  };
}
