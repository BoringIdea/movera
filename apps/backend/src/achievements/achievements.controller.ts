import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Param, 
  Query, 
  Body, 
  HttpException, 
  HttpStatus,
  UseGuards 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { TaskService } from './task.service';
import { DataSourceService } from './data-source.service';
import { ScheduledTaskService } from './scheduled-task.service';
import { AchievementCalculationService } from './achievement-calculation.service';
import { 
  CreateTaskDto, 
  UpdateTaskDto, 
  CreateDataSourceDto, 
  UpdateDataSourceDto,
  CreateScheduledTaskDto,
  UpdateScheduledTaskDto,
  ClaimPointsDto,
  VerifyUserTasksDto,
  BatchProcessUsersDto
} from './dto';

@ApiTags('Achievements')
@Controller('api/v1/achievements')
export class AchievementsController {
  constructor(
    private readonly taskService: TaskService,
    private readonly dataSourceService: DataSourceService,
    private readonly scheduledTaskService: ScheduledTaskService,
    private readonly achievementCalculationService: AchievementCalculationService,
  ) {}

  // ========== Task related interfaces ==========

  @ApiOperation({ summary: 'Get task list', description: 'Get all available tasks for a specific chain' })
  @ApiQuery({ name: 'chain', required: true, description: 'Chain name (aptos, sui, movement)', example: 'aptos' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved task list' })
  @ApiResponse({ status: 400, description: 'Chain parameter is required' })
  @Get('tasks')
  async getTasks(@Query('chain') chain: string) {
    try {
      if (!chain) {
        throw new HttpException('Chain parameter is required', HttpStatus.BAD_REQUEST);
      }
      return await this.taskService.getAvailableTasks(chain);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Get user task progress', description: 'Get task completion progress for a specific user' })
  @ApiParam({ name: 'userAddress', required: true, description: 'User wallet address', example: '0x123...' })
  @ApiQuery({ name: 'chain', required: true, description: 'Chain name', example: 'aptos' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved user task progress' })
  @Get('user/:userAddress/tasks')
  async getUserTasks(
    @Param('userAddress') userAddress: string,
    @Query('chain') chain: string
  ) {
    try {
      if (!chain) {
        throw new HttpException('Chain parameter is required', HttpStatus.BAD_REQUEST);
      }
      return await this.taskService.getUserTaskProgress(userAddress, chain);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Get user points', description: 'Get total, available, and claimed points for a user' })
  @ApiParam({ name: 'userAddress', required: true, description: 'User wallet address' })
  @ApiQuery({ name: 'chain', required: true, description: 'Chain name' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved user points' })
  @Get('user/:userAddress/points')
  async getUserPoints(
    @Param('userAddress') userAddress: string,
    @Query('chain') chain: string
  ) {
    try {
      if (!chain) {
        throw new HttpException('Chain parameter is required', HttpStatus.BAD_REQUEST);
      }
      return await this.taskService.getUserPoints(userAddress, chain);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Claim points reward', description: 'Claim available points as rewards' })
  @ApiParam({ name: 'userAddress', required: true, description: 'User wallet address' })
  @ApiBody({ type: ClaimPointsDto, description: 'Claim points request body' })
  @ApiResponse({ status: 200, description: 'Successfully claimed points' })
  @ApiResponse({ status: 400, description: 'Insufficient available points' })
  @Post('user/:userAddress/claim-points')
  async claimPoints(
    @Param('userAddress') userAddress: string,
    @Body() claimPointsDto: ClaimPointsDto
  ) {
    try {
      return await this.taskService.claimPoints(userAddress, claimPointsDto.chain, claimPointsDto.points);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ========== Data source management interfaces ==========

  @ApiOperation({ summary: 'Get data source list', description: 'Get all active data sources for a chain' })
  @ApiQuery({ name: 'chain', required: true, description: 'Chain name' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved data sources' })
  @Get('admin/data-sources')
  async getDataSources(@Query('chain') chain: string) {
    try {
      if (!chain) {
        throw new HttpException('Chain parameter is required', HttpStatus.BAD_REQUEST);
      }
      return await this.dataSourceService.getDataSources(chain);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Create data source', description: 'Create a new data source (database or API)' })
  @ApiBody({ type: CreateDataSourceDto, description: 'Data source configuration' })
  @ApiResponse({ status: 201, description: 'Data source created successfully' })
  @Post('admin/data-sources')
  async createDataSource(@Body() createDataSourceDto: CreateDataSourceDto) {
    try {
      return await this.dataSourceService.addDataSource(createDataSourceDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Update data source', description: 'Update an existing data source configuration' })
  @ApiParam({ name: 'sourceId', required: true, description: 'Data source ID' })
  @ApiBody({ type: UpdateDataSourceDto })
  @ApiResponse({ status: 200, description: 'Data source updated successfully' })
  @Put('admin/data-sources/:sourceId')
  async updateDataSource(
    @Param('sourceId') sourceId: string,
    @Body() updateDataSourceDto: UpdateDataSourceDto
  ) {
    try {
      const id = parseInt(sourceId);
      if (isNaN(id)) {
        throw new HttpException('Invalid source ID', HttpStatus.BAD_REQUEST);
      }
      return await this.dataSourceService.updateDataSource(id, updateDataSourceDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Test data source connection', description: 'Test API data source connection' })
  @ApiParam({ name: 'sourceId', required: true, description: 'Data source ID' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  @Post('admin/data-sources/:sourceId/test')
  async testDataSource(@Param('sourceId') sourceId: string) {
    try {
      const id = parseInt(sourceId);
      if (isNaN(id)) {
        throw new HttpException('Invalid source ID', HttpStatus.BAD_REQUEST);
      }
      const isValid = await this.dataSourceService.validateApiConnection(id);
      return { success: isValid };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Manual sync data source', description: 'Manually trigger data synchronization for a user' })
  @ApiParam({ name: 'sourceId', required: true, description: 'Data source ID' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        user_address: { type: 'string', example: '0x123...' },
        sync_type: { type: 'string', enum: ['incremental', 'full'], default: 'incremental' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Sync completed successfully' })
  @Post('admin/data-sources/:sourceId/sync')
  async syncDataSource(
    @Param('sourceId') sourceId: string,
    @Body() body: { user_address: string; sync_type?: string }
  ) {
    try {
      const id = parseInt(sourceId);
      if (isNaN(id)) {
        throw new HttpException('Invalid source ID', HttpStatus.BAD_REQUEST);
      }
      return await this.dataSourceService.syncDataSource(
        id, 
        body.user_address, 
        body.sync_type || 'incremental'
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ========== Scheduled task management interfaces ==========

  @ApiOperation({ summary: 'Get scheduled task status', description: 'Get status of all scheduled tasks' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved task status' })
  @Get('admin/scheduled-tasks')
  async getScheduledTasks() {
    try {
      return await this.scheduledTaskService.getTaskStatus();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Manual trigger task', description: 'Manually trigger a scheduled task execution' })
  @ApiParam({ name: 'taskName', required: true, description: 'Task name', example: 'achievement_check_daily' })
  @ApiResponse({ status: 200, description: 'Task triggered successfully' })
  @Post('admin/scheduled-tasks/:taskName/trigger')
  async triggerTask(@Param('taskName') taskName: string) {
    try {
      return await this.scheduledTaskService.triggerTask(taskName);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Update task config', description: 'Update scheduled task configuration' })
  @ApiParam({ name: 'taskName', required: true, description: 'Task name' })
  @ApiBody({ schema: { type: 'object', example: { batch_size: 100, parallel_workers: 5 } } })
  @ApiResponse({ status: 200, description: 'Task config updated successfully' })
  @Put('admin/scheduled-tasks/:taskName/config')
  async updateTaskConfig(
    @Param('taskName') taskName: string,
    @Body() config: any
  ) {
    try {
      await this.scheduledTaskService.updateTaskConfig(taskName, config);
      return { success: true, message: 'Task config updated successfully' };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Start/stop task', description: 'Enable or disable a scheduled task' })
  @ApiParam({ name: 'taskName', required: true, description: 'Task name' })
  @ApiBody({ schema: { type: 'object', properties: { is_active: { type: 'boolean' } }, example: { is_active: true } } })
  @ApiResponse({ status: 200, description: 'Task toggled successfully' })
  @Post('admin/scheduled-tasks/:taskName/toggle')
  async toggleTask(
    @Param('taskName') taskName: string,
    @Body() body: { is_active: boolean }
  ) {
    try {
      await this.scheduledTaskService.toggleTask(taskName, body.is_active);
      return { success: true, message: `Task ${taskName} ${body.is_active ? 'started' : 'stopped'}` };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ========== Management interfaces ==========

  @ApiOperation({ summary: 'Create task', description: 'Create a new achievement task' })
  @ApiBody({ type: CreateTaskDto, description: 'Task configuration' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @Post('admin/tasks')
  async createTask(@Body() createTaskDto: CreateTaskDto) {
    try {
      return await this.taskService.createTask(createTaskDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Update task', description: 'Update an existing achievement task' })
  @ApiParam({ name: 'taskId', required: true, description: 'Task ID' })
  @ApiBody({ type: UpdateTaskDto })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @Put('admin/tasks/:taskId')
  async updateTask(
    @Param('taskId') taskId: string,
    @Body() updateTaskDto: UpdateTaskDto
  ) {
    try {
      const id = parseInt(taskId);
      if (isNaN(id)) {
        throw new HttpException('Invalid task ID', HttpStatus.BAD_REQUEST);
      }
      return await this.taskService.updateTask(id, updateTaskDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Get user achievement stats', description: 'Get comprehensive achievement statistics for a user' })
  @ApiParam({ name: 'userAddress', required: true, description: 'User wallet address' })
  @ApiQuery({ name: 'chain', required: true, description: 'Chain name' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved user stats' })
  @Get('admin/users/:userAddress/stats')
  async getUserStats(
    @Param('userAddress') userAddress: string,
    @Query('chain') chain: string
  ) {
    try {
      if (!chain) {
        throw new HttpException('Chain parameter is required', HttpStatus.BAD_REQUEST);
      }

      const [progress, points] = await Promise.all([
        this.taskService.getUserTaskProgress(userAddress, chain),
        this.taskService.getUserPoints(userAddress, chain)
      ]);

      const completedTasks = progress.filter(p => p.isCompleted);
      const totalTasks = progress.length;

      return {
        userAddress,
        chain,
        totalTasks,
        completedTasks: completedTasks.length,
        completionRate: totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0,
        totalPoints: points.totalPoints,
        availablePoints: points.availablePoints,
        claimedPoints: points.claimedPoints,
        lastUpdated: points.lastUpdated,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Manual verify user tasks', description: 'Manually verify and update user task completion status' })
  @ApiParam({ name: 'userAddress', required: true, description: 'User wallet address' })
  @ApiBody({ type: VerifyUserTasksDto, description: 'Verification options' })
  @ApiResponse({ status: 200, description: 'Verification completed successfully' })
  @Post('admin/users/:userAddress/verify')
  async verifyUserTasks(
    @Param('userAddress') userAddress: string,
    @Body() verifyDto: VerifyUserTasksDto
  ) {
    try {
      return await this.achievementCalculationService.manualVerifyUserTasks(userAddress, verifyDto.chain);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Batch process user data', description: 'Process achievement data for multiple users in batch' })
  @ApiBody({ type: BatchProcessUsersDto, description: 'Batch processing request' })
  @ApiResponse({ status: 200, description: 'Batch processing completed successfully' })
  @Post('admin/users/batch-process')
  async batchProcessUsers(@Body() batchDto: BatchProcessUsersDto) {
    try {
      await this.achievementCalculationService.batchProcessUserData(
        batchDto.user_addresses,
        batchDto.chain
      );
      return { 
        success: true, 
        message: `Batch processed ${batchDto.user_addresses.length} users`,
        processedCount: batchDto.user_addresses.length
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Get data source sync logs', description: 'Get synchronization logs for a data source' })
  @ApiParam({ name: 'sourceId', required: true, description: 'Data source ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of logs to return', example: 100 })
  @ApiResponse({ status: 200, description: 'Successfully retrieved sync logs' })
  @Get('admin/data-sources/:sourceId/logs')
  async getSyncLogs(
    @Param('sourceId') sourceId: string,
    @Query('limit') limit?: string
  ) {
    try {
      const id = parseInt(sourceId);
      if (isNaN(id)) {
        throw new HttpException('Invalid source ID', HttpStatus.BAD_REQUEST);
      }
      const limitNum = limit ? parseInt(limit) : 100;
      return await this.dataSourceService.getSyncLogs(id, limitNum);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Process user data', description: 'Process user data and update achievements (support specified data source)' })
  @ApiParam({ name: 'userAddress', required: true, description: 'User wallet address' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        chain: { type: 'string', example: 'aptos' },
        data_source: { type: 'string', enum: ['database', 'api', 'all'], example: 'all' }
      },
      required: ['chain']
    }
  })
  @ApiResponse({ status: 200, description: 'User data processed successfully' })
  @Post('admin/users/:userAddress/process')
  async processUserData(
    @Param('userAddress') userAddress: string,
    @Body() body: { chain: string; data_source?: string }
  ) {
    try {
      await this.achievementCalculationService.processUserData(
        userAddress,
        body.chain,
        body.data_source
      );
      return { 
        success: true, 
        message: `Processed user data for ${userAddress}`,
        userAddress,
        chain: body.chain,
        dataSource: body.data_source || 'all'
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
