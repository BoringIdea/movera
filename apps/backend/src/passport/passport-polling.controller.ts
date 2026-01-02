import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PassportPollingService } from './passport-polling.service';
import { ResponseUtil } from '../common/utils/response.util';

@ApiTags('Passport Polling')
@Controller('api/v1/passport/polling')
export class PassportPollingController {
  constructor(private readonly passportPollingService: PassportPollingService) {}

  @Post('trigger')
  @ApiOperation({
    summary: 'Trigger manual passport score update',
    description: 'Manually trigger the passport score update process for all users',
  })
  @ApiResponse({
    status: 200,
    description: 'Passport score update triggered successfully',
  })
  async triggerUpdate(): Promise<any> {
    try {
      await this.passportPollingService.handlePassportScoreUpdate();
      return ResponseUtil.success(null, 'Passport score update triggered successfully');
    } catch (error) {
      return ResponseUtil.error('Failed to trigger passport score update', error.message);
    }
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get polling service status',
    description: 'Get the current status of the passport polling service',
  })
  @ApiResponse({
    status: 200,
    description: 'Polling service status retrieved successfully',
  })
  async getStatus(): Promise<any> {
    try {
      // Here you can add status check logic
      return ResponseUtil.success({
        service: 'passport-polling',
        status: 'running',
        lastUpdate: new Date().toISOString(),
      }, 'Polling service status retrieved successfully');
    } catch (error) {
      return ResponseUtil.error('Failed to get polling service status', error.message);
    }
  }

  @Post('user/:address/update')
  @ApiOperation({
    summary: 'Update specific user passport score',
    description: 'Manually update passport score for a specific user',
  })
  @ApiResponse({
    status: 200,
    description: 'User passport score updated successfully',
  })
  async updateUser(
    @Param('address') address: string,
    @Body() body: { chain: string }
  ): Promise<any> {
    try {
      const { chain } = body;
      await this.passportPollingService.processUser({ user_address: address, chain });
      return ResponseUtil.success(null, `User ${address} passport score updated successfully`);
    } catch (error) {
      return ResponseUtil.error(`Failed to update user ${address} passport score`, error.message);
    }
  }
}
