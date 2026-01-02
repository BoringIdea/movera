export interface PassportPollingConfig {
  // Polling interval (minutes)
  pollingInterval: number;
  
  // Number of users to process per batch
  batchSize: number;
  
  // Maximum number of transactions to fetch per user
  maxTransactionsPerUser: number;
  
  // Request interval (milliseconds)
  requestDelay: number;
  
  // Whether to enable polling service
  enabled: boolean;
  
  // Supported chains
  supportedChains: string[];
  
  // Retry count
  maxRetries: number;
  
  // Timeout (milliseconds)
  timeout: number;
}

export const defaultPollingConfig: PassportPollingConfig = {
  pollingInterval: 60, // 1 hour
  batchSize: 10, // Process 10 users per batch
  maxTransactionsPerUser: 1000, // Maximum 1000 transactions per user
  requestDelay: 2000, // 2 second interval
  enabled: true,
  supportedChains: ['aptos'],
  maxRetries: 3,
  timeout: 30000, // 30 seconds timeout
};

export const getPollingConfig = (): PassportPollingConfig => {
  return {
    pollingInterval: parseInt(process.env.PASSPORT_POLLING_INTERVAL || '5'),
    batchSize: parseInt(process.env.PASSPORT_BATCH_SIZE || '10'),
    maxTransactionsPerUser: parseInt(process.env.PASSPORT_MAX_TRANSACTIONS || '1000'),
    requestDelay: parseInt(process.env.PASSPORT_REQUEST_DELAY || '2000'),
    enabled: process.env.PASSPORT_POLLING_ENABLED !== 'false',
    supportedChains: (process.env.PASSPORT_SUPPORTED_CHAINS || 'aptos').split(','),
    maxRetries: parseInt(process.env.PASSPORT_MAX_RETRIES || '3'),
    timeout: parseInt(process.env.PASSPORT_TIMEOUT || '30000'),
  };
};
