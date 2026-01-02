import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { db } from '../db/db';
import { eq, and, lt, sql } from 'drizzle-orm';
import { scheduled_tasks, data_sources } from './schema';
import { aptos_users } from '../db/schema';
import { AchievementCalculationService } from './achievement-calculation.service';
import { DataSourceService } from './data-source.service';
import { ScheduledTaskStatus, TaskExecutionResult, ScheduledTaskType } from './dto';

@Injectable()
export class ScheduledTaskService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScheduledTaskService.name);
  private isRunning = false;

  constructor(
    private readonly achievementCalculationService: AchievementCalculationService,
    private readonly dataSourceService: DataSourceService,
  ) {}

  async onModuleInit() {
    this.logger.log('ScheduledTaskService initialized');
    await this.startScheduledTasks();
  }

  async onModuleDestroy() {
    this.logger.log('ScheduledTaskService destroyed');
    await this.stopScheduledTasks();
  }

  // Start scheduled tasks
  async startScheduledTasks(): Promise<void> {
    try {
      this.logger.log('Starting scheduled tasks...');
      
      // Load all active scheduled tasks
      const tasks = await db
        .select()
        .from(scheduled_tasks)
        .where(eq(scheduled_tasks.is_active, true));

      this.logger.log(`Loaded ${tasks.length} active scheduled tasks`);
      
      // Here we can add specific scheduled task startup logic
      // Since we are using @nestjs/schedule decorator, tasks will be automatically started
      // TODO: Implement the logic to start specific scheduled tasks
      
    } catch (error) {
      this.logger.error('Error starting scheduled tasks:', error);
    }
  }

  // Stop scheduled tasks
  async stopScheduledTasks(): Promise<void> {
    try {
      this.logger.log('Stopping scheduled tasks...');
      this.isRunning = false;
    } catch (error) {
      this.logger.error('Error stopping scheduled tasks:', error);
    }
  }

  // Daily achievement check task
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async executeAchievementCheck(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Achievement check already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      this.logger.log('Starting daily achievement check...');
      
      await this.updateTaskExecutionStatus('achievement_check_daily', 'running');
      
      // Get all active user addresses
      const activeUsers = await this.getActiveUsers();
      this.logger.log(`Found ${activeUsers.length} active users`);
      
      // Batch process user data
      const batchSize = 100;
      let processedCount = 0;
      
      for (let i = 0; i < activeUsers.length; i += batchSize) {
        const batch = activeUsers.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (userAddress) => {
            try {
              await this.achievementCalculationService.processUserData(userAddress, 'aptos');
              processedCount++;
            } catch (error) {
              this.logger.error(`Error processing user ${userAddress}:`, error);
            }
          })
        );
        
        this.logger.log(`Processed ${Math.min(i + batchSize, activeUsers.length)}/${activeUsers.length} users`);
        
        // Add delay to avoid overload
        if (i + batchSize < activeUsers.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      const duration = Date.now() - startTime;
      await this.updateTaskExecutionStatus('achievement_check_daily', 'success', {
        recordsProcessed: processedCount,
        duration,
      });
      
      this.logger.log(`Achievement check completed. Processed ${processedCount} users in ${duration}ms`);
      
    } catch (error) {
      this.logger.error('Error in achievement check:', error);
      await this.updateTaskExecutionStatus('achievement_check_daily', 'error', {
        error: error.message,
      });
    } finally {
      this.isRunning = false;
    }
  }

  // Hourly data sync task
  @Cron(CronExpression.EVERY_HOUR)
  async executeDataSync(): Promise<void> {
    try {
      this.logger.log('Starting hourly data sync...');
      
      await this.updateTaskExecutionStatus('data_sync_hourly', 'running');
      
      // Get all active data sources
      const sources = await db
        .select()
        .from(data_sources)
        .where(eq(data_sources.is_active, true));

      let totalProcessed = 0;
      
      for (const source of sources) {
        try {
          // Get users that need to be synced
          const users = await this.getUsersForSync(source.chain);
          
          for (const userAddress of users) {
            try {
              await this.dataSourceService.syncDataSource(source.id, userAddress, 'incremental');
              totalProcessed++;
            } catch (error) {
              this.logger.error(`Error syncing data for user ${userAddress} from source ${source.id}:`, error);
            }
          }
        } catch (error) {
          this.logger.error(`Error processing data source ${source.id}:`, error);
        }
      }
      
      await this.updateTaskExecutionStatus('data_sync_hourly', 'success', {
        recordsProcessed: totalProcessed,
      });
      
      this.logger.log(`Data sync completed. Processed ${totalProcessed} records`);
      
    } catch (error) {
      this.logger.error('Error in data sync:', error);
      await this.updateTaskExecutionStatus('data_sync_hourly', 'error', {
        error: error.message,
      });
    }
  }

  // Weekly cleanup task
  @Cron(CronExpression.EVERY_WEEKEND)
  async executeCleanup(): Promise<void> {
    try {
      this.logger.log('Starting weekly cleanup...');
      
      await this.updateTaskExecutionStatus('cleanup_weekly', 'running');
      
      // Clean up old sync logs
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await this.cleanupOldLogs(thirtyDaysAgo);
      
      // Clean up temporary data
      await this.cleanupTempData();
      
      // Database optimization
      await this.optimizeDatabase();
      
      await this.updateTaskExecutionStatus('cleanup_weekly', 'success', {
        cleanupDate: new Date(),
      });
      
      this.logger.log('Weekly cleanup completed');
      
    } catch (error) {
      this.logger.error('Error in cleanup:', error);
      await this.updateTaskExecutionStatus('cleanup_weekly', 'error', {
        error: error.message,
      });
    }
  }

  // Manual trigger task
  async triggerTask(taskName: string): Promise<TaskExecutionResult> {
    try {
      this.logger.log(`Manually triggering task: ${taskName}`);
      
      const startTime = Date.now();
      
      switch (taskName) {
        case 'achievement_check_daily':
          await this.executeAchievementCheck();
          break;
        case 'data_sync_hourly':
          await this.executeDataSync();
          break;
        case 'cleanup_weekly':
          await this.executeCleanup();
          break;
        default:
          throw new Error(`Unknown task: ${taskName}`);
      }
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        executionTime: duration,
        recordsProcessed: 0, // Here we need to return the actual processing result
        message: `Task ${taskName} executed successfully`,
      };
      
    } catch (error) {
      this.logger.error(`Error triggering task ${taskName}:`, error);
      return {
        success: false,
        executionTime: 0,
        recordsProcessed: 0,
        message: error.message,
      };
    }
  }

  // Get task status
  async getTaskStatus(): Promise<ScheduledTaskStatus[]> {
    try {
      const tasks = await db
        .select()
        .from(scheduled_tasks)
        .where(eq(scheduled_tasks.is_active, true));

      return tasks.map(task => ({
        taskName: task.task_name,
        isActive: task.is_active,
        lastExecuted: task.last_executed,
        nextExecution: task.next_execution,
        executionCount: task.execution_count,
        successCount: task.success_count,
        errorCount: task.error_count,
        lastError: task.last_error,
      }));
    } catch (error) {
      this.logger.error('Error fetching task status:', error);
      throw error;
    }
  }

  // Update task config
  async updateTaskConfig(taskName: string, config: any): Promise<void> {
    try {
      await db
        .update(scheduled_tasks)
        .set({
          config,
          updated_at: new Date(),
        })
        .where(eq(scheduled_tasks.task_name, taskName));

      this.logger.log(`Updated config for task: ${taskName}`);
    } catch (error) {
      this.logger.error(`Error updating task config for ${taskName}:`, error);
      throw error;
    }
  }

  // Start/stop task
  async toggleTask(taskName: string, isActive: boolean): Promise<void> {
    try {
      await db
        .update(scheduled_tasks)
        .set({
          is_active: isActive,
          updated_at: new Date(),
        })
        .where(eq(scheduled_tasks.task_name, taskName));

      this.logger.log(`${isActive ? 'Started' : 'Stopped'} task: ${taskName}`);
    } catch (error) {
      this.logger.error(`Error toggling task ${taskName}:`, error);
      throw error;
    }
  }

  // Update task execution status
  private async updateTaskExecutionStatus(taskName: string, status: string, data?: any): Promise<void> {
    try {
      const updateData: any = {
        last_executed: new Date(),
        execution_count: sql`execution_count + 1`,
        updated_at: new Date(),
      };

      if (status === 'success') {
        updateData.success_count = sql`success_count + 1`;
        updateData.last_error = null;
      } else if (status === 'error') {
        updateData.error_count = sql`error_count + 1`;
        updateData.last_error = data?.error || 'Unknown error';
      }

      await db
        .update(scheduled_tasks)
        .set(updateData)
        .where(eq(scheduled_tasks.task_name, taskName));

    } catch (error) {
      this.logger.error(`Error updating task execution status for ${taskName}:`, error);
    }
  }

  // Get active users
  private async getActiveUsers(): Promise<string[]> {
    try {
      // Get all users from aptos_users table
      const users = await db
        .select({ address: aptos_users.address })
        .from(aptos_users);

      const userAddresses = users.map(user => user.address);
      this.logger.log(`Retrieved ${userAddresses.length} users from aptos_users table`);
      
      return userAddresses;
    } catch (error) {
      this.logger.error('Error getting active users:', error);
      return [];
    }
  }

  // Get users that need to be synced
  private async getUsersForSync(chain: string): Promise<string[]> {
    try {
      // Since we only support Aptos chain, get all users from aptos_users table
      if (chain.toLowerCase() === 'aptos') {
        const users = await db
          .select({ address: aptos_users.address })
          .from(aptos_users);

        const userAddresses = users.map(user => user.address);
        this.logger.log(`Retrieved ${userAddresses.length} users for sync from aptos_users table`);
        
        return userAddresses;
      }
      
      // For other chains, return empty array for now
      this.logger.warn(`Chain ${chain} is not supported yet, returning empty user list`);
      return [];
    } catch (error) {
      this.logger.error('Error getting users for sync:', error);
      return [];
    }
  }

  // Clean up old logs
  private async cleanupOldLogs(cutoffDate: Date): Promise<void> {
    try {
      // Here we need to implement the logic to clean up old logs
      this.logger.log(`Cleaning up logs older than ${cutoffDate.toISOString()}`);
    } catch (error) {
      this.logger.error('Error cleaning up old logs:', error);
    }
  }

  // Clean up temporary data
  private async cleanupTempData(): Promise<void> {
    try {
      // Here we need to implement the logic to clean up temporary data
      this.logger.log('Cleaning up temporary data');
    } catch (error) {
      this.logger.error('Error cleaning up temp data:', error);
    }
  }

  // Database optimization
  private async optimizeDatabase(): Promise<void> {
    try {
      // Here we need to implement the logic to optimize the database
      this.logger.log('Optimizing database');
    } catch (error) {
      this.logger.error('Error optimizing database:', error);
    }
  }
}
