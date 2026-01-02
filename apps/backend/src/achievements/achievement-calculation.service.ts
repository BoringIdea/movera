import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { TaskService } from './task.service';
import { DataSourceService } from './data-source.service';
import { 
  TransactionData, 
  ProtocolInfo, 
  UserData, 
  VerificationResult,
  DataSourceType 
} from './dto';

@Injectable()
export class AchievementCalculationService {
  constructor(
    private readonly taskService: TaskService,
    private readonly dataSourceService: DataSourceService,
  ) {}

  // Deal with user data and update achievements(support multiple data sources)
  async processUserData(userAddress: string, chain: string, dataSource?: string): Promise<void> {
    try {
      let transactionData: TransactionData[] = [];
      let protocolData: ProtocolInfo[] = [];

      if (!dataSource || dataSource === 'database') {
        // Get data from database
        const dbTransactions = await this.dataSourceService.getTransactionData(userAddress, chain);
        const dbProtocols = await this.dataSourceService.getUserProtocolData(userAddress, chain);
        
        transactionData = [...transactionData, ...dbTransactions];
        protocolData = [...protocolData, ...dbProtocols];
      }

      if (!dataSource || dataSource === 'api') {
        // Get data from API
        const apiSources = await this.dataSourceService.getDataSources(chain);
        const apiDataSources = apiSources.filter(source => source.source_type === DataSourceType.API);

        for (const source of apiDataSources) {
          try {
            const apiData = await this.dataSourceService.fetchApiData(source.id, userAddress);
            const mappedData = await this.dataSourceService.mapApiDataToTransactionData(
              apiData, 
              source.data_mapping
            );
            transactionData = [...transactionData, ...mappedData];
          } catch (error) {
            console.error(`Error fetching data from API source ${source.id}:`, error);
            // Continue processing other data sources
          }
        }
      }

      // Deduplicate transaction data
      const uniqueTransactions = this.deduplicateTransactions(transactionData);

      // Check various types of tasks
      await this.checkProtocolTasks(userAddress, chain, protocolData);
      await this.checkVolumeTasks(userAddress, chain, uniqueTransactions);
      await this.checkFrequencyTasks(userAddress, chain, uniqueTransactions);
      await this.checkComplexityTasks(userAddress, chain, uniqueTransactions);
      await this.checkSocialTasks(userAddress, chain);

    } catch (error) {
      console.error('Error processing user data:', error);
      throw new HttpException('Failed to process user data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Process transaction data from database
  async processDatabaseTransactions(userAddress: string, chain: string): Promise<void> {
    await this.processUserData(userAddress, chain, 'database');
  }

  // Process data from API
  async processApiData(userAddress: string, chain: string, sourceId: number): Promise<void> {
    try {
      const apiData = await this.dataSourceService.fetchApiData(sourceId, userAddress);
      const source = await this.dataSourceService.getDataSources(chain);
      const sourceData = source.find(s => s.id === sourceId);
      
      if (sourceData) {
        const mappedData = await this.dataSourceService.mapApiDataToTransactionData(
          apiData, 
          sourceData.data_mapping
        );
        
        await this.checkVolumeTasks(userAddress, chain, mappedData);
        await this.checkProtocolTasks(userAddress, chain, []);
      }
    } catch (error) {
      console.error('Error processing API data:', error);
      throw new HttpException('Failed to process API data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Check protocol related tasks
  async checkProtocolTasks(userAddress: string, chain: string, protocolInfo: ProtocolInfo[]): Promise<void> {
    try {
      // Get all protocol related tasks
      const tasks = await this.taskService.getAvailableTasks(chain);
      const protocolTasks = tasks.filter(task => task.category === 'protocol');

      for (const task of protocolTasks) {
        const conditions = task.conditions as any;
        
        if (conditions.protocol_address) {
          const protocol = protocolInfo.find(p => p.address === conditions.protocol_address);
          
          if (protocol) {
            const progress = protocol.interactionCount;
            const targetProgress = conditions.min_interactions || 1;
            
            if (progress >= targetProgress) {
              await this.taskService.updateTaskProgress(userAddress, chain, task.id, progress);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking protocol tasks:', error);
    }
  }

  // Check volume tasks
  async checkVolumeTasks(userAddress: string, chain: string, transactionData: TransactionData[]): Promise<void> {
    try {
      const tasks = await this.taskService.getAvailableTasks(chain);
      const volumeTasks = tasks.filter(task => task.category === 'volume');

      for (const task of volumeTasks) {
        const conditions = task.conditions as any;
        
        // Filter transactions by protocol if specified
        let protocolTransactions = transactionData;
        if (conditions.protocol_address) {
          protocolTransactions = transactionData.filter(tx => 
            tx.protocolAddress === conditions.protocol_address
          );
        } else if (conditions.protocol_name) {
          protocolTransactions = transactionData.filter(tx => 
            tx.protocolName === conditions.protocol_name
          );
        }
        
        // Further filter by transaction type if specified
        if (conditions.transaction_type) {
          protocolTransactions = protocolTransactions.filter(tx => 
            tx.operationType === conditions.transaction_type
          );
        }
        
        // Check APT volume
        if (conditions.total_volume_apt) {
          const totalVolumeAPT = protocolTransactions.reduce((sum, tx) => {
            // Only count APT transactions
            return sum + (tx.tokenSymbol === 'APT' ? tx.amount : 0);
          }, 0);
          
          if (totalVolumeAPT >= conditions.total_volume_apt) {
            await this.taskService.updateTaskProgress(userAddress, chain, task.id, Math.floor(totalVolumeAPT));
          }
        }
        
        // Check USD volume
        if (conditions.total_volume_usd) {
          // Here we need to convert the transaction amount to USD
          // Simplified processing, assume all amounts are USD
          const totalVolumeUSD = protocolTransactions.reduce((sum, tx) => sum + tx.amount, 0);
          
          if (totalVolumeUSD >= conditions.total_volume_usd) {
            await this.taskService.updateTaskProgress(userAddress, chain, task.id, Math.floor(totalVolumeUSD));
          }
        }
      }
    } catch (error) {
      console.error('Error checking volume tasks:', error);
    }
  }

  // Check frequency tasks
  async checkFrequencyTasks(userAddress: string, chain: string, transactionData: TransactionData[]): Promise<void> {
    try {
      const tasks = await this.taskService.getAvailableTasks(chain);
      const frequencyTasks = tasks.filter(task => task.category === 'frequency');

      for (const task of frequencyTasks) {
        const conditions = task.conditions as any;
        
        // Filter transactions by protocol if specified
        let protocolTransactions = transactionData;
        if (conditions.protocol_address) {
          protocolTransactions = transactionData.filter(tx => 
            tx.protocolAddress === conditions.protocol_address
          );
        } else if (conditions.protocol_name) {
          protocolTransactions = transactionData.filter(tx => 
            tx.protocolName === conditions.protocol_name
          );
        }
        
        if (conditions.consecutive_days) {
          const consecutiveDays = this.calculateConsecutiveDays(protocolTransactions);
          
          if (consecutiveDays >= conditions.consecutive_days) {
            await this.taskService.updateTaskProgress(userAddress, chain, task.id, consecutiveDays);
          }
        }
        
        if (conditions.min_transactions_per_day) {
          const dailyTransactions = this.calculateDailyTransactions(protocolTransactions);
          const daysWithMinTransactions = dailyTransactions.filter(day => 
            day.count >= conditions.min_transactions_per_day
          ).length;
          
          if (daysWithMinTransactions >= conditions.consecutive_days) {
            await this.taskService.updateTaskProgress(userAddress, chain, task.id, daysWithMinTransactions);
          }
        }
      }
    } catch (error) {
      console.error('Error checking frequency tasks:', error);
    }
  }

  // Check complexity tasks
  async checkComplexityTasks(userAddress: string, chain: string, transactionData: TransactionData[]): Promise<void> {
    try {
      const tasks = await this.taskService.getAvailableTasks(chain);
      const complexityTasks = tasks.filter(task => task.category === 'complexity');

      for (const task of complexityTasks) {
        const conditions = task.conditions as any;
        
        // Filter transactions by protocol if specified
        let protocolTransactions = transactionData;
        if (conditions.protocol_address) {
          protocolTransactions = transactionData.filter(tx => 
            tx.protocolAddress === conditions.protocol_address
          );
        } else if (conditions.protocol_name) {
          protocolTransactions = transactionData.filter(tx => 
            tx.protocolName === conditions.protocol_name
          );
        }
        
        if (conditions.required_operations) {
          const uniqueOperations = new Set(protocolTransactions.map(tx => tx.operationType));
          const requiredOps = new Set(conditions.required_operations as string[]);
          
          let completedOperations = 0;
          for (const op of requiredOps) {
            if (uniqueOperations.has(op as string)) {
              completedOperations++;
            }
          }
          
          if (completedOperations >= conditions.min_operations) {
            await this.taskService.updateTaskProgress(userAddress, chain, task.id, completedOperations);
          }
        }
      }
    } catch (error) {
      console.error('Error checking complexity tasks:', error);
    }
  }

  // Check social tasks
  async checkSocialTasks(userAddress: string, chain: string): Promise<void> {
    try {
      const tasks = await this.taskService.getAvailableTasks(chain);
      const socialTasks = tasks.filter(task => task.category === 'social');

      for (const task of socialTasks) {
        const conditions = task.conditions as any;
        
        if (conditions.has_ens) {
          // Here we need to check ENS from social data source
          // Simplified processing, assume user has ENS
          const hasENS = await this.checkUserHasENS(userAddress);
          
          if (hasENS) {
            await this.taskService.updateTaskProgress(userAddress, chain, task.id, 1);
          }
        }
      }
    } catch (error) {
      console.error('Error checking social tasks:', error);
    }
  }

  // Batch process user data
  async batchProcessUserData(userAddresses: string[], chain: string): Promise<void> {
    try {
      const batchSize = 10; // Batch processing size
      
      for (let i = 0; i < userAddresses.length; i += batchSize) {
        const batch = userAddresses.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (userAddress) => {
            try {
              await this.processUserData(userAddress, chain);
            } catch (error) {
              console.error(`Error processing user ${userAddress}:`, error);
              // Continue processing other users
            }
          })
        );
        
        // Add delay to avoid overload
        if (i + batchSize < userAddresses.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error('Error in batch processing:', error);
      throw new HttpException('Failed to batch process user data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Manual verify user tasks
  async manualVerifyUserTasks(userAddress: string, chain: string): Promise<VerificationResult> {
    try {
      const startTime = Date.now();
      
      // Force refresh user data
      await this.processUserData(userAddress, chain);
      
      // Get user task progress
      const progress = await this.taskService.getUserTaskProgress(userAddress, chain);
      const completedTasks = progress.filter(p => p.isCompleted);
      
      // Calculate total points
      const totalPoints = completedTasks.reduce((sum, task) => {
        // Here we need to get points from task definition
        return sum + (task.progressData?.reward_points || 0);
      }, 0);
      
      return {
        success: true,
        tasksCompleted: completedTasks.length,
        pointsEarned: totalPoints,
        details: {
          completedTasks: completedTasks.map(t => t.taskName),
          processingTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      console.error('Error in manual verification:', error);
      throw new HttpException('Failed to verify user tasks', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Helper method: deduplicate transactions
  private deduplicateTransactions(transactions: TransactionData[]): TransactionData[] {
    const seen = new Set<string>();
    return transactions.filter(tx => {
      const key = `${tx.txHash}-${tx.userAddress}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Helper method: calculate consecutive active days
  private calculateConsecutiveDays(transactions: TransactionData[]): number {
    if (transactions.length === 0) return 0;
    
    // Group by date
    const dailyTransactions = new Map<string, TransactionData[]>();
    transactions.forEach(tx => {
      const date = tx.timestamp.toISOString().split('T')[0];
      if (!dailyTransactions.has(date)) {
        dailyTransactions.set(date, []);
      }
      dailyTransactions.get(date)!.push(tx);
    });
    
    // Calculate consecutive days
    const sortedDates = Array.from(dailyTransactions.keys()).sort().reverse();
    let consecutiveDays = 0;
    let currentDate = new Date();
    
    for (const dateStr of sortedDates) {
      const date = new Date(dateStr);
      const diffTime = currentDate.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === consecutiveDays) {
        consecutiveDays++;
        currentDate = date;
      } else {
        break;
      }
    }
    
    return consecutiveDays;
  }

  // Helper method: calculate daily transactions
  private calculateDailyTransactions(transactions: TransactionData[]): Array<{date: string, count: number}> {
    const dailyCounts = new Map<string, number>();
    
    transactions.forEach(tx => {
      const date = tx.timestamp.toISOString().split('T')[0];
      dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
    });
    
    return Array.from(dailyCounts.entries()).map(([date, count]) => ({ date, count }));
  }

  // Helper method: check user has ENS
  private async checkUserHasENS(userAddress: string): Promise<boolean> {
    try {
      // Here we need to implement ENS check logic
      // Simplified processing, return false
      return false;
    } catch (error) {
      console.error('Error checking ENS:', error);
      return false;
    }
  }
}
