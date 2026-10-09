"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const address_controller_1 = require("./interfaces/address.controller");
const address_service_1 = require("./application/address.service");
describe('AddressController', () => {
    it('should be defined', async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            controllers: [address_controller_1.AddressController],
            providers: [
                {
                    provide: address_service_1.AddressService,
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
        const ctrl = moduleRef.get(address_controller_1.AddressController);
        expect(ctrl).toBeDefined();
    });
});
