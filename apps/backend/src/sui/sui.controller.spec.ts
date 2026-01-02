import { Test, TestingModule } from '@nestjs/testing';
import { SuiController } from './sui.controller';
import { SuiService } from './sui.service';

describe('SuiController', () => {
  let controller: SuiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuiController],
      providers: [SuiService],
    }).compile();

    controller = module.get<SuiController>(SuiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
