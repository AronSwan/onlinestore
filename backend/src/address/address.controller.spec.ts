import { Test } from '@nestjs/testing';
import { AddressController } from './interfaces/address.controller';
import { AddressService } from './application/address.service';

describe('AddressController', () => {
  it('should be defined', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AddressController],
      providers: [
        {
          provide: AddressService,
          useValue: {
            listByUserId: jest.fn().mockResolvedValue([]),
            save: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            setDefault: jest.fn(),
          },
        },
      ],
    }).compile();
    const ctrl = moduleRef.get(AddressController);
    expect(ctrl).toBeDefined();
  });
});
