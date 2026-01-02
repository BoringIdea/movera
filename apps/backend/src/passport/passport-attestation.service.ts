import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey, Hex } from '@aptos-labs/ts-sdk';
import { db } from '../db/db';
import { passport_scores, aptos_attestations } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { Codec, SchemaField } from '../utils/codec';
import { bcs } from '@mysten/bcs';
import { getPassportAttestationConfig, PassportAttestationConfig } from './passport-attestation.config';
import { AptosService } from '../aptos/aptos.service';

@Injectable()
export class PassportAttestationService {
  private readonly logger = new Logger(PassportAttestationService.name);
  private aptosClient: Aptos;
  private attestorAccount: Account;
  private config: PassportAttestationConfig;

  constructor(private readonly aptosService: AptosService) {
    // Load configuration
    this.config = getPassportAttestationConfig();
    
    // Initialize Aptos client
    const clientConfig = {
      API_KEY: process.env.APTOS_API_KEY,
    };
    this.aptosClient = new Aptos(
      new AptosConfig({
        network: Network.TESTNET,
        clientConfig,
        fullnode: process.env.APTOS_FULLNODE_URL,
      }),
    );

    // Initialize attestor account from private key
    this.initializeAttestorAccount();
  }

  private initializeAttestorAccount() {
    try {
      const privateKeyHex = process.env.ATTESTOR_PRIVATE_KEY;
      if (!privateKeyHex) {
        throw new Error('ATTESTOR_PRIVATE_KEY environment variable is not set');
      }

      const privateKeyBytes = Hex.fromHexString(privateKeyHex).toUint8Array();
      const privateKey = new Ed25519PrivateKey(privateKeyBytes);
      this.attestorAccount = Account.fromPrivateKey({ privateKey });
      
      this.logger.log(`Attestor account initialized: ${this.attestorAccount.accountAddress.toString()}`);
    } catch (error) {
      this.logger.error('Failed to initialize attestor account:', error);
      throw error;
    }
  }

  /**
   * Execute every hour,将用户的passport分数上链为attestation
   */
  @Cron(CronExpression.EVERY_HOUR)
  async schedulePassportAttestations() {
    if (!this.config.enabled) {
      this.logger.log('Passport attestation is disabled');
      return;
    }

    this.logger.log('Starting scheduled passport attestation process...');
    
    try {
      // 1. Get the list of users to attest (users with recent score updates)
      const usersToAttest = await this.getUsersForAttestation();
      this.logger.log(`Found ${usersToAttest.length} users to create attestations for`);

      // 2. Get passport schema information
      const schemaInfo = await this.getPassportSchema();
      if (!schemaInfo) {
        this.logger.error('Passport schema not found in database');
        return;
      }

      // 3. Parse schema data template
      const codec = this.parseSchemaTemplate(schemaInfo.schema);
      if (!codec) {
        this.logger.error('Failed to parse schema template');
        return;
      }

      // 4. Create attestation for each user
      for (const user of usersToAttest) {
        try {
          await this.createPassportAttestation(user, codec);
        } catch (error) {
          this.logger.error(`Failed to create attestation for user ${user.user_address}:`, error);
        }
      }

      this.logger.log('Completed scheduled passport attestation process');
    } catch (error) {
      this.logger.error('Error in scheduled passport attestation process:', error);
    }
  }

  /**
   * Get the list of users to create attestation
   */
  private async getUsersForAttestation() {
    // Get users with recent score updates in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const users = await db
      .select({
        user_address: passport_scores.user_address,
        chain: passport_scores.chain,
        total_score: passport_scores.total_score,
        calculated_at: passport_scores.calculated_at,
      })
      .from(passport_scores)
      .where(and(
        eq(passport_scores.chain, 'aptos'), // Currently only supports Aptos
        // Can add time filtering conditions
      ))
      .orderBy(desc(passport_scores.calculated_at))
      .limit(this.config.maxUsersPerBatch);

    return users;
  }

  /**
   * Get passport schema information
   */
  private async getPassportSchema() {
    try {
      const schema = await this.aptosService.findSchemaByAddressFromGraphQL(this.config.schemaAddress);
      return schema;
    } catch (error) {
      this.logger.error('Failed to fetch schema from GraphQL API:', error);
      return null;
    }
  }

  /**
   * Parse schema data template
   */
  private parseSchemaTemplate(schemaHex: string): Codec | null {
    try {
      const schemaRawString = bcs.string().parse(Hex.fromHexString(schemaHex).toUint8Array());
      return new Codec(schemaRawString);
    } catch (error) {
      this.logger.error('Failed to parse schema template:', error);
      return null;
    }
  }

