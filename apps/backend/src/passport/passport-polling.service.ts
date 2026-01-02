import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { PassportService } from './passport.service';
import { Aptos, AptosConfig, Network, AccountAddress } from '@aptos-labs/ts-sdk';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { db } from '../db/db';
import { 
  passport_scores, 
  user_transactions, 
  user_activities, 
  user_protocols, 
  user_badges, 
  passport_score_history,
  protocols,
  data_sync_status
} from '../db/schema';
import { getPollingConfig, PassportPollingConfig } from './passport-polling.config';
import { Cron, CronExpression } from '@nestjs/schedule';

interface TransactionData {
  txHash: string;
  txVersion: bigint; 
  functionName?: string;
  protocolAddress?: string;
  protocolName?: string;
  amount?: number;
  tokenSymbol?: string;
  operationType?: string;
  complexityLevel?: number;
  gasUsed?: number;
  success: boolean;
  timestamp: Date;
}

interface ActivityData {
  totalTransactions: number;
  activeDays: number;
  longestStreak: number;
  lastActivityAt: Date;
  lastActivityAtIndex: number;
}

interface ProtocolData {
  protocolAddress: string;
  protocolName: string;
  protocolCategory: string;
  interactionCount: number;
  totalVolume: number;
  firstInteractionAt: Date;
  lastInteractionAt: Date;
  isDeepInteraction: boolean;
}

@Injectable()
export class PassportPollingService {
  private readonly logger = new Logger(PassportPollingService.name);
  private aptosClient: Aptos;
  private config: PassportPollingConfig;

  constructor(
    @Inject(forwardRef(() => PassportService))
    private readonly passportService: PassportService
  ) {
    this.config = getPollingConfig();
    // Notic: Use Mainnet API Key
    const clientConfig = {
      API_KEY: process.env.APTOS_MAINNET_API_KEY,
    };
    this.aptosClient = new Aptos(
      new AptosConfig({
        network: Network.MAINNET,
        clientConfig,
        fullnode: process.env.APTOS_MAINNET_FULLNODE_URL,
      }),
    );
  }

  @Cron(CronExpression.EVERY_12_HOURS)
  async handlePassportScoreUpdate() {
    if (!this.config.enabled) {
      this.logger.log('Passport polling is disabled');
      return;
    }

    this.logger.log('Starting passport score update polling...');
    
    try {
      // 1. Get users from passport_scores database in batches
      const users = await this.getUsersForUpdate();
      this.logger.log(`Found ${users.length} users to update`);

      // 2. Process users in batches
      for (let i = 0; i < users.length; i += this.config.batchSize) {
        const batch = users.slice(i, i + this.config.batchSize);
        await this.processBatch(batch);
        
        // Avoid too frequent requests
        await this.delay(this.config.requestDelay);
      }

      this.logger.log('Passport score update polling completed');
    } catch (error) {
      this.logger.error('Error in passport score update polling:', error);
    }
  }

  private async getUsersForUpdate() {
    // Get users with recent activity, sorted by update time
    const users = await db
      .select({
        user_address: passport_scores.user_address,
        chain: passport_scores.chain,
        last_updated: passport_scores.updated_at,
      })
      .from(passport_scores)
      .orderBy(desc(passport_scores.updated_at))
      .limit(100); // Process 100 users per time

    return users;
  }

  private async processBatch(users: any[]) {
    const promises = users.map(user => this.processUser(user));
    await Promise.allSettled(promises);
  }

