import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { db } from '../db/db';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { 
  tasks, 
  user_task_progress, 
  user_points, 
  point_transactions, 
  task_completions 
} from './schema';
import { user_transactions, user_protocols, user_activities, user_social_data } from '../db/schema';
import { 
  CreateTaskDto, 
  UpdateTaskDto, 
  ClaimPointsDto,
  TaskCompletionResult,
  UserPoints,
  UserTaskProgress,
  PointTransactionType
} from './dto';

@Injectable()
export class TaskService {
  
  // Get all available tasks
  async getAvailableTasks(chain: string): Promise<any[]> {
    try {
      const availableTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.is_active, true));

      return availableTasks;
    } catch (error) {
      console.error('Error fetching available tasks:', error);
      throw new HttpException('Failed to fetch tasks', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get user task progress
  async getUserTaskProgress(userAddress: string, chain: string): Promise<UserTaskProgress[]> {
    try {
      const progress = await db
        .select({
          taskId: tasks.id,
          taskName: tasks.name,
          currentProgress: user_task_progress.current_progress,
          targetProgress: user_task_progress.target_progress,
          isCompleted: user_task_progress.is_completed,
          completedAt: user_task_progress.completed_at,
          rewardClaimed: user_task_progress.reward_claimed,
          progressData: user_task_progress.progress_data,
        })
        .from(user_task_progress)
        .innerJoin(tasks, eq(user_task_progress.task_id, tasks.id))
        .where(and(
          eq(user_task_progress.user_address, userAddress),
          eq(user_task_progress.chain, chain)
        ));

      return progress.map(p => ({
        taskId: p.taskId,
        taskName: p.taskName,
        currentProgress: p.currentProgress,
        targetProgress: p.targetProgress,
        isCompleted: p.isCompleted,
        completedAt: p.completedAt,
        rewardClaimed: p.rewardClaimed,
        progressData: p.progressData,
      }));
    } catch (error) {
      console.error('Error fetching user task progress:', error);
      throw new HttpException('Failed to fetch task progress', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Check task completion conditions
  async checkTaskCompletion(userAddress: string, chain: string, taskId: number): Promise<boolean> {
    try {
      const task = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);

      if (task.length === 0) {
        return false;
      }

      const taskData = task[0];
      const conditions = taskData.conditions as any;

      // Check completion conditions based on task type
      switch (taskData.category) {
        case 'protocol':
          return await this.checkProtocolConditions(userAddress, chain, conditions);
        case 'volume':
          return await this.checkVolumeConditions(userAddress, chain, conditions);
        case 'frequency':
          return await this.checkFrequencyConditions(userAddress, chain, conditions);
        case 'complexity':
          return await this.checkComplexityConditions(userAddress, chain, conditions);
        case 'social':
          return await this.checkSocialConditions(userAddress, chain, conditions);
        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking task completion:', error);
      return false;
    }
  }

  // Check protocol related tasks
  private async checkProtocolConditions(userAddress: string, chain: string, conditions: any): Promise<boolean> {
    if (conditions.protocol_address) {
      // Query user interactions with the protocol from database
      const protocolInteractions = await db
        .select()
        .from(user_protocols)
        .where(and(
          eq(user_protocols.user_address, userAddress),
          eq(user_protocols.chain, chain),
          eq(user_protocols.protocol_address, conditions.protocol_address)
        ));

      if (protocolInteractions.length > 0) {
        const interaction = protocolInteractions[0];
        return interaction.interaction_count >= (conditions.min_interactions || 1);
      }
    }
    return false;
  }

  // Check volume tasks
  private async checkVolumeConditions(userAddress: string, chain: string, conditions: any): Promise<boolean> {
    if (conditions.total_volume_apt) {
      // Check APT trading volume
      const volumeData = await db
        .select()
        .from(user_protocols)
        .where(and(
          eq(user_protocols.user_address, userAddress),
          eq(user_protocols.chain, chain),
          eq(user_protocols.protocol_address, conditions.protocol_address || '')
        ));

      let totalVolume = 0;
      for (const data of volumeData) {
        totalVolume += Number(data.total_volume);
      }

      return totalVolume >= conditions.total_volume_apt;
    }

    if (conditions.total_volume_usd) {
      // Check USD trading volume (need to fetch from API or calculate)
      // Need to handle based on actual data source
      return false;
    }

    return false;
  }

  // Check frequency tasks
  private async checkFrequencyConditions(userAddress: string, chain: string, conditions: any): Promise<boolean> {
    if (conditions.consecutive_days) {
      const activityData = await db
        .select()
        .from(user_activities)
        .where(and(
          eq(user_activities.user_address, userAddress),
          eq(user_activities.chain, chain)
        ));

      if (activityData.length > 0) {
        return activityData[0].longest_streak >= conditions.consecutive_days;
      }
    }
    return false;
  }

  // Check complexity tasks
  private async checkComplexityConditions(userAddress: string, chain: string, conditions: any): Promise<boolean> {
    if (conditions.required_operations) {
      const transactions = await db
        .select()
        .from(user_transactions)
        .where(and(
          eq(user_transactions.user_address, userAddress),
          eq(user_transactions.chain, chain)
        ));

      const uniqueOperations = new Set(transactions.map(tx => tx.operation_type));
      const requiredOps = new Set(conditions.required_operations as string[]);

      // Check if all required operations are included
      for (const op of requiredOps) {
        if (!uniqueOperations.has(op as string)) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  // Check social tasks
  private async checkSocialConditions(userAddress: string, chain: string, conditions: any): Promise<boolean> {
    if (conditions.has_ens) {
      const socialData = await db
        .select()
        .from(user_social_data)
        .where(and(
          eq(user_social_data.user_address, userAddress),
          eq(user_social_data.chain, chain)
        ));

      if (socialData.length > 0) {
        return socialData[0].has_ens === conditions.has_ens;
      }
    }
    return false;
  }

  // Update task progress
  async updateTaskProgress(userAddress: string, chain: string, taskId: number, progress: number): Promise<void> {
    try {
      const task = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);

      if (task.length === 0) {
        throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
      }

      const targetProgress = this.calculateTargetProgress(task[0]);
      const isCompleted = progress >= targetProgress;

      await db
        .insert(user_task_progress)
        .values({
          user_address: userAddress,
          chain,
          task_id: taskId,
          current_progress: progress,
          target_progress: targetProgress,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date() : null,
          progress_data: { progress, timestamp: new Date() },
        })
        .onConflictDoUpdate({
          target: [user_task_progress.user_address, user_task_progress.chain, user_task_progress.task_id],
          set: {
            current_progress: progress,
            is_completed: isCompleted,
            completed_at: isCompleted ? new Date() : user_task_progress.completed_at,
            updated_at: new Date(),
          },
        });

      if (isCompleted) {
        await this.completeTask(userAddress, chain, taskId);
      }
    } catch (error) {
      console.error('Error updating task progress:', error);
      throw new HttpException('Failed to update task progress', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Calculate target progress
  private calculateTargetProgress(task: any): number {
    const conditions = task.conditions as any;
    
    switch (task.category) {
      case 'protocol':
        return conditions.min_interactions || 1;
      case 'volume':
        return conditions.total_volume_apt || conditions.total_volume_usd || 1;
      case 'frequency':
        return conditions.consecutive_days || 1;
      case 'complexity':
        return conditions.required_operations?.length || 1;
      case 'social':
        return 1;
      default:
        return 1;
    }
  }

  // Complete task and give rewards
  async completeTask(userAddress: string, chain: string, taskId: number): Promise<TaskCompletionResult> {
    try {
      const task = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);

      if (task.length === 0) {
        throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
      }

      const taskData = task[0];

      // Check if already completed
      const existingCompletion = await db
        .select()
        .from(task_completions)
        .where(and(
          eq(task_completions.user_address, userAddress),
          eq(task_completions.chain, chain),
          eq(task_completions.task_id, taskId)
        ))
        .limit(1);

      if (existingCompletion.length > 0 && taskData.max_rewards === 1) {
        return {
          success: false,
          taskId,
          pointsEarned: 0,
          message: 'Task already completed',
        };
      }

      // Add points
      await this.addPoints(userAddress, chain, taskId, taskData.reward_points, taskData.protocol_address, taskData.protocol_name);

      // Record task completion
      const now = new Date();
      await db
        .insert(task_completions)
        .values({
          user_address: userAddress,
          chain,
          task_id: taskId,
          completion_count: 1,
          first_completed_at: now,
          last_completed_at: now,
          completion_data: { completed_at: now, reward_points: taskData.reward_points },
        })
        .onConflictDoUpdate({
          target: [task_completions.user_address, task_completions.chain, task_completions.task_id],
          set: {
            completion_count: sql`${task_completions.completion_count} + 1`,
            last_completed_at: now,
            updated_at: new Date(),
          },
        });

      return {
        success: true,
        taskId,
        pointsEarned: taskData.reward_points,
        message: 'Task completed successfully',
      };
    } catch (error) {
      console.error('Error completing task:', error);
      throw new HttpException('Failed to complete task', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Add points
  private async addPoints(userAddress: string, chain: string, taskId: number, points: number, protocolAddress?: string, protocolName?: string): Promise<void> {
    try {
      // Update user points
      await db
        .insert(user_points)
        .values({
          user_address: userAddress,
          chain,
          protocol_address: protocolAddress,
          protocol_name: protocolName,
          total_points: points,
          available_points: points,
          claimed_points: 0,
        })
        .onConflictDoUpdate({
          target: [user_points.user_address, user_points.chain, user_points.protocol_address],
          set: {
            total_points: sql`${user_points.total_points} + ${points}`,
            available_points: sql`${user_points.available_points} + ${points}`,
            last_updated: new Date(),
            updated_at: new Date(),
          },
        });

      // Record point transaction
      await db.insert(point_transactions).values({
        user_address: userAddress,
        chain,
        task_id: taskId,
        points,
        transaction_type: PointTransactionType.EARNED,
        description: `Earned ${points} points for completing task`,
        metadata: { task_id: taskId, earned_at: new Date() },
      });
    } catch (error) {
      console.error('Error adding points:', error);
      throw error;
    }
  }

  // Get user points
  async getUserPoints(userAddress: string, chain: string, protocolAddress?: string): Promise<UserPoints> {
    try {
      const whereConditions = [
        eq(user_points.user_address, userAddress),
        eq(user_points.chain, chain)
      ];
      
      if (protocolAddress) {
        whereConditions.push(eq(user_points.protocol_address, protocolAddress));
      } else {
        whereConditions.push(eq(user_points.protocol_address, null));
      }

      const points = await db
        .select()
        .from(user_points)
        .where(and(...whereConditions))
        .limit(1);

      if (points.length === 0) {
        return {
          totalPoints: 0,
          availablePoints: 0,
          claimedPoints: 0,
          lastUpdated: new Date(),
        };
      }

      const pointData = points[0];
      return {
        totalPoints: pointData.total_points,
        availablePoints: pointData.available_points,
        claimedPoints: pointData.claimed_points,
        lastUpdated: pointData.last_updated,
      };
    } catch (error) {
      console.error('Error fetching user points:', error);
      throw new HttpException('Failed to fetch user points', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Claim point rewards
  async claimPoints(userAddress: string, chain: string, points: number, protocolAddress?: string): Promise<boolean> {
    try {
      const userPoints = await this.getUserPoints(userAddress, chain, protocolAddress);

      if (userPoints.availablePoints < points) {
        throw new HttpException('Insufficient available points', HttpStatus.BAD_REQUEST);
      }

      // Update user points
      const whereConditions = [
        eq(user_points.user_address, userAddress),
        eq(user_points.chain, chain)
      ];
      
      if (protocolAddress) {
        whereConditions.push(eq(user_points.protocol_address, protocolAddress));
      } else {
        whereConditions.push(eq(user_points.protocol_address, null));
      }

      await db
        .update(user_points)
        .set({
          available_points: userPoints.availablePoints - points,
          claimed_points: userPoints.claimedPoints + points,
          last_updated: new Date(),
          updated_at: new Date(),
        })
        .where(and(...whereConditions));

      // Record point transaction
      await db.insert(point_transactions).values({
        user_address: userAddress,
        chain,
        points,
        transaction_type: PointTransactionType.CLAIMED,
        description: `Claimed ${points} points`,
        metadata: { claimed_at: new Date() },
      });

      return true;
    } catch (error) {
      console.error('Error claiming points:', error);
      throw new HttpException('Failed to claim points', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get user total points across all protocols
  async getUserTotalPoints(userAddress: string, chain: string): Promise<UserPoints> {
    try {
      const points = await db
        .select({
          total_points: sql<number>`SUM(${user_points.total_points})`,
          available_points: sql<number>`SUM(${user_points.available_points})`,
          claimed_points: sql<number>`SUM(${user_points.claimed_points})`,
          last_updated: sql<Date>`MAX(${user_points.last_updated})`,
        })
        .from(user_points)
        .where(and(
          eq(user_points.user_address, userAddress),
          eq(user_points.chain, chain)
        ));

      if (points.length === 0 || !points[0].total_points) {
        return {
          totalPoints: 0,
          availablePoints: 0,
          claimedPoints: 0,
          lastUpdated: new Date(),
        };
      }

      const pointData = points[0];
      return {
        totalPoints: pointData.total_points || 0,
        availablePoints: pointData.available_points || 0,
        claimedPoints: pointData.claimed_points || 0,
        lastUpdated: pointData.last_updated || new Date(),
      };
    } catch (error) {
      console.error('Error fetching user total points:', error);
      throw new HttpException('Failed to fetch user total points', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get user points by protocol
  async getUserPointsByProtocol(userAddress: string, chain: string): Promise<Array<{protocolAddress: string | null, protocolName: string | null, points: UserPoints}>> {
    try {
      const points = await db
        .select({
          protocol_address: user_points.protocol_address,
          protocol_name: user_points.protocol_name,
          total_points: user_points.total_points,
          available_points: user_points.available_points,
          claimed_points: user_points.claimed_points,
          last_updated: user_points.last_updated,
        })
        .from(user_points)
        .where(and(
          eq(user_points.user_address, userAddress),
          eq(user_points.chain, chain)
        ));

      return points.map(point => ({
        protocolAddress: point.protocol_address,
        protocolName: point.protocol_name,
        points: {
          totalPoints: point.total_points || 0,
          availablePoints: point.available_points || 0,
          claimedPoints: point.claimed_points || 0,
          lastUpdated: point.last_updated || new Date(),
        }
      }));
    } catch (error) {
      console.error('Error fetching user points by protocol:', error);
      throw new HttpException('Failed to fetch user points by protocol', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Create task
  async createTask(createTaskDto: CreateTaskDto): Promise<any> {
    try {
      const [task] = await db
        .insert(tasks)
        .values({
          ...createTaskDto,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      return task;
    } catch (error) {
      console.error('Error creating task:', error);
      throw new HttpException('Failed to create task', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Update task
  async updateTask(taskId: number, updateTaskDto: UpdateTaskDto): Promise<any> {
    try {
      const [task] = await db
        .update(tasks)
        .set({
          ...updateTaskDto,
          updated_at: new Date(),
        })
        .where(eq(tasks.id, taskId))
        .returning();

      if (!task) {
        throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
      }

      return task;
    } catch (error) {
      console.error('Error updating task:', error);
      throw new HttpException('Failed to update task', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
