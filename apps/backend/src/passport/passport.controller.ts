import { Controller, Get, Post, Query, Body, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { PassportService } from './passport.service';
import { PassportAttestationService } from './passport-attestation.service';
import { CheckUserDto, RegisterUserDto, GetUserPassportDataDto } from './dto/passport.dto';
import { ResponseUtil } from '../common/utils/response.util';
import { ApiResponse as IApiResponse } from '../common';

@ApiTags('Passport Service')
@Controller('api/v1/passport')
export class PassportController {
  constructor(
    private readonly passportService: PassportService,
    private readonly passportAttestationService: PassportAttestationService
  ) {}

  @Get('check')
  @ApiOperation({
    summary: 'Check if user is registered',
    description: 'Check if a user address is registered in the passport system',
  })
  @ApiQuery({ name: 'address', description: 'User wallet address' })
  @ApiQuery({ name: 'chain', description: 'Blockchain network (aptos, sui, movement)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User registration status',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            exists: { type: 'boolean' },
            address: { type: 'string' },
            chain: { type: 'string' },
          },
        },
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async checkUser(@Query() query: CheckUserDto): Promise<IApiResponse<any>> {
    try {
      const { address, chain } = query;
      
      if (!address || !chain) {
        throw new HttpException('Address and chain are required', HttpStatus.BAD_REQUEST);
      }

      const exists = await this.passportService.checkUserExists(address, chain);
      
      return ResponseUtil.success({
        exists,
        address,
        chain,
      }, 'User registration status retrieved successfully');
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to check user registration',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Register a new user in the passport system with signature verification',
  })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            address: { type: 'string' },
            chain: { type: 'string' },
          },
        },
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async registerUser(@Body() body: RegisterUserDto): Promise<IApiResponse<any>> {
    try {
      const { address, chain, message, signature } = body;
      
      if (!address || !chain || !message || !signature) {
        throw new HttpException('All fields are required', HttpStatus.BAD_REQUEST);
      }

      // Verify signature
      const isValid = await this.passportService.verifySignature(address, message, signature, chain);
      
      if (!isValid) {
        throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
      }

      // Check if user already exists
      const exists = await this.passportService.checkUserExists(address, chain);
      if (exists) {
        throw new HttpException('User already registered', HttpStatus.CONFLICT);
      }

      // Register user
      await this.passportService.registerUser(address, chain);
      
      return ResponseUtil.success({
        address,
        chain,
      }, 'User registered successfully');
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to register user',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('data')
  @ApiOperation({
    summary: 'Get user Passport data',
    description: 'Get Passport attestation data for a specific user address',
  })
  @ApiQuery({ name: 'recipient', description: 'User wallet address' })
  @ApiQuery({ name: 'chain', description: 'Blockchain network (currently only aptos is supported)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User Passport data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ref_attestation: { type: 'string' },
              address: { type: 'string' },
              attestor: { type: 'string' },
              data: { type: 'string' },
              expiration_time: { type: 'string' },
              recipient: { type: 'string' },
              revocation_time: { type: 'string' },
              revokable: { type: 'boolean' },
              schema: { type: 'string' },
              time: { type: 'string' },
              tx_hash: { type: 'string' },
            },
          },
        },
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async getUserPassportData(@Query() query: GetUserPassportDataDto): Promise<IApiResponse<any>> {
    try {
      const { recipient, chain } = query;
      
      if (!recipient || !chain) {
        throw new HttpException('Recipient and chain are required', HttpStatus.BAD_REQUEST);
      }

      const passportData = await this.passportService.getUserPassportData(recipient, chain);
      
      return ResponseUtil.success(passportData, 'User Passport data retrieved successfully');
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get user Passport data',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('calculate-score')
  @ApiOperation({
    summary: 'Calculate user Passport score',
    description: 'Calculate comprehensive Passport score for a user based on multiple dimensions',
  })
  @ApiQuery({ name: 'user', description: 'User wallet address' })
  @ApiQuery({ name: 'chain', description: 'Blockchain network (currently only aptos is supported)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User Passport score calculated successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            totalScore: { type: 'number', description: 'Total score (0-100)' },
            grade: { type: 'string', description: 'Grade (F, D, C, B, A, S, S+)' },
            breakdown: {
              type: 'object',
              properties: {
                longevity: { type: 'number', description: 'Account age score (0-10)' },
                balance: { type: 'number', description: 'Account balance score (0-10)' },
                activity: { type: 'number', description: 'Activity frequency score (0-20)' },
                diversity: { type: 'number', description: 'Protocol diversity score (0-18)' },
                volume: { type: 'number', description: 'Transaction volume score (0-15)' },
                complexity: { type: 'number', description: 'Interaction complexity score (0-12)' },
                social: { type: 'number', description: 'Social reputation score (0-15)' },
              },
            },
          },
        },
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async calculatePassportScore(@Query() query: { user: string; chain: string }): Promise<IApiResponse<any>> {
    try {
      const { user, chain } = query;
      
      if (!user || !chain) {
        throw new HttpException('User address and chain are required', HttpStatus.BAD_REQUEST);
      }

      const scoreData = await this.passportService.calculateUserPassportScore(user, chain);
      
      return ResponseUtil.success(scoreData, 'User Passport score calculated successfully');
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to calculate Passport score',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('overview')
  @ApiOperation({
    summary: 'Get user Passport overview data',
    description: 'Get comprehensive overview data for Passport dashboard including score, stats, and quick metrics',
  })
  @ApiQuery({ name: 'user', description: 'User wallet address' })
  @ApiQuery({ name: 'chain', description: 'Blockchain network (currently only aptos is supported)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Passport overview data retrieved successfully',
  })
  async getPassportOverview(@Query() query: { user: string; chain: string }): Promise<IApiResponse<any>> {
    try {
      const { user, chain } = query;
      if (!user || !chain) {
        throw new HttpException('User address and chain are required', HttpStatus.BAD_REQUEST);
      }
      const overviewData = await this.passportService.getPassportOverview(user, chain);
      return ResponseUtil.success(overviewData, 'Passport overview data retrieved successfully');
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get Passport overview',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('details')
  @ApiOperation({
    summary: 'Get user Passport detailed data',
    description: 'Get detailed Passport data including score history, badges, on-chain activity, and optimization tips',
  })
  @ApiQuery({ name: 'user', description: 'User wallet address' })
  @ApiQuery({ name: 'chain', description: 'Blockchain network (currently only aptos is supported)' })
  @ApiQuery({ name: 'timeRange', description: 'Time range for data (7d, 30d, 90d, 1y)', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Passport detailed data retrieved successfully',
  })
  async getPassportDetails(@Query() query: { user: string; chain: string; timeRange?: string }): Promise<IApiResponse<any>> {
    try {
      const { user, chain, timeRange = '30d' } = query;
      if (!user || !chain) {
        throw new HttpException('User address and chain are required', HttpStatus.BAD_REQUEST);
      }
      const detailsData = await this.passportService.getPassportDetails(user, chain, timeRange);
      return ResponseUtil.success(detailsData, 'Passport detailed data retrieved successfully');
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get Passport details',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('attestation/create')
  @ApiOperation({
    summary: 'Create passport attestation for user',
    description: 'Manually create an on-chain attestation for a user\'s passport score',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userAddress: { type: 'string', description: 'User wallet address' },
        chain: { type: 'string', description: 'Blockchain network', default: 'aptos' }
      },
      required: ['userAddress']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Attestation created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            userAddress: { type: 'string' },
            txHash: { type: 'string' },
            attestationAddress: { type: 'string' }
          }
        }
      }
    }
  })
  async createPassportAttestation(@Body() body: { userAddress: string; chain?: string }) {
    try {
      const { userAddress, chain = 'aptos' } = body;
      
      if (!userAddress) {
        throw new HttpException('User address is required', HttpStatus.BAD_REQUEST);
      }

      await this.passportAttestationService.createAttestationForUser(userAddress, chain);
      
      return ResponseUtil.success(
        { userAddress, chain },
        'Passport attestation created successfully'
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create passport attestation',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('attestation/schedule')
  @ApiOperation({
    summary: 'Manually trigger passport attestation scheduling',
    description: 'Manually trigger the scheduled passport attestation process for all eligible users',
  })
  @ApiResponse({
    status: 200,
    description: 'Attestation scheduling triggered successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            processedUsers: { type: 'number' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  })
  async triggerPassportAttestationSchedule() {
    try {
      await this.passportAttestationService.schedulePassportAttestations();
      
      return ResponseUtil.success(
        { 
          processedUsers: 'See logs for details',
          timestamp: new Date().toISOString()
        },
        'Passport attestation scheduling triggered successfully'
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to trigger passport attestation scheduling',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ========== 新增轻量级接口用于渐进式加载 ==========

  @Get('overview/basic')
  @ApiOperation({
    summary: 'Get basic passport overview data',
    description: 'Get lightweight passport overview data including only core score and basic stats for fast initial loading',
  })
  @ApiQuery({ name: 'user', description: 'User wallet address' })
  @ApiQuery({ name: 'chain', description: 'Blockchain network (currently only aptos is supported)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Basic passport overview data retrieved successfully',
  })
  async getPassportOverviewBasic(@Query() query: { user: string; chain: string }): Promise<IApiResponse<any>> {
    try {
      const { user, chain } = query;
      if (!user || !chain) {
        throw new HttpException('User address and chain are required', HttpStatus.BAD_REQUEST);
      }
      const basicData = await this.passportService.getPassportOverviewBasic(user, chain);
      return ResponseUtil.success(basicData, 'Basic passport overview data retrieved successfully');
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get basic passport overview',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('details/score-history')
  @ApiOperation({
    summary: 'Get passport score history',
    description: 'Get passport score history data for chart visualization',
  })
  @ApiQuery({ name: 'user', description: 'User wallet address' })
  @ApiQuery({ name: 'chain', description: 'Blockchain network (currently only aptos is supported)' })
  @ApiQuery({ name: 'timeRange', description: 'Time range for data (7d, 30d, 90d, 1y)', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Passport score history retrieved successfully',
  })
  async getPassportScoreHistory(@Query() query: { user: string; chain: string; timeRange?: string }): Promise<IApiResponse<any>> {
    try {
      const { user, chain, timeRange = '30d' } = query;
      if (!user || !chain) {
        throw new HttpException('User address and chain are required', HttpStatus.BAD_REQUEST);
      }
      const scoreHistory = await this.passportService.getPassportScoreHistory(user, chain, timeRange);
      return ResponseUtil.success(scoreHistory, 'Passport score history retrieved successfully');
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get passport score history',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('details/badges')
  @ApiOperation({
    summary: 'Get passport badges',
    description: 'Get passport badges and achievements data',
  })
  @ApiQuery({ name: 'user', description: 'User wallet address' })
  @ApiQuery({ name: 'chain', description: 'Blockchain network (currently only aptos is supported)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Passport badges retrieved successfully',
  })
  async getPassportBadges(@Query() query: { user: string; chain: string }): Promise<IApiResponse<any>> {
    try {
      const { user, chain } = query;
      if (!user || !chain) {
        throw new HttpException('User address and chain are required', HttpStatus.BAD_REQUEST);
      }
      const badges = await this.passportService.getPassportBadges(user, chain);
      return ResponseUtil.success(badges, 'Passport badges retrieved successfully');
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get passport badges',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('details/activity')
  @ApiOperation({
    summary: 'Get passport activity data',
    description: 'Get recent on-chain activity data',
  })
  @ApiQuery({ name: 'user', description: 'User wallet address' })
  @ApiQuery({ name: 'chain', description: 'Blockchain network (currently only aptos is supported)' })
  @ApiQuery({ name: 'timeRange', description: 'Time range for data (7d, 30d, 90d, 1y)', required: false })
  @ApiQuery({ name: 'limit', description: 'Number of records to return', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Passport activity data retrieved successfully',
  })
  async getPassportActivity(@Query() query: { user: string; chain: string; timeRange?: string; limit?: number }): Promise<IApiResponse<any>> {
    try {
      const { user, chain, timeRange = '30d', limit = 20 } = query;
      if (!user || !chain) {
        throw new HttpException('User address and chain are required', HttpStatus.BAD_REQUEST);
      }
      const activity = await this.passportService.getPassportActivity(user, chain, timeRange, limit);
      return ResponseUtil.success(activity, 'Passport activity data retrieved successfully');
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get passport activity',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('details/protocols')
  @ApiOperation({
    summary: 'Get passport protocol interactions',
    description: 'Get protocol interaction data and optimization tips',
  })
  @ApiQuery({ name: 'user', description: 'User wallet address' })
  @ApiQuery({ name: 'chain', description: 'Blockchain network (currently only aptos is supported)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Passport protocol interactions retrieved successfully',
  })
  async getPassportProtocols(@Query() query: { user: string; chain: string }): Promise<IApiResponse<any>> {
    try {
      const { user, chain } = query;
      if (!user || !chain) {
        throw new HttpException('User address and chain are required', HttpStatus.BAD_REQUEST);
      }
      const protocols = await this.passportService.getPassportProtocols(user, chain);
      return ResponseUtil.success(protocols, 'Passport protocol interactions retrieved successfully');
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get passport protocols',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