  async processUser(user: { user_address: string; chain: string }) {
    const { user_address, chain } = user;
    
    try {
      this.logger.log(`Processing user: ${user_address}`);
      
      // 2. Get data from user_transactions table in database by user address
      const existingTransactions = await this.getUserTransactions(user_address, chain);
      const lastTransactionIndex = existingTransactions.length > 0 
        ? Number(Math.max(...existingTransactions.map(tx => Number(tx.tx_version))))
        : 0;

      this.logger.log(`User ${user_address} has ${existingTransactions.length} existing transactions, lastTransactionIndex: ${lastTransactionIndex}`);

      // 3. Fetch transactions that user has not processed from chain
      this.logger.log(`Fetching new transactions for user: ${user_address}`);
      let startTime = Date.now();
      const newTransactions = await this.fetchNewTransactions(
        user_address, 
        chain, 
        lastTransactionIndex
      );

      if (newTransactions.length === 0) {
        this.logger.log(`No new transactions for user: ${user_address}`);
        return;
      }
      let endTime = Date.now();
      let duration = ((endTime - startTime) / 1000).toFixed(2);
      this.logger.log(`Fetched new transactions for user: ${user_address} in ${duration}s`);

      // 4. Filter and process user's latest fetched transactions
      this.logger.log(`Processing ${newTransactions.length} new transactions for user: ${user_address}`);
      startTime = Date.now();
      await this.processNewTransactions(user_address, chain, newTransactions);
      endTime = Date.now();
      duration = ((endTime - startTime) / 1000).toFixed(2);
      this.logger.log(`Processed new transactions for user: ${user_address} in ${duration}s`);

      // 5. Recalculate user score
      this.logger.log(`Recalculating user score for user: ${user_address}`);
      startTime = Date.now();
      await this.recalculateUserScore(user_address, chain);
      endTime = Date.now();
      duration = ((endTime - startTime) / 1000).toFixed(2);
      this.logger.log(`Recalculated user score for user: ${user_address} in ${duration}s`);

      this.logger.log(`Successfully processed user: ${user_address}`);
    } catch (error) {
      this.logger.error(`Error processing user ${user_address}:`, error);
      await this.updateSyncStatus(user_address, chain, 'failed', error.message);
    }
  }

  private async getUserTransactions(userAddress: string, chain: string) {
    return await db
      .select()
      .from(user_transactions)
      .where(and(
        eq(user_transactions.user_address, userAddress),
        eq(user_transactions.chain, chain)
      ))
      .orderBy(desc(user_transactions.tx_version));
  }

  private async fetchNewTransactions(
    userAddress: string, 
    chain: string, 
    lastTransactionIndex: number
  ): Promise<TransactionData[]> {
    if (chain !== 'aptos') {
      this.logger.warn(`Unsupported chain: ${chain}`);
      return [];
    }

    try {
      const accountAddress = AccountAddress.fromString(userAddress);
      const allTransactions = [];
      let offset = 0;
      const pageSize = 100;
      let foundNewTransactions = false;

      this.logger.log(`Fetching transactions for ${userAddress}, lastTransactionIndex: ${lastTransactionIndex}`);

      while (true) {
        const pageTransactions = await this.aptosClient.getAccountTransactions({
          accountAddress,
          options: { limit: pageSize, offset: offset },
        });

        if (pageTransactions.length === 0) {
          this.logger.log(`No more transactions at offset ${offset}`);
          break;
        }

        this.logger.log(`Fetched ${pageTransactions.length} transactions at offset ${offset}`);

        // Check if these transactions have been processed
        const newTransactions = pageTransactions.filter(tx => {
          const version = 'version' in tx ? BigInt(tx.version) : BigInt(0);
          const isNew = version > BigInt(lastTransactionIndex);
          if (isNew) {
            this.logger.log(`Found new transaction: version ${version}, lastIndex: ${lastTransactionIndex}`);
          }
          return isNew;
        });

        if (newTransactions.length > 0) {
          foundNewTransactions = true;
          allTransactions.push(...newTransactions);
          this.logger.log(`Added ${newTransactions.length} new transactions, total: ${allTransactions.length}`);
        }

        // If there are no new transactions on this page, we have fetched all new transactions
        if (newTransactions.length === 0 && foundNewTransactions) {
          this.logger.log(`No more new transactions found, stopping pagination`);
          break;
        }

        // If there are no new transactions on this page and we haven't found any new transactions, continue to the next page
        if (newTransactions.length === 0 && !foundNewTransactions) {
          offset += pageSize;
          continue;
        }

        offset += pageSize;

        // Avoid fetching too much data
        if (allTransactions.length >= this.config.maxTransactionsPerUser) {
          this.logger.log(`Reached max transactions limit: ${this.config.maxTransactionsPerUser}`);
          break;
        }
      }

      this.logger.log(`Total new transactions found: ${allTransactions.length}`);
      return await this.parseTransactions(allTransactions, userAddress, chain);
    } catch (error) {
      this.logger.error(`Error fetching transactions for ${userAddress}:`, error);
      return [];
    }
  }

