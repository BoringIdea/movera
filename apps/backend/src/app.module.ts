import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MovementModule } from './movement/movement.module';
import { SuiModule } from './sui/sui.module';
import { AptosModule } from './aptos/aptos.module';
import { PassportModule } from './passport/passport.module';
import { AchievementsModule } from './achievements/achievements.module';

@Module({
  imports: [
    // MovementModule,
    SuiModule,
    AptosModule,
    PassportModule,
    AchievementsModule,
    ConfigModule.forRoot({
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env.local', '.env'],
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
