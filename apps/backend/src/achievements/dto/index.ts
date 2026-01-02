import { IsString, IsNumber, IsBoolean, IsOptional, IsObject, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Base Type Definitions
export enum TaskCategory {
  PROTOCOL = 'protocol',
  VOLUME = 'volume',
  FREQUENCY = 'frequency',
  COMPLEXITY = 'complexity',
  SOCIAL = 'social',
}

export enum TaskType {
  SINGLE = 'single',
  CUMULATIVE = 'cumulative',
  MILESTONE = 'milestone',
  TIME_BASED = 'time_based',
}

export enum DataSourceType {
  DATABASE = 'database',
  API = 'api',
  HYBRID = 'hybrid',
}

export enum ScheduledTaskType {
  ACHIEVEMENT_CHECK = 'achievement_check',
  DATA_SYNC = 'data_sync',
  CLEANUP = 'cleanup',
}

export enum PointTransactionType {
  EARNED = 'earned',
  CLAIMED = 'claimed',
  EXPIRED = 'expired',
  ADJUSTED = 'adjusted',
}

// Task Related DTOs
export class CreateTaskDto {
  @ApiProperty({ description: 'Unique task code', example: 'panora_swap_200_apt' })
  @IsString()
  task_code: string;

  @ApiProperty({ description: 'Task name', example: 'Panora Big Trader' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TaskCategory, description: 'Task category' })
  @IsEnum(TaskCategory)
  category: TaskCategory;

  @ApiProperty({ enum: TaskType, description: 'Task type' })
  @IsEnum(TaskType)
  task_type: TaskType;

  @ApiPropertyOptional({ description: 'Protocol contract address' })
  @IsOptional()
  @IsString()
  protocol_address?: string;

  @ApiPropertyOptional({ description: 'Protocol name' })
  @IsOptional()
  @IsString()
  protocol_name?: string;

  @ApiProperty({ description: 'Task completion conditions (JSON)', example: { total_volume_apt: 200 } })
  @IsObject()
  conditions: any;

  @ApiProperty({ description: 'Reward points', example: 300 })
  @IsNumber()
  reward_points: number;

  @ApiPropertyOptional({ description: 'Maximum rewards (1=once, -1=unlimited)', example: 1 })
  @IsOptional()
  @IsNumber()
  max_rewards?: number;

  @ApiPropertyOptional({ description: 'Difficulty level (1-5)', example: 2 })
  @IsOptional()
  @IsNumber()
  difficulty_level?: number;

  @ApiPropertyOptional({ description: 'Is task active', example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Task start date' })
  @IsOptional()
  start_date?: Date;

  @ApiPropertyOptional({ description: 'Task end date' })
  @IsOptional()
  end_date?: Date;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;

  @IsOptional()
  @IsEnum(TaskType)
  task_type?: TaskType;

  @IsOptional()
  @IsString()
  protocol_address?: string;

  @IsOptional()
  @IsString()
  protocol_name?: string;

  @IsOptional()
  @IsObject()
  conditions?: any;

  @IsOptional()
  @IsNumber()
  reward_points?: number;

  @IsOptional()
  @IsNumber()
  max_rewards?: number;

  @IsOptional()
  @IsNumber()
  difficulty_level?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  start_date?: Date;

  @IsOptional()
  end_date?: Date;
}

// Data Source Related DTOs
export class CreateDataSourceDto {
  @ApiProperty({ description: 'Data source name', example: 'decibel_api' })
  @IsString()
  source_name: string;

  @ApiProperty({ enum: DataSourceType, description: 'Data source type' })
  @IsEnum(DataSourceType)
  source_type: DataSourceType;

  @ApiProperty({ description: 'Chain name', example: 'aptos' })
  @IsString()
  chain: string;

  @ApiPropertyOptional({ description: 'Protocol contract address' })
  @IsOptional()
  @IsString()
  protocol_address?: string;

  @ApiPropertyOptional({ description: 'Protocol name' })
  @IsOptional()
  @IsString()
  protocol_name?: string;

  @ApiPropertyOptional({ description: 'API endpoint URL' })
  @IsOptional()
  @IsString()
  api_endpoint?: string;

  @ApiPropertyOptional({ description: 'API authentication type', example: 'api_key' })
  @IsOptional()
  @IsString()
  api_auth_type?: string;

  @ApiPropertyOptional({ description: 'API authentication configuration' })
  @IsOptional()
  @IsObject()
  api_auth_config?: any;

  @ApiPropertyOptional({ description: 'Data mapping rules' })
  @IsOptional()
  @IsObject()
  data_mapping?: any;

  @ApiPropertyOptional({ description: 'Update frequency in seconds', example: 300 })
  @IsOptional()
  @IsNumber()
  update_frequency?: number;

  @ApiPropertyOptional({ description: 'Is data source active', example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateDataSourceDto {
  @IsOptional()
  @IsString()
  source_name?: string;

  @IsOptional()
  @IsEnum(DataSourceType)
  source_type?: DataSourceType;

  @IsOptional()
  @IsString()
  chain?: string;

  @IsOptional()
  @IsString()
  protocol_address?: string;

  @IsOptional()
  @IsString()
  protocol_name?: string;

  @IsOptional()
  @IsString()
  api_endpoint?: string;

  @IsOptional()
  @IsString()
  api_auth_type?: string;

  @IsOptional()
  @IsObject()
  api_auth_config?: any;

  @IsOptional()
  @IsObject()
  data_mapping?: any;

  @IsOptional()
  @IsNumber()
  update_frequency?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

// Scheduled Task Related DTOs
export class CreateScheduledTaskDto {
  @IsString()
  task_name: string;

  @IsEnum(ScheduledTaskType)
  task_type: ScheduledTaskType;

  @IsString()
  cron_expression: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsObject()
  config?: any;
}

export class UpdateScheduledTaskDto {
  @IsOptional()
  @IsString()
  task_name?: string;

  @IsOptional()
  @IsEnum(ScheduledTaskType)
  task_type?: ScheduledTaskType;

  @IsOptional()
  @IsString()
  cron_expression?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsObject()
  config?: any;
}

// User Related DTOs
export class ClaimPointsDto {
  @ApiProperty({ description: 'Chain name', example: 'aptos' })
  @IsString()
  chain: string;

  @ApiProperty({ description: 'Points to claim', example: 100 })
  @IsNumber()
  points: number;
}

export class VerifyUserTasksDto {
  @ApiProperty({ description: 'Chain name', example: 'aptos' })
  @IsString()
  chain: string;

  @ApiPropertyOptional({ description: 'Force refresh user data', example: true })
  @IsOptional()
  @IsBoolean()
  force_refresh?: boolean;

  @ApiPropertyOptional({ description: 'Data sources to use', example: ['database', 'api'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  data_sources?: string[];
}

export class BatchProcessUsersDto {
  @ApiProperty({ description: 'Array of user wallet addresses', example: ['0x123...', '0x456...'] })
  @IsArray()
  @IsString({ each: true })
  user_addresses: string[];

  @ApiProperty({ description: 'Chain name', example: 'aptos' })
  @IsString()
  chain: string;

  @ApiPropertyOptional({ description: 'Data source to use', example: 'all' })
  @IsOptional()
  @IsString()
  data_source?: string;
}

// Response Types
export interface TaskCompletionResult {
  success: boolean;
  taskId: number;
  pointsEarned: number;
  message: string;
}

export interface VerificationResult {
  success: boolean;
  tasksCompleted: number;
  pointsEarned: number;
  details: any;
}

export interface TaskExecutionResult {
  success: boolean;
  executionTime: number;
  recordsProcessed: number;
  message: string;
}

export interface ScheduledTaskStatus {
  taskName: string;
  isActive: boolean;
  lastExecuted: Date | null;
  nextExecution: Date | null;
  executionCount: number;
  successCount: number;
  errorCount: number;
  lastError: string | null;
}

export interface UserPoints {
  totalPoints: number;
  availablePoints: number;
  claimedPoints: number;
  lastUpdated: Date;
}

export interface UserTaskProgress {
  taskId: number;
  taskName: string;
  currentProgress: number;
  targetProgress: number;
  isCompleted: boolean;
  completedAt: Date | null;
  rewardClaimed: boolean;
  progressData: any;
}

export interface TransactionData {
  txHash: string;
  userAddress: string;
  protocolAddress: string;
  protocolName: string;
  amount: number;
  timestamp: Date;
  operationType: string;
  tokenSymbol?: string;
  success: boolean;
}

export interface ProtocolInfo {
  address: string;
  name: string;
  category: string;
  interactionCount: number;
  totalVolume: number;
  lastInteraction: Date;
}

export interface UserData {
  userAddress: string;
  chain: string;
  totalVolume: number;
  protocols: ProtocolInfo[];
  transactions: TransactionData[];
  socialData: any;
}