  private async parseTransactions(transactions: any[], userAddress: string, chain: string): Promise<TransactionData[]> {
    this.logger.log(`Parsing ${transactions.length} transactions for user: ${userAddress}`);
    // Use concurrent processing to improve performance
    const batchSize = 50; // Process 50 transactions per batch
    const results: TransactionData[] = [];
    
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      const batchPromises = batch.map(tx => this.parseSingleTransaction(tx, userAddress, chain));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      this.logger.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(transactions.length / batchSize)} (${batchResults.length} transactions)`);
    }
    
    return results;
  }

  private async parseSingleTransaction(tx: any, userAddress: string, chain: string): Promise<TransactionData> {
    const version = 'version' in tx ? BigInt(tx.version) : BigInt(0);
    const timestamp = 'timestamp' in tx ? new Date(parseInt(tx.timestamp) / 1000) : new Date();
    
    // Parse function name and protocol information
    let functionName = '';
    let protocolAddress = '';
    let protocolName = '';
    let operationType = 'basic';
    let complexityLevel = 1;
    let amount = 0;
    let tokenSymbol = 'APT';

    if ('payload' in tx && tx.payload && 'function' in tx.payload) {
      functionName = String(tx.payload.function || '');
      
      // Extract protocol address and module information from function name
      const functionParts = functionName.split('::');
      if (functionParts.length >= 3) {
        protocolAddress = functionParts[0];
        const moduleName = functionParts[1];
        const actualFunctionName = functionParts[2];
        
        // Use more precise function name for判断
        const fullFunctionName = `${moduleName}::${actualFunctionName}`;
        
        // Determine operation type based on module and function name
        if (moduleName === 'scripts' || moduleName === 'entry') {
          // Script calls are usually user-initiated
          if (actualFunctionName.includes('swap') || actualFunctionName.includes('exchange')) {
            operationType = 'advanced';
            complexityLevel = 2;
          } else if (actualFunctionName.includes('liquidity') || actualFunctionName.includes('stake')) {
            operationType = 'complex';
            complexityLevel = 3;
          } else if (actualFunctionName.includes('withdraw') || actualFunctionName.includes('deposit')) {
            operationType = 'advanced';
            complexityLevel = 2;
          }
        } else if (moduleName === 'coin') {
          // Token-related operations
          if (actualFunctionName === 'transfer') {
            operationType = 'basic';
            complexityLevel = 1;
          }
        }
      } else if (functionParts.length >= 2) {
        protocolAddress = functionParts[0];
      }

      // Parse transaction amount - get from payload arguments
      if ('arguments' in tx.payload && tx.payload.arguments && Array.isArray(tx.payload.arguments)) {
        // Find amount parameter - prioritize numeric parameters
        for (const arg of tx.payload.arguments) {
          if (typeof arg === 'string' && !isNaN(Number(arg)) && Number(arg) > 0) {
            const numValue = Number(arg);
            if (isFinite(numValue) && numValue <= 1e12) { // Limit maximum value to 1 trillion
              amount = numValue;
              break;
            }
          } else if (typeof arg === 'number' && arg > 0 && isFinite(arg) && arg <= 1e12) {
            amount = arg;
            break;
          }
        }
      }

      // Determine operation type and complexity based on function name
      if (functionName.includes('swap') 
        || functionName.includes('exchange') 
        || functionName.includes('deposit') 
        || functionName.includes('withdraw')) {
        operationType = 'advanced';
        complexityLevel = 2;
      } else if (functionName.includes('liquidity') 
        || functionName.includes('stake') 
        || functionName.includes('borrow')
        || functionName.includes('repay')) {
        operationType = 'complex';
        complexityLevel = 3;
      }

      // Special handling for transfer transactions
      if (functionName.includes('coin::transfer')) {
        operationType = 'basic';
        complexityLevel = 1;
        // For transfer transactions, the second parameter is usually the amount
        if ('arguments' in tx.payload && tx.payload.arguments && tx.payload.arguments.length >= 2) {
          const amountArg = tx.payload.arguments[1];
          if (typeof amountArg === 'string' && !isNaN(Number(amountArg))) {
            const numValue = Number(amountArg);
            if (isFinite(numValue) && numValue <= 1e12) {
              amount = numValue;
            }
          }
        }
      }
    }

    // Try to get more accurate amount information from transaction events
    if ('events' in tx && Array.isArray(tx.events)) {
      for (const event of tx.events) {
        // Find APT-related coin events
        if (event.type && (
          event.type.includes('coin::CoinWithdraw') || 
          event.type.includes('coin::CoinDeposit') ||
          event.type.includes('0x1::aptos_coin::AptosCoin') ||
          event.type.includes('coin::Transfer')
        )) {
          if (event.data && 'amount' in event.data) {
            const numValue = Number(event.data.amount);
            if (isFinite(numValue) && numValue <= 1e12) {
              amount = numValue;
              break;
            }
          }
        }
      }
    }

    // If still no amount found, try to get from transaction changes
    if (amount === 0 && 'changes' in tx && Array.isArray(tx.changes)) {
      for (const change of tx.changes) {
        if (change.type && change.type.includes('coin::CoinStore')) {
          if (change.data && 'coin' in change.data && 'value' in change.data.coin) {
            const numValue = Number(change.data.coin.value);
            if (isFinite(numValue) && numValue <= 1e12) {
              amount = numValue;
              break;
            }
          }
        }
      }
    }

    // Finally verify amount value, ensure it is a safe number, and convert to correct APT quantity
    const safeAmount = (amount && isFinite(amount) && amount <= 1e12) ? amount / 1e8 : 0;

    return {
      txHash: 'hash' in tx ? tx.hash : '',
      txVersion: version,
      functionName,
      protocolAddress,
      protocolName,
      amount: safeAmount,
      tokenSymbol,
      operationType,
      complexityLevel,
      gasUsed: 'gas_used' in tx ? Number(tx.gas_used) : 0,
      success: 'success' in tx ? tx.success : true,
      timestamp,
    };
  }

  private async processNewTransactions(
    userAddress: string, 
    chain: string, 
    transactions: TransactionData[]
  ) {
    // Parallel execution of all operations to improve performance
    await Promise.all([
      // 4.1 Update user_activities table
      this.updateUserActivities(userAddress, chain, transactions),
      
      // 4.2 Update user_protocols table
      this.updateUserProtocols(userAddress, chain, transactions),
      
      // Save new transactions to database
      this.saveTransactions(userAddress, chain, transactions)
    ]);

    // 4.3 Update user_badges table (depends on user_protocols data)
    await this.updateUserBadges(userAddress, chain);
  }

  private async updateUserActivities(
    userAddress: string, 
    chain: string, 
    transactions: TransactionData[]
  ) {
    // Get existing activity data
    const existingActivity = await db
      .select()
      .from(user_activities)
      .where(and(
        eq(user_activities.user_address, userAddress),
        eq(user_activities.chain, chain)
      ))
      .limit(1);

    const activityData = this.calculateActivityData(transactions, existingActivity[0]);
    
    if (existingActivity.length > 0) {
      await db
        .update(user_activities)
        .set({
          total_transactions: activityData.totalTransactions,
          active_days: activityData.activeDays,
          longest_streak: activityData.longestStreak,
          last_activity_at: activityData.lastActivityAt,
          last_activity_at_index: activityData.lastActivityAtIndex,
          updated_at: new Date(),
        })
        .where(and(
          eq(user_activities.user_address, userAddress),
          eq(user_activities.chain, chain)
        ));
    } else {
      await db.insert(user_activities).values({
        user_address: userAddress,
        chain,
        total_transactions: activityData.totalTransactions,
        active_days: activityData.activeDays,
        longest_streak: activityData.longestStreak,
        last_activity_at: activityData.lastActivityAt,
        last_activity_at_index: activityData.lastActivityAtIndex,
      });
    }
  }

  private calculateActivityData(
    transactions: TransactionData[], 
    existingActivity?: any
  ): ActivityData {
    const totalTransactions = (existingActivity?.total_transactions || 0) + transactions.length;
    
    // Calculate active days
    const transactionDates = transactions.map(tx => 
      tx.timestamp.toISOString().split('T')[0]
    );
    const uniqueDates = new Set(transactionDates);
    const activeDays = (existingActivity?.active_days || 0) + uniqueDates.size;

    // Calculate longest consecutive active days (simplified implementation)
    const longestStreak = Math.max(
      existingActivity?.longest_streak || 0,
      this.calculateLongestStreak(transactions)
    );

    const lastActivityAt = transactions.length > 0 
      ? transactions[0].timestamp 
      : existingActivity?.last_activity_at || new Date();

    return {
      totalTransactions,
      activeDays,
      longestStreak,
      lastActivityAt,
      lastActivityAtIndex: transactions.length > 0 ? Number(transactions[0].txVersion) : 0,
    };
  }

  private calculateLongestStreak(transactions: TransactionData[]): number {
    // Simplified implementation, should analyze all historical transactions
    const dates = transactions
      .map(tx => tx.timestamp.toISOString().split('T')[0])
      .sort();
    
    let maxStreak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (diffDays === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    
    return maxStreak;
  }

  private async updateUserProtocols(
    userAddress: string, 
    chain: string, 
    transactions: TransactionData[]
  ) {
    // Collect all protocol addresses
    const protocolAddresses = [...new Set(transactions
      .map(tx => tx.protocolAddress)
      .filter(addr => addr)
    )];

    if (protocolAddresses.length === 0) return;

    // Batch get protocol information
    const protocolInfo = await db
      .select()
      .from(protocols)
      .where(inArray(protocols.address, protocolAddresses));

    const protocolInfoMap = new Map(
      protocolInfo.map(p => [p.address, p])
    );

    // Batch get existing user protocol data
    const existingUserProtocols = await db
      .select()
      .from(user_protocols)
      .where(and(
        eq(user_protocols.user_address, userAddress),
        eq(user_protocols.chain, chain),
        inArray(user_protocols.protocol_address, protocolAddresses)
      ));

    const existingProtocolMap = new Map(
      existingUserProtocols.map(p => [p.protocol_address, p])
    );

    // Process protocol data
    const protocolMap = new Map<string, ProtocolData>();
    
    for (const tx of transactions) {
      if (!tx.protocolAddress) continue;
      
      const key = tx.protocolAddress;
      if (!protocolMap.has(key)) {
        const protocolInfo = protocolInfoMap.get(tx.protocolAddress);
        const protocolData: ProtocolData = {
          protocolAddress: tx.protocolAddress,
          protocolName: protocolInfo?.name || 'Unknown',
          protocolCategory: protocolInfo?.type || 'Unknown',
          interactionCount: 0,
          totalVolume: 0,
          firstInteractionAt: tx.timestamp,
          lastInteractionAt: tx.timestamp,
          isDeepInteraction: false,
        };
        
        protocolMap.set(key, protocolData);
      }
      
      const protocol = protocolMap.get(key)!;
      protocol.interactionCount++;
      protocol.totalVolume += tx.amount || 0;
      protocol.lastInteractionAt = tx.timestamp;
    }

    // Batch update database
    const updatePromises = [];
    const insertPromises = [];

    for (const [address, protocolData] of protocolMap) {
      const existing = existingProtocolMap.get(address);
      
      if (existing) {
        updatePromises.push(
          db
            .update(user_protocols)
            .set({
              interaction_count: existing.interaction_count + protocolData.interactionCount,
              total_volume: sql`${user_protocols.total_volume} + ${protocolData.totalVolume}`,
              last_interaction_at: protocolData.lastInteractionAt,
              is_deep_interaction: (existing.interaction_count + protocolData.interactionCount) >= 5 && 
                                 (Number(existing.total_volume) + protocolData.totalVolume) >= 100,
            })
            .where(and(
              eq(user_protocols.user_address, userAddress),
              eq(user_protocols.chain, chain),
              eq(user_protocols.protocol_address, address)
            ))
        );
      } else {
        insertPromises.push(
          db.insert(user_protocols).values({
            user_address: userAddress,
            chain,
            protocol_address: address,
            protocol_name: protocolData.protocolName,
            protocol_category: protocolData.protocolCategory,
            interaction_count: protocolData.interactionCount,
            total_volume: protocolData.totalVolume.toString(),
            first_interaction_at: protocolData.firstInteractionAt,
            last_interaction_at: protocolData.lastInteractionAt,
            is_deep_interaction: protocolData.interactionCount >= 5 && protocolData.totalVolume >= 100,
          })
        );
      }
    }

    // Parallel execution of all database operations
    await Promise.all([...updatePromises, ...insertPromises]);
  }

  private async updateUserBadges(userAddress: string, chain: string) {
    // Get user protocol data
    const userProtocols = await db
      .select()
      .from(user_protocols)
      .where(and(
        eq(user_protocols.user_address, userAddress),
        eq(user_protocols.chain, chain)
      ));

    // Debug log: output user protocol data
    this.logger.debug(`User ${userAddress} protocols:`, userProtocols.map(p => ({
      address: p.protocol_address,
      name: p.protocol_name,
      category: p.protocol_category,
      interactionCount: p.interaction_count
    })));

    // Define badge rules
    const badgeRules = [
      {
        id: 'first_transaction',
        name: 'First Transaction', 
        description: 'Complete your first on-chain transaction',
        condition: async () => {
          // Check if user has any transaction records
          const userTransactions = await db
            .select()
            .from(user_transactions)
            .where(and(
              eq(user_transactions.user_address, userAddress),
              eq(user_transactions.chain, chain)
            ))
            .limit(1);
          
          return userTransactions.length > 0;
        }
      },
      {
        id: 'defi_pioneer',
        name: 'DeFi Pioneer',
        description: 'Interacted with 5+ DeFi protocols',
        condition: async () => userProtocols.filter(
          p => p.protocol_category === 'lending' 
          || p.protocol_category === 'borrow'
          || p.protocol_category === 'supply'
          || p.protocol_category === 'deposit'
          || p.protocol_category === 'withdraw'
          || p.protocol_category === 'swap'
          || p.protocol_category === 'repay'
          || p.protocol_category === 'liquidate'
          || p.protocol_category === 'stake'
          || p.protocol_category === 'unstake'
          || p.protocol_category === 'pool'
          || p.protocol_category === 'staking'
          || p.protocol_category === 'dex'
          || p.protocol_category === 'defi'
          || p.protocol_category === 'yield'
          || p.protocol_category === 'liquidity'
        ).length >= 5,
      },
      {
        id: 'volume_trader',
        name: 'Volume Trader',
        description: 'Traded over $10K in volume',
        condition: async () => userProtocols.reduce((sum, p) => sum + Number(p.total_volume), 0) >= 10000,
      },
      {
        id: 'liquidity_provider',
        name: 'Liquidity Provider',
        description: 'Provided liquidity to 3+ pools',
        condition: async () => userProtocols.filter(
          p => p.protocol_category === 'pool' 
          || p.protocol_category === 'liquidity'
          || p.protocol_category === 'dex'
          || p.protocol_category === 'swap'
        ).length >= 3,
      },
      {
        id: 'defi_explorer',
        name: 'DeFi Explorer',
        description: 'Interact with 3+ DeFi protocols',
        condition: async () => userProtocols.filter(
          p => p.protocol_category === 'lending' 
          || p.protocol_category === 'borrow'
          || p.protocol_category === 'supply'
          || p.protocol_category === 'deposit'
          || p.protocol_category === 'withdraw'
          || p.protocol_category === 'swap'
          || p.protocol_category === 'repay'
          || p.protocol_category === 'liquidate'
          || p.protocol_category === 'stake'
          || p.protocol_category === 'unstake'
          || p.protocol_category === 'pool'
          || p.protocol_category === 'staking'
          || p.protocol_category === 'dex'
          || p.protocol_category === 'defi'
          || p.protocol_category === 'yield'
          || p.protocol_category === 'liquidity'
        ).length >= 3,
      },
      {
        id: 'governance_participant',
        name: 'Governance Participant',
        description: 'Participate in protocol governance',
        condition: async () => {
          // Check if user has any governance-related transactions
          const governanceTransactions = await db
            .select()
            .from(user_transactions)
            .where(and(
              eq(user_transactions.user_address, userAddress),
              eq(user_transactions.chain, chain),
              sql`${user_transactions.function_name} ILIKE '%vote%' OR ${user_transactions.function_name} ILIKE '%governance%' OR ${user_transactions.function_name} ILIKE '%proposal%'`
            ))
            .limit(1);
          
          return governanceTransactions.length > 0;
        }
      },
    ];

    // Check and update badges
    for (const rule of badgeRules) {
      const earned = await rule.condition();
      
      // Calculate progress percentage
      let progress = 0;
      if (earned) {
        progress = 100;
      } else {
        // Calculate actual progress for incomplete achievements
        if (rule.id === 'defi_explorer') {
          const defiProtocols = userProtocols.filter(
            p => p.protocol_category === 'lending' 
            || p.protocol_category === 'borrow'
            || p.protocol_category === 'supply'
            || p.protocol_category === 'deposit'
            || p.protocol_category === 'withdraw'
            || p.protocol_category === 'swap'
            || p.protocol_category === 'repay'
            || p.protocol_category === 'liquidate'
            || p.protocol_category === 'stake'
            || p.protocol_category === 'unstake'
            || p.protocol_category === 'pool'
            || p.protocol_category === 'staking'
            || p.protocol_category === 'dex'
            || p.protocol_category === 'defi'
            || p.protocol_category === 'yield'
            || p.protocol_category === 'liquidity'
          );
          progress = Math.min(100, Math.round((defiProtocols.length / 3) * 100));
        } else if (rule.id === 'defi_pioneer') {
          const defiProtocols = userProtocols.filter(
            p => p.protocol_category === 'lending' 
            || p.protocol_category === 'borrow'
            || p.protocol_category === 'supply'
            || p.protocol_category === 'deposit'
            || p.protocol_category === 'withdraw'
            || p.protocol_category === 'swap'
            || p.protocol_category === 'repay'
            || p.protocol_category === 'liquidate'
            || p.protocol_category === 'stake'
            || p.protocol_category === 'unstake'
            || p.protocol_category === 'pool'
            || p.protocol_category === 'staking'
            || p.protocol_category === 'dex'
            || p.protocol_category === 'defi'
            || p.protocol_category === 'yield'
            || p.protocol_category === 'liquidity'
          );
          progress = Math.min(100, Math.round((defiProtocols.length / 5) * 100));
        } else if (rule.id === 'liquidity_provider') {
          const liquidityProtocols = userProtocols.filter(
            p => p.protocol_category === 'pool' 
            || p.protocol_category === 'liquidity'
            || p.protocol_category === 'dex'
            || p.protocol_category === 'swap'
          );
          progress = Math.min(100, Math.round((liquidityProtocols.length / 3) * 100));
        } else if (rule.id === 'volume_trader') {
          const totalVolume = userProtocols.reduce((sum, p) => sum + Number(p.total_volume), 0);
          progress = Math.min(100, Math.round((totalVolume / 10000) * 100));
        }
      }
      
      // Debug log: output achievement calculation details
      if (rule.id === 'defi_explorer' || rule.id === 'defi_pioneer') {
        const defiProtocols = userProtocols.filter(
          p => p.protocol_category === 'lending' 
          || p.protocol_category === 'borrow'
          || p.protocol_category === 'supply'
          || p.protocol_category === 'deposit'
          || p.protocol_category === 'withdraw'
          || p.protocol_category === 'swap'
          || p.protocol_category === 'repay'
          || p.protocol_category === 'liquidate'
          || p.protocol_category === 'stake'
          || p.protocol_category === 'unstake'
          || p.protocol_category === 'pool'
          || p.protocol_category === 'staking'
          || p.protocol_category === 'dex'
          || p.protocol_category === 'defi'
          || p.protocol_category === 'yield'
          || p.protocol_category === 'liquidity'
        );
        
        this.logger.debug(`Badge ${rule.id} calculation:`, {
          totalProtocols: userProtocols.length,
          defiProtocols: defiProtocols.length,
          defiProtocolDetails: defiProtocols.map(p => ({
            name: p.protocol_name,
            category: p.protocol_category
          })),
          earned,
          progress
        });
      }
      
      const existing = await db
        .select()
        .from(user_badges)
        .where(and(
          eq(user_badges.user_address, userAddress),
          eq(user_badges.chain, chain),
          eq(user_badges.badge_id, rule.id)
        ))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(user_badges).values({
          user_address: userAddress,
          chain,
          badge_id: rule.id,
          badge_name: rule.name,
          badge_description: rule.description,
          badge_category: 'protocol',
          earned,
          progress,
          earned_at: earned ? new Date() : null,
        });
      } else {
        // Update existing achievement progress and status
        await db
          .update(user_badges)
          .set({
            earned,
            progress,
            earned_at: earned ? new Date() : existing[0].earned_at,
          })
          .where(and(
            eq(user_badges.user_address, userAddress),
            eq(user_badges.chain, chain),
            eq(user_badges.badge_id, rule.id)
          ));
      }
    }
  }

  private async saveTransactions(
    userAddress: string, 
    chain: string, 
    transactions: TransactionData[]
  ) {
    if (transactions.length === 0) return;

    try {
      // Batch insert transaction records
      const transactionValues = transactions.map(tx => ({
        user_address: userAddress,
        chain,
        tx_hash: tx.txHash,
        tx_version: tx.txVersion, // bigint type
        function_name: String(tx.functionName || ''),
        protocol_address: String(tx.protocolAddress || ''),
        protocol_name: String(tx.protocolName || ''),
        amount: tx.amount?.toString(),
        token_symbol: String(tx.tokenSymbol || ''),
        operation_type: String(tx.operationType || ''),
        complexity_level: tx.complexityLevel,
        gas_used: tx.gasUsed,
        success: tx.success,
        timestamp: tx.timestamp,
      }));

      await db.insert(user_transactions).values(transactionValues);
    } catch (error) {
      // If batch insert fails, fall back to individual inserts (handle duplicate key issues)
      this.logger.warn('Batch insert failed, falling back to individual inserts:', error.message);
      
      for (const tx of transactions) {
        try {
          await db.insert(user_transactions).values({
            user_address: userAddress,
            chain,
            tx_hash: tx.txHash,
            tx_version: tx.txVersion, // bigint type
            function_name: String(tx.functionName || ''),
            protocol_address: String(tx.protocolAddress || ''),
            protocol_name: String(tx.protocolName || ''),
            amount: tx.amount?.toString(),
            token_symbol: String(tx.tokenSymbol || ''),
            operation_type: String(tx.operationType || ''),
            complexity_level: tx.complexityLevel,
            gas_used: tx.gasUsed,
            success: tx.success,
            timestamp: tx.timestamp,
          });
        } catch (individualError) {
          // Ignore duplicate transaction errors
          if (!individualError.message.includes('duplicate key')) {
            this.logger.error(`Error saving transaction ${tx.txHash}:`, individualError);
          }
        }
      }
    }
  }

  private async recalculateUserScore(userAddress: string, chain: string) {
    try {
      // 4.4 Call calculateUserPassportScore method to calculate user passport score
      const scoreData = await this.passportService.calculateUserPassportScore(userAddress, chain);
      
      // 4.5 Update passport_scores table (use upsert to avoid duplicate inserts)
      await db.insert(passport_scores).values({
        user_address: userAddress,
        chain,
        total_score: scoreData.totalScore.toString(),
        grade: scoreData.grade,
        longevity_score: scoreData.breakdown.longevity.toString(),
        balance_score: scoreData.breakdown.balance.toString(),
        activity_score: scoreData.breakdown.activity.toString(),
        diversity_score: scoreData.breakdown.diversity.toString(),
        volume_score: scoreData.breakdown.volume.toString(),
        complexity_score: scoreData.breakdown.complexity.toString(),
        social_score: scoreData.breakdown.social.toString(),
        calculated_at: new Date(),
        updated_at: new Date(),
      }).onConflictDoUpdate({
        target: [passport_scores.user_address, passport_scores.chain],
        set: {
          total_score: scoreData.totalScore.toString(),
          grade: scoreData.grade,
          longevity_score: scoreData.breakdown.longevity.toString(),
          balance_score: scoreData.breakdown.balance.toString(),
          activity_score: scoreData.breakdown.activity.toString(),
          diversity_score: scoreData.breakdown.diversity.toString(),
          volume_score: scoreData.breakdown.volume.toString(),
          complexity_score: scoreData.breakdown.complexity.toString(),
          social_score: scoreData.breakdown.social.toString(),
          calculated_at: new Date(),
          updated_at: new Date(),
        }
      });

      // 4.6 Update passport_score_history table
      await db.insert(passport_score_history).values({
        user_address: userAddress,
        chain,
        score: scoreData.totalScore.toString(),
        grade: scoreData.grade,
        breakdown: JSON.stringify(scoreData.breakdown),
        calculated_at: new Date(),
      });

      await this.updateSyncStatus(userAddress, chain, 'completed');
    } catch (error) {
      this.logger.error(`Error recalculating score for ${userAddress}:`, error);
      await this.updateSyncStatus(userAddress, chain, 'failed', error.message);
    }
  }

  private async updateSyncStatus(
    userAddress: string, 
    chain: string, 
    status: 'pending' | 'completed' | 'failed',
    errorMessage?: string
  ) {
    const existing = await db
      .select()
      .from(data_sync_status)
      .where(and(
        eq(data_sync_status.user_address, userAddress),
        eq(data_sync_status.chain, chain),
        eq(data_sync_status.data_type, 'score')
      ))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(data_sync_status)
        .set({
          sync_status: status,
          last_sync_at: new Date(),
          error_message: errorMessage,
          updated_at: new Date(),
        })
        .where(and(
          eq(data_sync_status.user_address, userAddress),
          eq(data_sync_status.chain, chain),
          eq(data_sync_status.data_type, 'score')
        ));
    } else {
      await db.insert(data_sync_status).values({
        user_address: userAddress,
        chain,
        data_type: 'score',
        last_sync_at: new Date(),
        sync_status: status,
        error_message: errorMessage,
      });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
