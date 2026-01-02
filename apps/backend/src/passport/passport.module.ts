import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PassportController } from './passport.controller';
import { PassportService } from './passport.service';
import { PassportPollingService } from './passport-polling.service';
import { PassportPollingController } from './passport-polling.controller';
import { PassportAttestationService } from './passport-attestation.service';
import { GraphQLService } from '../aptos/api/graphql';
import { AptosService } from '../aptos/aptos.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [PassportController, PassportPollingController],
  providers: [
    PassportService,
    PassportPollingService,
    PassportAttestationService,
    AptosService,
    {
      provide: GraphQLService,
      useFactory: () => {
        const graphqlUrl = process.env.APTOS_GRAPHQL_ENDPOINT_URL;
        const adminSecret = process.env.HASURA_ADMIN_SECRET;
        
        if (!graphqlUrl) {
          console.error('APTOS_GRAPHQL_ENDPOINT_URL environment variable is not set');
          console.error('Please set the following environment variables:');
          console.error('  APTOS_GRAPHQL_ENDPOINT_URL=https://your-hasura-instance.hasura.app/v1/graphql');
          console.error('  HASURA_ADMIN_SECRET=your_hasura_admin_secret_here');
          throw new Error('APTOS_GRAPHQL_ENDPOINT_URL is not set. Please check your environment variables.');
        }
        
        console.log('Initializing GraphQLService with URL:', graphqlUrl);
        return new GraphQLService(graphqlUrl, adminSecret);
      },
    },
  ],
  exports: [PassportService],
})
export class PassportModule {}
