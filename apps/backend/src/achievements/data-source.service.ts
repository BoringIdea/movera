import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { db } from '../db/db';
import { eq, and, desc, gte } from 'drizzle-orm';
import { data_sources, data_sync_logs } from './schema';
import { user_transactions, user_protocols } from '../db/schema';
import { CreateDataSourceDto, UpdateDataSourceDto, TransactionData, DataSourceType } from './dto';
import axios from 'axios';

@Injectable()
export class DataSourceService {
  
  // Get data source configurations
  async getDataSources(chain: string): Promise<any[]> {
    try {
      const sources = await db
        .select()
        .from(data_sources)
        .where(and(
          eq(data_sources.is_active, true),
          eq(data_sources.chain, chain)
        ));

      return sources;
    } catch (error) {
      console.error('Error fetching data sources:', error);
      throw new HttpException('Failed to fetch data sources', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Add data source
  async addDataSource(createDataSourceDto: CreateDataSourceDto): Promise<any> {
    try {
      const [source] = await db
        .insert(data_sources)
        .values({
          ...createDataSourceDto,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      return source;
    } catch (error) {
      console.error('Error adding data source:', error);
      throw new HttpException('Failed to add data source', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Update data source
  async updateDataSource(id: number, updateDataSourceDto: UpdateDataSourceDto): Promise<any> {
    try {
      const [source] = await db
        .update(data_sources)
        .set({
          ...updateDataSourceDto,
          updated_at: new Date(),
        })
        .where(eq(data_sources.id, id))
        .returning();

      if (!source) {
        throw new HttpException('Data source not found', HttpStatus.NOT_FOUND);
      }

      return source;
    } catch (error) {
      console.error('Error updating data source:', error);
      throw new HttpException('Failed to update data source', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get transaction data from database
  async getTransactionData(userAddress: string, chain: string, timeRange?: string): Promise<TransactionData[]> {
    try {
      let startDate: Date;
      
      if (timeRange) {
        const now = new Date();
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
          default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
      }

      const transactions = await db
        .select()
        .from(user_transactions)
        .where(and(
          eq(user_transactions.user_address, userAddress),
          eq(user_transactions.chain, chain),
          timeRange ? gte(user_transactions.timestamp, startDate) : undefined
        ))
        .orderBy(desc(user_transactions.timestamp));

      return transactions.map(tx => ({
        txHash: tx.tx_hash,
        userAddress: tx.user_address,
        protocolAddress: tx.protocol_address || '',
        protocolName: tx.protocol_name || 'Unknown',
        amount: Number(tx.amount) || 0,
        timestamp: tx.timestamp,
        operationType: tx.operation_type || 'unknown',
        tokenSymbol: tx.token_symbol || 'APT',
        success: tx.success,
      }));
    } catch (error) {
      console.error('Error fetching transaction data:', error);
      throw new HttpException('Failed to fetch transaction data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Fetch data from API
  async fetchApiData(sourceId: number, userAddress: string, params?: any): Promise<any> {
    try {
      const source = await db
        .select()
        .from(data_sources)
        .where(eq(data_sources.id, sourceId))
        .limit(1);

      if (source.length === 0) {
        throw new HttpException('Data source not found', HttpStatus.NOT_FOUND);
      }

      const sourceData = source[0];
      
      if (sourceData.source_type !== DataSourceType.API) {
        throw new HttpException('Data source is not an API source', HttpStatus.BAD_REQUEST);
      }

      const dataMapping = sourceData.data_mapping as any;
      const config = {
        method: 'GET',
        url: sourceData.api_endpoint,
        headers: this.buildHeaders(sourceData.api_auth_config),
        params: {
          ...params,
          [dataMapping.user_param]: userAddress,
        },
        timeout: 30000,
      };

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error('Error fetching API data:', error);
      throw new HttpException('Failed to fetch API data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Build API request headers
  private buildHeaders(authConfig: any): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authConfig && authConfig.api_key) {
      const headerName = authConfig.header_name || 'Authorization';
      headers[headerName] = `Bearer ${authConfig.api_key}`;
    }

    return headers;
  }

  // Map API data to transaction data
  async mapApiDataToTransactionData(apiData: any, mapping: any): Promise<TransactionData[]> {
    try {
      if (!apiData || !Array.isArray(apiData)) {
        return [];
      }

      return apiData.map(item => ({
        txHash: item[mapping.response_fields.tx_hash] || '',
        userAddress: item[mapping.response_fields.user_address] || '',
        protocolAddress: item[mapping.response_fields.protocol_address] || '',
        protocolName: item[mapping.response_fields.protocol_name] || 'Unknown',
        amount: Number(item[mapping.response_fields.amount]) || 0,
        timestamp: new Date(item[mapping.response_fields.timestamp] || Date.now()),
        operationType: item[mapping.response_fields.operation_type] || 'unknown',
        tokenSymbol: item[mapping.response_fields.token_symbol] || 'APT',
        success: item[mapping.response_fields.success] !== false,
      }));
    } catch (error) {
      console.error('Error mapping API data:', error);
      throw new HttpException('Failed to map API data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Validate API connection
  async validateApiConnection(sourceId: number): Promise<boolean> {
    try {
      const source = await db
        .select()
        .from(data_sources)
        .where(eq(data_sources.id, sourceId))
        .limit(1);

      if (source.length === 0) {
        return false;
      }

      const sourceData = source[0];
      
      if (sourceData.source_type !== DataSourceType.API) {
        return false;
      }

      const config = {
        method: 'GET',
        url: sourceData.api_endpoint,
        headers: this.buildHeaders(sourceData.api_auth_config),
        timeout: 10000,
      };

      await axios(config);
      return true;
    } catch (error) {
      console.error('API connection validation failed:', error);
      return false;
    }
  }

  // Manual sync data source
  async syncDataSource(sourceId: number, userAddress: string, syncType: string = 'incremental'): Promise<any> {
    try {
      const source = await db
        .select()
        .from(data_sources)
        .where(eq(data_sources.id, sourceId))
        .limit(1);

      if (source.length === 0) {
        throw new HttpException('Data source not found', HttpStatus.NOT_FOUND);
      }

      const sourceData = source[0];
      const startTime = Date.now();

      // Record sync start
      const [syncLog] = await db
        .insert(data_sync_logs)
        .values({
          source_id: sourceId,
          user_address: userAddress,
          sync_type: syncType,
          sync_status: 'running',
          started_at: new Date(),
        })
        .returning();

      try {
        let recordsProcessed = 0;
        let recordsUpdated = 0;

        if (sourceData.source_type === DataSourceType.API) {
          // Get data from API
          const apiData = await this.fetchApiData(sourceId, userAddress);
          const transactionData = await this.mapApiDataToTransactionData(apiData, sourceData.data_mapping);
          
          recordsProcessed = transactionData.length;
          
          // TODO: Here we can store API data to local database or directly process
          // Implement based on actual requirements
          
        } else if (sourceData.source_type === DataSourceType.DATABASE) {
          // Get data from database
          const transactionData = await this.getTransactionData(userAddress, sourceData.chain);
          recordsProcessed = transactionData.length;
        }

        // Update sync log
        await db
          .update(data_sync_logs)
          .set({
            sync_status: 'success',
            records_processed: recordsProcessed,
            records_updated: recordsUpdated,
            sync_duration: Date.now() - startTime,
            completed_at: new Date(),
          })
          .where(eq(data_sync_logs.id, syncLog.id));

        return {
          success: true,
          recordsProcessed,
          recordsUpdated,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        // Update sync log to failed
        await db
          .update(data_sync_logs)
          .set({
            sync_status: 'failed',
            error_message: error.message,
            sync_duration: Date.now() - startTime,
            completed_at: new Date(),
          })
          .where(eq(data_sync_logs.id, syncLog.id));

        throw error;
      }
    } catch (error) {
      console.error('Error syncing data source:', error);
      throw new HttpException('Failed to sync data source', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get sync logs
  async getSyncLogs(sourceId?: number, limit: number = 100): Promise<any[]> {
    try {
      if (sourceId) {
        return await db
          .select()
          .from(data_sync_logs)
          .where(eq(data_sync_logs.source_id, sourceId))
          .orderBy(desc(data_sync_logs.created_at))
          .limit(limit);
      }
      
      return await db
        .select()
        .from(data_sync_logs)
        .orderBy(desc(data_sync_logs.created_at))
        .limit(limit);
    } catch (error) {
      console.error('Error fetching sync logs:', error);
      throw new HttpException('Failed to fetch sync logs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get user protocol interaction data
  async getUserProtocolData(userAddress: string, chain: string): Promise<any[]> {
    try {
      const protocols = await db
        .select()
        .from(user_protocols)
        .where(and(
          eq(user_protocols.user_address, userAddress),
          eq(user_protocols.chain, chain)
        ));

      return protocols.map(protocol => ({
        address: protocol.protocol_address,
        name: protocol.protocol_name,
        category: protocol.protocol_category,
        interactionCount: protocol.interaction_count,
        totalVolume: Number(protocol.total_volume),
        lastInteraction: protocol.last_interaction_at,
        isDeepInteraction: protocol.is_deep_interaction,
      }));
    } catch (error) {
      console.error('Error fetching user protocol data:', error);
      throw new HttpException('Failed to fetch user protocol data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
