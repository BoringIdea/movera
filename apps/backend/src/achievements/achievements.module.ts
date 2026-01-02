import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TaskService } from './task.service';
import { DataSourceService } from './data-source.service';
import { ScheduledTaskService } from './scheduled-task.service';
import { AchievementCalculationService } from './achievement-calculation.service';
import { AchievementsController } from './achievements.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
  ],
  controllers: [AchievementsController],
  providers: [
    TaskService,
    DataSourceService,
    ScheduledTaskService,
    AchievementCalculationService,
  ],
  exports: [
    TaskService,
    DataSourceService,
    ScheduledTaskService,
    AchievementCalculationService,
  ],
})
export class AchievementsModule {}
