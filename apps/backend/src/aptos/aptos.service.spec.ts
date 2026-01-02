import { Test, TestingModule } from '@nestjs/testing';
import { AptosService } from './aptos.service';

describe('AptosService', () => {
  let service: AptosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AptosService],
    }).compile();

    service = module.get<AptosService>(AptosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
