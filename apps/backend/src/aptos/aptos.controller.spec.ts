import { Test, TestingModule } from '@nestjs/testing';
import { AptosController } from './aptos.controller';
import { AptosService } from './aptos.service';

describe('AptosController', () => {
  let controller: AptosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AptosController],
      providers: [AptosService],
    }).compile();

    controller = module.get<AptosController>(AptosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
