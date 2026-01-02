import { Injectable, HttpException, HttpStatus, forwardRef, Inject } from '@nestjs/common';
import { db } from '../db/db';
import { eq, and, desc, gte } from 'drizzle-orm';
import { 
  aptos_users, 
  sui_users, 
  movement_users,
  user_activities,
  user_protocols,
  user_transactions,
  user_social_data,
  user_badges,
  passport_scores,
  passport_score_history,
  data_sync_status
} from '../db/schema';
import * as crypto from 'crypto';
import { GraphQLService } from '../aptos/api/graphql';
import { Aptos, AptosConfig, Network, AccountAddress } from '@aptos-labs/ts-sdk';
import { PassportPollingService } from './passport-polling.service';

@Injectable()
export class PassportService {
  private aptosClient: Aptos;

  constructor(
    private readonly aptosGraphQLService: GraphQLService,
    @Inject(forwardRef(() => PassportPollingService))
    private readonly passportPollingService: PassportPollingService
  ) {
    // Initialize Aptos client for account data retrieval
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

  /**
   * Initialize user data in all related tables
   */
  private async initializeUserData(address: string, chain: string): Promise<void> {
    try {
      const now = new Date();

      // 1. Initialize user activities (check if exists first)
      const existingActivity = await db
        .select()
        .from(user_activities)
        .where(and(
          eq(user_activities.user_address, address),
          eq(user_activities.chain, chain)
        ))
        .limit(1);

      if (existingActivity.length === 0) {
        await db.insert(user_activities).values({
          user_address: address,
          chain,
          total_transactions: 0,
          active_days: 0,
          longest_streak: 0,
          last_activity_at: null,
          last_activity_at_index: 0,
        });
        console.log(`Initialized user activities for ${address}`);
      } else {
        console.log(`User activities already exist for ${address}, skipping`);
      }

      // 2. Initialize user social data (check if exists first)
      const existingSocial = await db
        .select()
        .from(user_social_data)
        .where(and(
          eq(user_social_data.user_address, address),
          eq(user_social_data.chain, chain)
        ))
        .limit(1);

      if (existingSocial.length === 0) {
        await db.insert(user_social_data).values({
          user_address: address,
          chain,
          has_ens: false,
          ens_name: null,
          social_connections: 0,
          attestation_count: 0,
          badge_count: 0,
        });
        console.log(`Initialized user social data for ${address}`);
      } else {
        console.log(`User social data already exists for ${address}, skipping`);
      }

      // 3. Initialize basic badges
      const basicBadges = [
        {
          badge_id: 'new_user',
          badge_name: 'New User',
          badge_description: 'Welcome to the Passport system',
          badge_icon: '👋',
          badge_category: 'community',
          earned: true,
          progress: 100,
          earned_at: now,
        },
        {
          badge_id: 'first_transaction',
          badge_name: 'First Transaction',
          badge_description: 'Complete your first on-chain transaction',
          badge_icon: '🚀',
          badge_category: 'protocol',
          earned: false,
          progress: 0,
          earned_at: null,
        },
        {
          badge_id: 'defi_explorer',
          badge_name: 'DeFi Explorer',
          badge_description: 'Interact with 3+ DeFi protocols',
          badge_icon: '🏦',
          badge_category: 'protocol',
          earned: false,
          progress: 0,
          earned_at: null,
        },
        {
          badge_id: 'volume_trader',
          badge_name: 'Volume Trader',
          badge_description: 'Trade over $1,000 in total volume',
          badge_icon: '📈',
          badge_category: 'protocol',
          earned: false,
          progress: 0,
          earned_at: null,
        },
        {
          badge_id: 'liquidity_provider',
          badge_name: 'Liquidity Provider',
          badge_description: 'Provide liquidity to 2+ pools',
          badge_icon: '💧',
          badge_category: 'protocol',
          earned: false,
          progress: 0,
          earned_at: null,
        },
        {
          badge_id: 'governance_participant',
          badge_name: 'Governance Participant',
          badge_description: 'Participate in protocol governance',
          badge_icon: '🗳️',
          badge_category: 'protocol',
          earned: false,
          progress: 0,
          earned_at: null,
        },
      ];

      // 3. Initialize basic badges (check if exists first)
      for (const badge of basicBadges) {
        const existingBadge = await db
          .select()
          .from(user_badges)
          .where(and(
            eq(user_badges.user_address, address),
            eq(user_badges.chain, chain),
            eq(user_badges.badge_id, badge.badge_id)
          ))
          .limit(1);

        if (existingBadge.length === 0) {
          await db.insert(user_badges).values({
            user_address: address,
            chain,
            ...badge,
          });
          console.log(`Initialized badge ${badge.badge_id} for ${address}`);
        } else {
          console.log(`Badge ${badge.badge_id} already exists for ${address}, skipping`);
        }
      }

      // 4. Initialize initial passport score (check if exists first)
      // Note: We don't calculate and insert score here anymore to avoid duplication
      // The score will be calculated and inserted by the polling service after user data is processed
      const existingScore = await db
        .select()
        .from(passport_scores)
        .where(and(
          eq(passport_scores.user_address, address),
          eq(passport_scores.chain, chain)
        ))
        .limit(1);

      if (existingScore.length === 0) {
        console.log(`No passport score found for ${address}, will be calculated by polling service`);
      } else {
        console.log(`Passport score already exists for ${address}, skipping`);
      }

      // 5. Initialize data sync status (check if exists first)
      const syncTypes = ['score', 'activity', 'protocols', 'badges', 'social'];
      for (const dataType of syncTypes) {
        const existingSync = await db
          .select()
          .from(data_sync_status)
          .where(and(
            eq(data_sync_status.user_address, address),
            eq(data_sync_status.chain, chain),
            eq(data_sync_status.data_type, dataType)
          ))
          .limit(1);

        if (existingSync.length === 0) {
          await db.insert(data_sync_status).values({
            user_address: address,
            chain,
            data_type: dataType,
            last_sync_at: now,
            sync_status: 'pending',
            error_message: null,
          });
          console.log(`Initialized sync status for ${dataType} for ${address}`);
        } else {
          console.log(`Sync status for ${dataType} already exists for ${address}, skipping`);
        }
      }

      console.log(`Successfully initialized user data for ${address} on ${chain}`);
    } catch (error) {
      console.error('Error initializing user data:', error);
      throw new HttpException('Failed to initialize user data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async checkUserExists(address: string, chain: string): Promise<boolean> {
    try {
      const userTable = this.getUserTable(chain);
      
      const result = await db
        .select()
        .from(userTable)
        .where(eq(userTable.address, address))
        .limit(1);
      
      return result.length > 0;
    } catch (error) {
      console.error('Error checking user existence:', error);
      throw new HttpException('Failed to check user existence', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async registerUser(address: string, chain: string): Promise<void> {
    try {
      const userTable = this.getUserTable(chain);
      const createdAt = new Date().toISOString();
      
      await db.insert(userTable).values({
        address,
        created_at: createdAt,
      });

      // Initialize user data in all related tables
      await this.initializeUserData(address, chain);

      // Immediately poll user data to get initial on-chain information
      try {
        await this.passportPollingService.processUser({ user_address: address, chain });
        console.log(`Successfully polled initial data for user ${address} on ${chain}`);
      } catch (pollingError) {
        console.error(`Error polling initial data for user ${address}:`, pollingError);
        // Don't throw error here as user registration should still succeed
        // The polling can be retried later
      }
      
    } catch (error) {
      console.error('Error registering user:', error);
      throw new HttpException('Failed to register user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async verifySignature(
    address: string, 
    message: string, 
    signature: string, 
    chain: string
  ): Promise<boolean> {
    try {
      // For now, we'll implement a basic signature verification
      // In production, you should use proper cryptographic libraries
      // and verify against the actual blockchain signatures
      
      if (chain === 'aptos') {
        return this.verifyAptosSignature(address, message, signature);
      } else if (chain === 'sui') {
        return this.verifySuiSignature(address, message, signature);
      } else if (chain === 'movement') {
        return this.verifyMovementSignature(address, message, signature);
      }
      
      return false;
    } catch (error) {
      console.error('Error verifying signature:', error);
      return false;
    }
  }

  private verifyAptosSignature(address: string, message: string, signature: string): boolean {
    try {
      // Basic validation - in production, use proper Aptos signature verification
      // This is a simplified version for demo purposes
      const messageHash = crypto.createHash('sha256').update(message).digest('hex');
      
      // For demo purposes, we'll accept any signature that contains the address
      // In production, you should use the Aptos SDK to verify signatures
      return signature.length > 0 && message.includes(address);
    } catch (error) {
      console.error('Aptos signature verification error:', error);
      return false;
    }
  }

  private verifySuiSignature(address: string, message: string, signature: string): boolean {
    try {
      // Basic validation - in production, use proper Sui signature verification
      // This is a simplified version for demo purposes
      const messageHash = crypto.createHash('sha256').update(message).digest('hex');
      
      // For demo purposes, we'll accept any signature that contains the address
      // In production, you should use the Sui SDK to verify signatures
      return signature.length > 0 && message.includes(address);
    } catch (error) {
      console.error('Sui signature verification error:', error);
      return false;
    }
  }

  private verifyMovementSignature(address: string, message: string, signature: string): boolean {
    try {
      // Basic validation - in production, use proper Movement signature verification
      // This is a simplified version for demo purposes
      const messageHash = crypto.createHash('sha256').update(message).digest('hex');
      
      // For demo purposes, we'll accept any signature that contains the address
      // In production, you should use the Movement SDK to verify signatures
      return signature.length > 0 && message.includes(address);
    } catch (error) {
      console.error('Movement signature verification error:', error);
      return false;
    }
  }

  async getUserPassportData(recipient: string, chain: string): Promise<any[]> {
    try {
      if (chain.toLowerCase() !== 'aptos') {
        throw new HttpException(`Chain ${chain} is not supported for Passport data retrieval. Only Aptos is currently supported.`, HttpStatus.BAD_REQUEST);
      }

      // Call the GraphQL service to get Passport attestations
      const attestations = await this.aptosGraphQLService.getPassportAttestations(recipient);
      
      return attestations;
    } catch (error) {
      console.error('Error getting user passport data:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to get user passport data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async calculateUserPassportScore(user: string, chain: string): Promise<{
    totalScore: number;
    breakdown: {
      longevity: number;
      balance: number;
      activity: number;
      diversity: number;
      volume: number;
      complexity: number;
      social: number;
    };
    grade: string;
  }> {
    try {
    if (chain.toLowerCase() !== 'aptos') {
      throw new HttpException(`Chain ${chain} is not supported for Passport score calculation. Only Aptos is currently supported.`, HttpStatus.BAD_REQUEST);
    }

      // Calculate each dimension score
      const longevityScore = await this.calculateLongevityScore(user, chain);
      const balanceScore = await this.calculateBalanceScore(user, chain);
      const activityScore = await this.calculateActivityFrequencyScore(user, chain);
      const diversityScore = await this.calculateProtocolDiversityScore(user, chain);
      const volumeScore = await this.calculateVolumeScore(user, chain);
      const complexityScore = await this.calculateComplexityScore(user, chain);
      const socialScore = this.calculateSocialReputationScore(user, chain);

      // Calculate total score
      const totalScore = longevityScore + balanceScore + activityScore + diversityScore + volumeScore + complexityScore + socialScore;
      const finalScore = Math.min(100, Math.max(0, totalScore));

      // Determine grade based on score
      let grade: string;
      if (finalScore >= 95) grade = 'S+';
      else if (finalScore >= 85) grade = 'S';
      else if (finalScore >= 75) grade = 'A';
      else if (finalScore >= 65) grade = 'B';
      else if (finalScore >= 50) grade = 'C';
      else if (finalScore >= 30) grade = 'D';
      else grade = 'F';

      return {
        totalScore: finalScore,
        breakdown: {
          longevity: longevityScore,
          balance: balanceScore,
          activity: activityScore,
          diversity: diversityScore,
          volume: volumeScore,
          complexity: complexityScore,
          social: socialScore,
        },
        grade,
      };
    } catch (error) {
      console.error('Error calculating passport score:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to calculate passport score', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Calculate Longevity Score (account age) - 10 points
   * Formula: min(10, account days / 30) * (1 + ln(1 + account days/365))
   */
  private async calculateLongevityScore(user: string, chain: string): Promise<number> {
    try {
      if (chain.toLowerCase() !== 'aptos') {
        throw new HttpException(`Chain ${chain} is not supported for longevity calculation. Only Aptos is currently supported.`, HttpStatus.BAD_REQUEST);
      }

      // Get the oldest transaction from database instead of fetching from chain
      const oldestTransaction = await db
        .select()
        .from(user_transactions)
        .where(and(
          eq(user_transactions.user_address, user),
          eq(user_transactions.chain, chain)
        ))
        .orderBy(user_transactions.tx_version)
        .limit(1);

      console.log('Found oldest transaction from database:', oldestTransaction.length > 0 ? oldestTransaction[0].tx_version : 'none');

      if (oldestTransaction.length === 0) {
        // If no transactions found in database, return 0 score
        return 0;
      }

      const firstTransaction = oldestTransaction[0];
      
      // Get transaction timestamp from database
      let accountCreationTime = firstTransaction.timestamp;
      console.log('accountCreationTime from database:', accountCreationTime);
      console.log('accountCreationTime.getTime()', accountCreationTime.getTime());
      
      // Check if timestamp is in the future (testnet might have future timestamps)
      const currentTime = new Date();
      if (accountCreationTime.getTime() > currentTime.getTime()) {
        console.log('WARNING: Account creation time is in the future, using current time as fallback');
        accountCreationTime = currentTime;
      }
      const timeDifferenceMs = currentTime.getTime() - accountCreationTime.getTime();
      const accountAgeInDays = timeDifferenceMs / (1000 * 60 * 60 * 24); // Use decimal days for more precision

      console.log('currentTime', currentTime);
      console.log('currentTime.getTime()', currentTime.getTime());
      console.log('timeDifference (ms)', timeDifferenceMs);
      console.log('accountAgeInDays (decimal)', accountAgeInDays);

      // Apply the longevity formula from the scoring model
      // Formula: min(10, account days / 30) * (1 + ln(1 + account days/365))
      const baseScore = Math.min(10, accountAgeInDays / 30);
      const logMultiplier = 1 + Math.log(1 + accountAgeInDays / 365);
      const longevityScore = baseScore * logMultiplier;

      console.log('baseScore', baseScore);
      console.log('logMultiplier', logMultiplier);
      console.log('longevityScore', longevityScore);

      // Ensure score is between 0 and 10
      const finalScore = Math.min(10, Math.max(0, longevityScore));
      console.log('finalScore', finalScore);
      return finalScore;

    } catch (error) {
      console.error('Error calculating longevity score:', error);
      
      // If there's an error (e.g., account doesn't exist, network issues), return 0
      // This is a conservative approach to avoid giving false scores
      return 0;
    }
  }

  /**
   * Calculate Balance Score (account balance) - 10 points
   * Formula: min(10, 10 * (1 - e^(-balance/10000))) * adjustment factor
   */
  private async calculateBalanceScore(user: string, chain: string): Promise<number> {
    try {
      if (chain.toLowerCase() !== 'aptos') {
        throw new HttpException(`Chain ${chain} is not supported for balance calculation. Only Aptos is currently supported.`, HttpStatus.BAD_REQUEST);
      }

      // Get account balance from Aptos
      const accountAddress = AccountAddress.fromString(user);
      
      console.log('Checking balance for address:', user);
      console.log('Network:', Network.TESTNET);
      console.log('Fullnode URL:', process.env.APTOS_FULLNODE_URL);
      
      // First, let's check if the account exists
      try {
        const accountInfo = await this.aptosClient.getAccountInfo({
          accountAddress,
        });
        console.log('Account info:', accountInfo);
      } catch (error) {
        console.log('Account info error:', error);
      }
      
      // Get APT balance using the coin store resource (following official example)
      const APTOS_COIN = "0x1::aptos_coin::AptosCoin";
      const COIN_STORE = `0x1::coin::CoinStore<${APTOS_COIN}>`;
      type Coin = { coin: { value: string } };
      
      let resource: Coin;
      try {
        resource = await this.aptosClient.getAccountResource<Coin>({
          accountAddress,
          resourceType: COIN_STORE,
        });
      } catch (error: any) {
        // If resource not found (404), it means account has no APT balance
        if (error.status === 404 || error.data?.error_code === 'resource_not_found') {
          console.log('Account has no APT balance resource, returning 0 score');
          return 0;
        }
        // Re-throw other errors
        throw error;
      }

      if (!resource || !resource.coin || !resource.coin.value) {
        // If no balance found, return 0 score
        console.log('No balance found in resource');
        return 0;
      }

      // Get balance directly (already in correct units according to official example)
      const balance = Number(resource.coin.value);
      
      console.log('balance (octas)', balance);

      // Apply the balance formula from the scoring model
      // Formula: min(10, 10 * (1 - e^(-balance/10000))) * adjustment factor
      // Note: balance is in octas, so we need to convert to APT for the formula
      const balanceInAPT = balance / Math.pow(10, 8); // Convert octas to APT
      const baseScore = 10 * (1 - Math.exp(-balanceInAPT / 10000));
      
      // Apply adjustment factor based on balance
      let adjustmentFactor = 1.0;
      if (balanceInAPT < 10) {
        adjustmentFactor = 0.5; // Penalty for very low balance
      } else if (balanceInAPT >= 1000) {
        adjustmentFactor = 1.2; // Bonus for high balance
      }

      const balanceScore = Math.min(10, baseScore * adjustmentFactor);

      console.log('balanceInAPT', balanceInAPT);
      console.log('baseScore', baseScore);
      console.log('adjustmentFactor', adjustmentFactor);
      console.log('balanceScore', balanceScore);

      // Ensure score is between 0 and 10
      return Math.min(10, Math.max(0, balanceScore));

    } catch (error) {
      console.error('Error calculating balance score:', error);
      
      // If there's an error (e.g., account doesn't exist, network issues), return 0
      // This is a conservative approach to avoid giving false scores
      return 2; // Example score
    }
  }

  /**
   * Calculate Activity Frequency Score (active frequency) - 20 points
   * Formula: min(20, transaction count base score + active days reward + streak reward)
   */
  private async calculateActivityFrequencyScore(user: string, chain: string): Promise<number> {
    try {
      // Get user activity data from database
      const activityData = await db
        .select()
        .from(user_activities)
        .where(and(
          eq(user_activities.user_address, user),
          eq(user_activities.chain, chain)
        ))
        .limit(1);

      if (activityData.length === 0) {
        return 0;
      }

      const data = activityData[0];
      const totalTransactions = data.total_transactions;
      const activeDays = data.active_days;
      const longestStreak = data.longest_streak;

      // Apply scoring formula
      const transactionScore = Math.min(10, Math.log(1 + totalTransactions) * 2);
      const activeDaysScore = Math.min(6, activeDays / 10);
      const streakScore = Math.min(4, longestStreak / 7);

      const totalScore = Math.min(20, transactionScore + activeDaysScore + streakScore);
      
      console.log('Activity Frequency Score:', {
        user,
        totalTransactions,
        activeDays,
        longestStreak,
        transactionScore,
        activeDaysScore,
        streakScore,
        totalScore
      });

      return Math.min(20, Math.max(0, totalScore));
    } catch (error) {
      console.error('Error calculating activity frequency score:', error);
      return 0;
    }
  }

  /**
   * Calculate Protocol Diversity Score (protocol diversity) - 18 points
   * Formula: min(18, protocol count score + category diversity score + deep interaction score)
   */
  private async calculateProtocolDiversityScore(user: string, chain: string): Promise<number> {
    try {
      // Get user protocol interaction data from database
      const protocolData = await db
        .select()
        .from(user_protocols)
        .where(and(
          eq(user_protocols.user_address, user),
          eq(user_protocols.chain, chain)
        ));

      if (protocolData.length === 0) {
        return 0;
      }

      // Calculate protocol count score
      const uniqueProtocols = protocolData.length;
      const protocolCountScore = Math.min(8, uniqueProtocols * 1.5);

      // Calculate category diversity score
      const uniqueCategories = new Set(protocolData.map(p => p.protocol_category)).size;
      const categoryScore = Math.min(6, uniqueCategories * 2);

      // Calculate deep interaction score
      const deepInteractions = protocolData.filter(p => p.is_deep_interaction).length;
      const deepInteractionScore = Math.min(4, deepInteractions);

      const totalScore = Math.min(18, protocolCountScore + categoryScore + deepInteractionScore);
      
      console.log('Protocol Diversity Score:', {
        user,
        uniqueProtocols,
        uniqueCategories,
        deepInteractions,
        protocolCountScore,
        categoryScore,
        deepInteractionScore,
        totalScore
      });

      return Math.min(18, Math.max(0, totalScore));
    } catch (error) {
      console.error('Error calculating protocol diversity score:', error);
      return 0;
    }
  }

  /**
   * Calculate Volume Score (transaction amount) - 15 points
   * Formula: min(15, 15 * (1 - e^(-total transaction amount/50000))) * quality factor
   */
  private async calculateVolumeScore(user: string, chain: string): Promise<number> {
    try {
      // Get user protocol interaction data from database to calculate total transaction amount
      const protocolData = await db
        .select()
        .from(user_protocols)
        .where(and(
          eq(user_protocols.user_address, user),
          eq(user_protocols.chain, chain)
        ));

      if (protocolData.length === 0) {
        return 0;
      }

      // Calculate total transaction amount
      const totalVolume = protocolData.reduce((sum, p) => sum + Number(p.total_volume), 0);
      
      // Calculate average transaction amount (for quality factor)
      const totalTransactions = protocolData.reduce((sum, p) => sum + p.interaction_count, 0);
      const averageTransaction = totalTransactions > 0 ? totalVolume / totalTransactions : 0;

      // Apply scoring formula
      const baseScore = 15 * (1 - Math.exp(-totalVolume / 50000));
      
      // Calculate quality factor
      let qualityFactor = 1.0;
      if (totalVolume < 10) {
        qualityFactor = 0.5; // Suspected Bot activity
      } else if (averageTransaction < 50) {
        qualityFactor = 0.8; // Small transaction
      } else if (averageTransaction >= 500) {
        qualityFactor = 1.2; // Large transaction reward
      }

      const totalScore = Math.min(15, baseScore * qualityFactor);
      
      console.log('Volume Score:', {
        user,
        totalVolume,
        totalTransactions,
        averageTransaction,
        baseScore,
        qualityFactor,
        totalScore
      });

      return Math.min(15, Math.max(0, totalScore));
    } catch (error) {
      console.error('Error calculating volume score:', error);
      return 0;
    }
  }

  /**
   * Calculate Complexity Score (interaction complexity) - 12 points
   * Formula: basic operation score + advanced operation score + combined operation score
   */
  private async calculateComplexityScore(user: string, chain: string): Promise<number> {
    try {
      // Get user transaction data from database
      const transactionData = await db
        .select()
        .from(user_transactions)
        .where(and(
          eq(user_transactions.user_address, user),
          eq(user_transactions.chain, chain)
        ));

      if (transactionData.length === 0) {
        return 0;
      }

      // Count operation types
      const basicOperations = new Set();
      const advancedOperations = new Set();
      const complexOperations = new Set();

      transactionData.forEach(tx => {
        const operationType = tx.operation_type;
        const complexityLevel = tx.complexity_level;

        if (complexityLevel === 1) {
          basicOperations.add(operationType);
        } else if (complexityLevel === 2) {
          advancedOperations.add(operationType);
        } else if (complexityLevel === 3) {
          complexOperations.add(operationType);
        }
      });

      // Apply scoring formula
      const basicScore = Math.min(4, basicOperations.size * 0.8);
      const advancedScore = Math.min(5, advancedOperations.size * 0.5);
      const complexScore = Math.min(3, complexOperations.size * 1);

      const totalScore = basicScore + advancedScore + complexScore;
      
      console.log('Complexity Score:', {
        user,
        basicOperations: basicOperations.size,
        advancedOperations: advancedOperations.size,
        complexOperations: complexOperations.size,
        basicScore,
        advancedScore,
        complexScore,
        totalScore
      });

      return Math.min(12, Math.max(0, totalScore));
    } catch (error) {
      console.error('Error calculating complexity score:', error);
      return 0;
    }
  }

  /**
   * Calculate Social Reputation Score (social reputation) - 15 points
   * Formula: ENS/domain score + verification badge score + social relationship score
   */
  private calculateSocialReputationScore(user: string, chain: string): number {
    // TODO: Implement actual calculation based on social reputation
    // For now, return a fixed value
    return 0; // Example score (increased from 3.2 to reflect higher weight)
  }

  private getUserTable(chain: string) {
    switch (chain.toLowerCase()) {
      case 'aptos':
        return aptos_users;
      case 'sui':
        return sui_users;
      case 'movement':
        return movement_users;
      default:
        throw new HttpException(`Unsupported chain: ${chain}`, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Get Passport overview data for dashboard
   */
  async getPassportOverview(user: string, chain: string): Promise<any> {
    try {
      // Get latest score from database
      const latestScore = await db
        .select()
        .from(passport_scores)
        .where(and(
          eq(passport_scores.user_address, user),
          eq(passport_scores.chain, chain)
        ))
        .orderBy(desc(passport_scores.calculated_at))
        .limit(1);

      // If no score found, throw error
      if (latestScore.length === 0) {
        console.log('No score found in database for user', user);
        return null;
      }

      const currentScoreData = latestScore[0];
      
      // Execute all queries in parallel for better performance
      const [
        activityData,
        protocolData,
        badgeData,
        scoreHistory
      ] = await Promise.all([
        // Get user activities
        db
          .select()
          .from(user_activities)
          .where(and(
            eq(user_activities.user_address, user),
            eq(user_activities.chain, chain)
          ))
          .limit(1),

        // Get user protocols
        db
          .select()
          .from(user_protocols)
          .where(and(
            eq(user_protocols.user_address, user),
            eq(user_protocols.chain, chain)
          )),

        // Get user badges
        db
          .select()
          .from(user_badges)
          .where(and(
            eq(user_badges.user_address, user),
            eq(user_badges.chain, chain)
          )),

        // Get score history for change calculation
        db
          .select()
          .from(passport_score_history)
          .where(and(
            eq(passport_score_history.user_address, user),
            eq(passport_score_history.chain, chain)
          ))
          .orderBy(desc(passport_score_history.calculated_at))
          .limit(2)
      ]);

      // Calculate quick stats
      const totalProtocols = protocolData.length;
      const totalVolume = protocolData.reduce((sum, p) => sum + Number(p.total_volume), 0);
      const earnedBadges = badgeData.filter(b => b.earned).length;
      const totalBadges = badgeData.length;

      const currentScore = Number(currentScoreData.total_score);
      const previousScore = scoreHistory.length > 1 ? Number(scoreHistory[1].score) : currentScore;
      const scoreChange = currentScore - previousScore;
      const scoreChangePercent = previousScore > 0 ? ((scoreChange / previousScore) * 100) : 0;

      // Build breakdown from database
      const breakdown = {
        longevity: Number(currentScoreData.longevity_score),
        balance: Number(currentScoreData.balance_score),
        activity: Number(currentScoreData.activity_score),
        diversity: Number(currentScoreData.diversity_score),
        volume: Number(currentScoreData.volume_score),
        complexity: Number(currentScoreData.complexity_score),
        social: Number(currentScoreData.social_score)
      };

      return {
        score: currentScore,
        grade: currentScoreData.grade,
        change: scoreChange,
        changePercent: scoreChangePercent,
        protocols: totalProtocols,
        volume: totalVolume,
        badges: {
          earned: earnedBadges,
          total: totalBadges,
          progress: totalBadges > 0 ? (earnedBadges / totalBadges) * 100 : 0
        },
        breakdown: breakdown,
        lastUpdated: currentScoreData.calculated_at.toISOString()
      };
    } catch (error) {
      console.error('Error getting passport overview:', error);
      throw new HttpException('Failed to get passport overview', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get detailed Passport data
   */
  async getPassportDetails(user: string, chain: string, timeRange: string = '30d'): Promise<any> {
    try {
      // Calculate time range
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Execute all queries in parallel for better performance
      const [
        scoreHistory,
        badges,
        recentTransactions,
        protocolInteractions,
        socialData,
        latestScore
      ] = await Promise.all([
        // Get score history
        db
          .select()
          .from(passport_score_history)
          .where(and(
            eq(passport_score_history.user_address, user),
            eq(passport_score_history.chain, chain),
            gte(passport_score_history.calculated_at, startDate)
          ))
          .orderBy(desc(passport_score_history.calculated_at)),

        // Get badges
        db
          .select()
          .from(user_badges)
          .where(and(
            eq(user_badges.user_address, user),
            eq(user_badges.chain, chain)
          )),

        // Get recent transactions
        db
          .select()
          .from(user_transactions)
          .where(and(
            eq(user_transactions.user_address, user),
            eq(user_transactions.chain, chain),
            gte(user_transactions.timestamp, startDate)
          ))
          .orderBy(desc(user_transactions.timestamp))
          .limit(20),

        // Get protocol interactions
        db
          .select()
          .from(user_protocols)
          .where(and(
            eq(user_protocols.user_address, user),
            eq(user_protocols.chain, chain)
          ))
          .orderBy(desc(user_protocols.last_interaction_at)),

        // Get social data
        db
          .select()
          .from(user_social_data)
          .where(and(
            eq(user_social_data.user_address, user),
            eq(user_social_data.chain, chain)
          ))
          .limit(1),

        // Get latest score (moved to parallel execution)
        db
          .select()
          .from(passport_scores)
          .where(and(
            eq(passport_scores.user_address, user),
            eq(passport_scores.chain, chain)
          ))
          .orderBy(desc(passport_scores.calculated_at))
          .limit(1)
      ]);

      // Format data for frontend (optimized with parallel processing and caching)
      const currentTime = new Date();
      
      // Format data in parallel
      const [formattedScoreHistory, formattedBadges, formattedTransactions, formattedProtocols, optimizationTips] = await Promise.all([
        // Format score history (cached date formatting)
        (async () => {
          return scoreHistory.map(record => {
            const dateStr = record.calculated_at.toISOString().split('T')[0];
            return {
              date: dateStr,
              score: Number(record.score),
              breakdown: record.breakdown
            };
          });
        })(),

        // Format badges (optimized mapping)
        (async () => {
          return badges.map(badge => ({
            id: badge.badge_id,
            name: badge.badge_name,
            description: badge.badge_description,
            icon: badge.badge_icon,
            category: badge.badge_category,
            earned: badge.earned,
            progress: badge.progress,
            earnedAt: badge.earned_at?.toISOString()
          }));
        })(),

        // Format transactions (optimized with cached time formatting)
        (async () => {
          return recentTransactions.map(tx => {
            const timeAgo = this.formatTimeAgoCached(tx.timestamp, currentTime);
            return {
              action: tx.operation_type || 'Unknown',
              protocol: tx.protocol_name || 'Unknown',
              amount: tx.amount ? `$${Number(tx.amount).toLocaleString()}` : 'N/A',
              token: tx.token_symbol || 'N/A',
              time: timeAgo,
              status: tx.success ? 'success' : 'failed',
              txHash: tx.tx_hash
            };
          });
        })(),

        // Format protocols (optimized mapping)
        (async () => {
          return protocolInteractions.map(protocol => ({
            name: protocol.protocol_name || 'Unknown',
            category: protocol.protocol_category || 'Unknown',
            interactions: protocol.interaction_count,
            volume: Number(protocol.total_volume),
            lastInteraction: protocol.last_interaction_at.toISOString(),
            isDeepInteraction: protocol.is_deep_interaction
          }));
        })(),

        // Generate optimization tips (async to avoid blocking)
        this.generateOptimizationTipsAsync(latestScore, badges, protocolInteractions)
      ]);

      return {
        scoreHistory: formattedScoreHistory,
        badges: formattedBadges,
        recentActivity: formattedTransactions,
        protocolInteractions: formattedProtocols,
        socialData: socialData[0] || null,
        optimizationTips,
        timeRange
      };
    } catch (error) {
      console.error('Error getting passport details:', error);
      throw new HttpException('Failed to get passport details', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Format time ago string
   */
  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      return 'Just now';
    }
  }

  /**
   * Format time ago string with cached current time (for performance)
   */
  private formatTimeAgoCached(date: Date, now: Date): string {
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      return 'Just now';
    }
  }

  /**
   * Generate optimization tips based on user data (async version for parallel processing)
   */
  private async generateOptimizationTipsAsync(latestScore: any[], badges: any[], protocols: any[]): Promise<string[]> {
    const tips: string[] = [];

    if (latestScore.length > 0) {
      const scoreData = latestScore[0];
      const breakdown = {
        longevity: Number(scoreData.longevity_score),
        balance: Number(scoreData.balance_score),
        activity: Number(scoreData.activity_score),
        diversity: Number(scoreData.diversity_score),
        volume: Number(scoreData.volume_score),
        complexity: Number(scoreData.complexity_score),
        social: Number(scoreData.social_score)
      };

      // Score-based tips
      if (breakdown.activity < 10) {
        tips.push('Increase your trading activity to improve your activity score');
      }
      if (breakdown.diversity < 8) {
        tips.push('Try interacting with more DeFi protocols to boost your diversity score');
      }
      if (breakdown.volume < 5) {
        tips.push('Consider increasing your trading volume to improve your volume score');
      }
      if (breakdown.complexity < 6) {
        tips.push('Try advanced DeFi operations like liquidity provision or governance voting');
      }
      if (breakdown.social < 5) {
        tips.push('Connect your social accounts and earn verification badges');
      }
    }

    // Badge-based tips
    const unearnedBadges = badges.filter(b => !b.earned);
    if (unearnedBadges.length > 0) {
      tips.push(`Complete ${unearnedBadges.length} more badges to improve your social score`);
    }

    // Protocol-based tips
    if (protocols.length < 3) {
      tips.push('Explore more DeFi protocols to increase your protocol diversity');
    }

    return tips.slice(0, 5); // Limit to 5 tips
  }

  /**
   * Generate optimization tips based on user data (legacy sync version)
   */
  private generateOptimizationTips(breakdown: any, badges: any[], protocols: any[]): string[] {
    const tips: string[] = [];

    // Score-based tips
    if (breakdown.activity < 10) {
      tips.push('Increase your trading activity to improve your activity score');
    }
    if (breakdown.diversity < 8) {
      tips.push('Try interacting with more DeFi protocols to boost your diversity score');
    }
    if (breakdown.volume < 5) {
      tips.push('Consider increasing your trading volume to improve your volume score');
    }
    if (breakdown.complexity < 6) {
      tips.push('Try advanced DeFi operations like liquidity provision or governance voting');
    }
    if (breakdown.social < 5) {
      tips.push('Connect your social accounts and earn verification badges');
    }

    // Badge-based tips
    const unearnedBadges = badges.filter(b => !b.earned);
    if (unearnedBadges.length > 0) {
      tips.push(`Complete ${unearnedBadges.length} more badges to improve your social score`);
    }

    // Protocol-based tips
    if (protocols.length < 3) {
      tips.push('Explore more DeFi protocols to increase your protocol diversity');
    }

    return tips.slice(0, 5); // Limit to 5 tips
  }

  // ========== New lightweight method for progressive loading ==========

  /**
   * Get basic passport overview data (lightweight version for fast initial loading)
   */
  async getPassportOverviewBasic(user: string, chain: string): Promise<any> {
    try {
      // Get latest score from database (minimal query)
      const latestScore = await db
        .select()
        .from(passport_scores)
        .where(and(
          eq(passport_scores.user_address, user),
          eq(passport_scores.chain, chain)
        ))
        .orderBy(desc(passport_scores.calculated_at))
        .limit(1);

      if (latestScore.length === 0) {
        return null;
      }

      const currentScoreData = latestScore[0];
      const currentScore = Number(currentScoreData.total_score);

      // Get basic stats with minimal queries
      const [protocolData, badgeData] = await Promise.all([
        db
          .select()
          .from(user_protocols)
          .where(and(
            eq(user_protocols.user_address, user),
            eq(user_protocols.chain, chain)
          )),
        db
          .select()
          .from(user_badges)
          .where(and(
            eq(user_badges.user_address, user),
            eq(user_badges.chain, chain)
          ))
      ]);

      const totalProtocols = protocolData.length;
      const totalVolume = protocolData.reduce((sum, p) => sum + Number(p.total_volume), 0);
      const earnedBadges = badgeData.filter(b => b.earned).length;
      const totalBadges = badgeData.length;

      // Build breakdown from database
      const breakdown = {
        longevity: Number(currentScoreData.longevity_score),
        balance: Number(currentScoreData.balance_score),
        activity: Number(currentScoreData.activity_score),
        diversity: Number(currentScoreData.diversity_score),
        volume: Number(currentScoreData.volume_score),
        complexity: Number(currentScoreData.complexity_score),
        social: Number(currentScoreData.social_score)
      };

      return {
        score: currentScore,
        grade: currentScoreData.grade,
        protocols: totalProtocols,
        volume: totalVolume,
        badges: {
          earned: earnedBadges,
          total: totalBadges,
          progress: totalBadges > 0 ? (earnedBadges / totalBadges) * 100 : 0
        },
        breakdown: breakdown,
        lastUpdated: currentScoreData.calculated_at.toISOString()
      };
    } catch (error) {
      console.error('Error getting basic passport overview:', error);
      throw new HttpException('Failed to get basic passport overview', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get passport score history only
   */
  async getPassportScoreHistory(user: string, chain: string, timeRange: string = '30d'): Promise<any> {
    try {
      // Calculate time range
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const scoreHistory = await db
        .select()
        .from(passport_score_history)
        .where(and(
          eq(passport_score_history.user_address, user),
          eq(passport_score_history.chain, chain),
          gte(passport_score_history.calculated_at, startDate)
        ))
        .orderBy(desc(passport_score_history.calculated_at));

      return {
        scoreHistory: scoreHistory.map(record => ({
          date: record.calculated_at.toISOString().split('T')[0],
          score: Number(record.score),
          breakdown: record.breakdown
        })),
        timeRange
      };
    } catch (error) {
      console.error('Error getting passport score history:', error);
      throw new HttpException('Failed to get passport score history', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get passport badges only
   */
  async getPassportBadges(user: string, chain: string): Promise<any> {
    try {
      const badges = await db
        .select()
        .from(user_badges)
        .where(and(
          eq(user_badges.user_address, user),
          eq(user_badges.chain, chain)
        ));

      return {
        badges: badges.map(badge => ({
          id: badge.badge_id,
          name: badge.badge_name,
          description: badge.badge_description,
          icon: badge.badge_icon,
          category: badge.badge_category,
          earned: badge.earned,
          progress: badge.progress,
          earnedAt: badge.earned_at?.toISOString()
        }))
      };
    } catch (error) {
      console.error('Error getting passport badges:', error);
      throw new HttpException('Failed to get passport badges', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get passport activity data only
   */
  async getPassportActivity(user: string, chain: string, timeRange: string = '30d', limit: number = 20): Promise<any> {
    try {
      // Calculate time range
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const recentTransactions = await db
        .select()
        .from(user_transactions)
        .where(and(
          eq(user_transactions.user_address, user),
          eq(user_transactions.chain, chain),
          gte(user_transactions.timestamp, startDate)
        ))
        .orderBy(desc(user_transactions.timestamp))
        .limit(limit);

      return {
        recentActivity: recentTransactions.map(tx => {
          const timeAgo = this.formatTimeAgoCached(tx.timestamp, now);
          return {
            action: tx.operation_type || 'Unknown',
            protocol: tx.protocol_name || tx.protocol_address,
            amount: tx.amount ? `$${Number(tx.amount).toLocaleString()}` : 'N/A',
            token: tx.token_symbol || 'N/A',
            time: timeAgo,
            status: tx.success ? 'success' : 'failed',
            txHash: tx.tx_hash
          };
        }),
        timeRange
      };
    } catch (error) {
      console.error('Error getting passport activity:', error);
      throw new HttpException('Failed to get passport activity', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get passport protocol interactions and optimization tips
   */
  async getPassportProtocols(user: string, chain: string): Promise<any> {
    try {
      const [protocolInteractions, latestScore, badges] = await Promise.all([
        db
          .select()
          .from(user_protocols)
          .where(and(
            eq(user_protocols.user_address, user),
            eq(user_protocols.chain, chain)
          ))
          .orderBy(desc(user_protocols.last_interaction_at)),
        db
          .select()
          .from(passport_scores)
          .where(and(
            eq(passport_scores.user_address, user),
            eq(passport_scores.chain, chain)
          ))
          .orderBy(desc(passport_scores.calculated_at))
          .limit(1),
        db
          .select()
          .from(user_badges)
          .where(and(
            eq(user_badges.user_address, user),
            eq(user_badges.chain, chain)
          ))
      ]);

      const optimizationTips = await this.generateOptimizationTipsAsync(latestScore, badges, protocolInteractions);

      return {
        protocolInteractions: protocolInteractions.map(protocol => ({
          name: protocol.protocol_name || 'Unknown',
          category: protocol.protocol_category || 'Unknown',
          interactions: protocol.interaction_count,
          volume: Number(protocol.total_volume),
          lastInteraction: protocol.last_interaction_at.toISOString(),
          isDeepInteraction: protocol.is_deep_interaction
        })),
        optimizationTips
      };
    } catch (error) {
      console.error('Error getting passport protocols:', error);
      throw new HttpException('Failed to get passport protocols', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