  /**
   * Create passport attestation for a user
   */
  private async createPassportAttestation(user: any, codec: Codec) {
    try {
      // Prepare attestation data
      const attestationData = {
        Score: parseInt(user.total_score) // u16 type
      };

      // Encode data
      const encodedData = codec.encodeToBytes(attestationData);

      // Get package address
      const packageAddress = this.getPackageAddress('aptos', 'mainnet');

      // Prepare transaction parameters
      const expirationTime = this.config.expirationTime;
      const isRevocable = this.config.isRevocable;
      const refAttestationId = '0x00';

      // Create on-chain transaction
      const transaction = await this.aptosClient.transaction.build.simple({
        sender: this.attestorAccount.accountAddress,
        data: {
          function: `${packageAddress}::aas::create_attestation`,
          functionArguments: [
            user.user_address, // recipient
            this.config.schemaAddress, // schema address
            refAttestationId,
            expirationTime,
            isRevocable,
            encodedData
          ]
        }
      });

      // Sign and submit transaction with private key
      this.logger.log(`Creating attestation for user ${user.user_address}...`);
      
      const tx = await this.aptosClient.transaction.signAndSubmitTransaction({
        signer: this.attestorAccount,
        transaction
      });

      // Wait for transaction confirmation
      const result = await this.aptosClient.waitForTransaction({ 
        transactionHash: tx.hash 
      });

      if (result.success) {
        this.logger.log(`Attestation created successfully for user ${user.user_address}, tx: ${tx.hash}`);
        
        // Get attestation address from transaction events
        let attestationAddress = '';
        if ('events' in result && result.events) {
          for (const event of result.events) {
            if (event.type.includes('AttestationCreated')) {
              attestationAddress = (event.data as any).attestation_address;
              break;
            }
          }
        }

        // Save attestation to database
        // await this.saveAttestationToDatabase({
        //   address: attestationAddress || tx.hash, // Use actual attestation address or transaction hash
        //   schema: this.config.schemaAddress,
        //   ref_attestation: refAttestationId,
        //   time: new Date().toISOString(),
        //   expiration_time: expirationTime.toString(),
        //   revocation_time: '0',
        //   attestor: this.attestorAccount.accountAddress.toString(),
        //   recipient: user.user_address,
        //   data: Buffer.from(encodedData).toString('hex'),
        //   tx_hash: tx.hash
        // });
      } else {
        throw new Error(`Transaction failed: ${result.vm_status}`);
      }

      this.logger.log(`Created attestation for user ${user.user_address}`);
    } catch (error) {
      this.logger.error(`Error creating attestation for user ${user.user_address}:`, error);
      throw error;
    }
  }

  /**
   * Check if attestation already exists
   */
  private async checkExistingAttestation(userAddress: string) {
    const attestation = await db
      .select()
      .from(aptos_attestations)
      .where(and(
        eq(aptos_attestations.recipient, userAddress),
        eq(aptos_attestations.schema, this.config.schemaAddress)
      ))
      .limit(1);

    return attestation[0] || null;
  }

  /**
   * Save attestation to database
   */
  private async saveAttestationToDatabase(attestationData: any) {
    await db.insert(aptos_attestations).values(attestationData);
  }

  /**
   * Get package address
   */
  private getPackageAddress(chain: string, network: string): string {
    return this.config.packageAddress;
  }

  /**
   * Manually trigger attestation creation (for testing)
   */
  async createAttestationForUser(userAddress: string, chain: string = 'aptos') {
    this.logger.log(`Manually creating attestation for user ${userAddress}`);
    
    try {
      // Get user's latest passport score
      const userScore = await db
        .select()
        .from(passport_scores)
        .where(and(
          eq(passport_scores.user_address, userAddress),
          eq(passport_scores.chain, chain)
        ))
        .orderBy(desc(passport_scores.calculated_at))
        .limit(1);

      if (userScore.length === 0) {
        throw new Error(`No passport score found for user ${userAddress}`);
      }

      // Get schema information
      const schemaInfo = await this.getPassportSchema();
      if (!schemaInfo) {
        throw new Error('Passport schema not found');
      }

      // Parse schema
      const codec = this.parseSchemaTemplate(schemaInfo.schema);
      if (!codec) {
        throw new Error('Failed to parse schema template');
      }

      // Create attestation
      await this.createPassportAttestation(userScore[0], codec);
      
      this.logger.log(`Successfully created attestation for user ${userAddress}`);
    } catch (error) {
      this.logger.error(`Failed to create attestation for user ${userAddress}:`, error);
      throw error;
    }
  }
}
