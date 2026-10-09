import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AddressService } from './address.service';
import { Address } from './entities/address.entity';
import { AddressValidationService, ValidationResult } from './services/address-validation.service';
import { NominatimService } from './services/nominatim.service';
import { AddressFormattingService } from './services/address-formatting.service';
import { AddressCacheService } from './services/address-cache.service';

describe('AddressService Integration', () => {
  let service: AddressService;
  let repository: Repository<Address>;
  let validationService: AddressValidationService;
  let cacheService: AddressCacheService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        NOMINATIM_URL: 'https://nominatim.openstreetmap.org',
        NOMINATIM_USER_AGENT: 'TestApp/1.0',
      };
      return (config as any)[key] || defaultValue;
    }),
  };

  // Mock AddressCacheService
  const mockAddressCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    getGeocodeCache: jest.fn(),
    cacheGeocodeResult: jest.fn(),
    getReverseCache: jest.fn(),
    cacheReverseResult: jest.fn(),
    cacheFailedResult: jest.fn(),
    cleanupExpiredCache: jest.fn(),
    getStats: jest.fn(),
    clear: jest.fn(),
    getCacheStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressService,
        AddressValidationService,
        NominatimService,
        AddressFormattingService,
        {
          provide: AddressCacheService,
          useValue: mockAddressCacheService,
        },
        {
          provide: getRepositoryToken(Address),
          useValue: mockRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AddressService>(AddressService);
    repository = module.get<Repository<Address>>(getRepositoryToken(Address));
    validationService = module.get<AddressValidationService>(AddressValidationService);
    cacheService = module.get<AddressCacheService>(AddressCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(validationService).toBeDefined();
    expect(cacheService).toBeDefined();
  });

  describe('createAddress', () => {
    it('should create and validate a Chinese address', async () => {
      const mockAddress = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        originalAddress: '北京市朝阳区建国门外大街1号',
        formattedAddress: '中国 北京市 朝阳区 建国门外大街 1号',
        country: 'CN',
        isValid: true,
        confidence: 0.95,
      };

      mockRepository.create.mockReturnValue(mockAddress);
      mockRepository.save.mockResolvedValue(mockAddress);
      mockAddressCacheService.get.mockResolvedValue(null);
      mockAddressCacheService.set.mockResolvedValue(undefined);

      const result = await service.createAddress({
        address: '北京市朝阳区建国门外大街1号',
        countryCode: 'CN',
      });

      expect(result).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should handle US address format', async () => {
      const mockAddress = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        originalAddress: '1600 Pennsylvania Avenue NW, Washington, DC 20500',
        formattedAddress: '1600 Pennsylvania Avenue NW\nWashington, DC 20500\nUnited States',
        country: 'US',
        countryCode: 'US',
        isValid: true,
        confidence: 0.98,
      };

      mockRepository.create.mockReturnValue(mockAddress);
      mockRepository.save.mockResolvedValue(mockAddress);
      mockAddressCacheService.get.mockResolvedValue(null);
      mockAddressCacheService.set.mockResolvedValue(undefined);

      const result = await service.createAddress({
        address: '1600 Pennsylvania Avenue NW, Washington, DC 20500',
        countryCode: 'US',
      });

      expect(result).toBeDefined();
      expect(result.countryCode).toBe('US');
    });
  });

  describe('geocode', () => {
    it('should geocode address and cache result', async () => {
      const address = '北京市朝阳区建国门外大街1号';
      const mockResults = [
        {
          place_id: '12345',
          licence: 'Data © OpenStreetMap contributors',
          osm_type: 'way',
          osm_id: '234567',
          lat: '39.9042',
          lon: '116.4074',
          display_name: '中国 北京市 朝阳区 建国门外大街 1号',
          address: {
            country: '中国',
            country_code: 'cn',
            state: '北京市',
            city: '朝阳区',
            road: '建国门外大街',
            house_number: '1号',
          },
          boundingbox: ['39.9042', '39.9042', '116.4074', '116.4074'],
        },
      ];

      mockAddressCacheService.getGeocodeCache.mockResolvedValue(null);
      mockAddressCacheService.cacheGeocodeResult.mockResolvedValue(undefined);

      // Mock NominatimService
      const mockNominatimService = {
        geocode: jest.fn().mockResolvedValue(mockResults),
        healthCheck: jest.fn().mockResolvedValue(true),
      };

      // Replace the NominatimService in the module
      const module = await Test.createTestingModule({
        providers: [
          AddressService,
          AddressValidationService,
          {
            provide: NominatimService,
            useValue: mockNominatimService,
          },
          AddressFormattingService,
          {
            provide: AddressCacheService,
            useValue: mockAddressCacheService,
          },
          {
            provide: getRepositoryToken(Address),
            useValue: mockRepository,
          },
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<AddressService>(AddressService);

      const result = await service.geocode(address, { countryCode: 'CN' });

      expect(result).toEqual(mockResults);
      expect(mockAddressCacheService.getGeocodeCache).toHaveBeenCalledWith(address, 'CN');
      expect(mockAddressCacheService.cacheGeocodeResult).toHaveBeenCalledWith(
        address,
        mockResults,
        'CN',
      );
    });

    it('should return cached geocode result', async () => {
      const address = '北京市朝阳区建国门外大街1号';
      const mockResults = [
        {
          place_id: '12345',
          display_name: '中国 北京市 朝阳区 建国门外大街 1号',
          lat: '39.9042',
          lon: '116.4074',
        },
      ];

      mockAddressCacheService.getGeocodeCache.mockResolvedValue(mockResults);

      const result = await service.geocode(address, { countryCode: 'CN' });

      expect(result).toEqual(mockResults);
      expect(mockAddressCacheService.getGeocodeCache).toHaveBeenCalledWith(address, 'CN');
      expect(mockAddressCacheService.cacheGeocodeResult).not.toHaveBeenCalled();
    });
  });

  describe('AddressFormattingService', () => {
    let formattingService: AddressFormattingService;

    beforeEach(() => {
      formattingService = new AddressFormattingService();
    });

    it('should format Chinese address correctly', async () => {
      const components = {
        country: '中国',
        state: '北京市',
        city: '朝阳区',
        road: '建国门外大街',
        house_number: '1号',
      };

      const formatted = await formattingService.formatAddress(components, 'CN');
      expect(formatted).toContain('中国');
      expect(formatted).toContain('北京市');
      expect(formatted).toContain('朝阳区');
    });

    it('should format US address correctly', async () => {
      const components = {
        house_number: '1600',
        road: 'Pennsylvania Avenue NW',
        city: 'Washington',
        state: 'DC',
        postcode: '20500',
        country: 'United States',
      };

      const formatted = await formattingService.formatAddress(components, 'US');
      expect(formatted).toContain('1600 Pennsylvania Avenue Nw');
      expect(formatted).toContain('Washington, Dc 20500');
    });
  });

  describe('AddressValidationService Integration', () => {
    it('should validate address using validation service', async () => {
      const address = '北京市朝阳区建国门外大街1号';
      const countryCode = 'CN';

      const validationResult: ValidationResult = {
        isValid: true,
        confidence: 0.95,
        issues: [],
        suggestions: [],
        components: {
          hasStreet: true,
          hasCity: true,
          hasPostalCode: false,
          hasCountry: true,
        },
      };

      jest.spyOn(validationService, 'validateAddress').mockResolvedValue(validationResult);

      const result = await service.validateAddress(address, countryCode);

      expect(result).toBeDefined();
      expect(validationService.validateAddress).toHaveBeenCalledWith(address, countryCode);
      expect(result.isValid).toBe(true);
    });

    it('should handle invalid address', async () => {
      const address = 'invalid address';
      const countryCode = 'CN';

      const validationResult: ValidationResult = {
        isValid: false,
        confidence: 0.2,
        issues: ['Address is too short'],
        suggestions: ['Include street name and number'],
        components: {
          hasStreet: false,
          hasCity: false,
          hasPostalCode: false,
          hasCountry: false,
        },
      };

      jest.spyOn(validationService, 'validateAddress').mockResolvedValue(validationResult);

      const result = await service.validateAddress(address, countryCode);

      expect(result).toBeDefined();
      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.suggestions).toHaveLength(1);
    });
  });

  describe('reverseGeocode', () => {
    it('should reverse geocode coordinates and cache result', async () => {
      const lat = 39.9042;
      const lon = 116.4074;
      const mockResult = {
        place_id: '12345',
        licence: 'Data © OpenStreetMap contributors',
        osm_type: 'way',
        osm_id: '234567',
        lat: '39.9042',
        lon: '116.4074',
        display_name: '中国 北京市 朝阳区 建国门外大街 1号',
        address: {
          country: '中国',
          country_code: 'cn',
          state: '北京市',
          city: '朝阳区',
          road: '建国门外大街',
          house_number: '1号',
        },
      };

      mockAddressCacheService.getReverseCache.mockResolvedValue(null);
      mockAddressCacheService.cacheReverseResult.mockResolvedValue(undefined);

      // Mock NominatimService
      const mockNominatimService = {
        reverseGeocode: jest.fn().mockResolvedValue(mockResult),
        healthCheck: jest.fn().mockResolvedValue(true),
      };

      // Replace the NominatimService in the module
      const module = await Test.createTestingModule({
        providers: [
          AddressService,
          AddressValidationService,
          {
            provide: NominatimService,
            useValue: mockNominatimService,
          },
          AddressFormattingService,
          {
            provide: AddressCacheService,
            useValue: mockAddressCacheService,
          },
          {
            provide: getRepositoryToken(Address),
            useValue: mockRepository,
          },
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<AddressService>(AddressService);

      const result = await service.reverseGeocode(lat, lon);

      expect(result).toEqual(mockResult);
      expect(mockAddressCacheService.getReverseCache).toHaveBeenCalledWith(lat, lon);
      expect(mockAddressCacheService.cacheReverseResult).toHaveBeenCalledWith(lat, lon, mockResult);
    });

    it('should return cached reverse geocode result', async () => {
      const lat = 39.9042;
      const lon = 116.4074;
      const mockResult = {
        place_id: '12345',
        display_name: '中国 北京市 朝阳区 建国门外大街 1号',
        lat: '39.9042',
        lon: '116.4074',
      };

      mockAddressCacheService.getReverseCache.mockResolvedValue(mockResult);

      const result = await service.reverseGeocode(lat, lon);

      expect(result).toEqual(mockResult);
      expect(mockAddressCacheService.getReverseCache).toHaveBeenCalledWith(lat, lon);
      expect(mockAddressCacheService.cacheReverseResult).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      const address = {
        address: '北京市朝阳区建国门外大街1号',
        countryCode: 'CN',
      };

      mockRepository.create.mockReturnValue(address);
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.createAddress(address)).rejects.toThrow('Database error');
    });

    it('should handle validation service errors gracefully', async () => {
      const address = '北京市朝阳区建国门外大街1号';
      const countryCode = 'CN';

      jest
        .spyOn(validationService, 'validateAddress')
        .mockRejectedValue(new Error('Validation error'));

      await expect(service.validateAddress(address, countryCode)).rejects.toThrow(
        'Validation error',
      );
    });
  });

  describe('batchGeocode', () => {
    it('should batch geocode addresses', async () => {
      const addresses = [
        { address: '北京市朝阳区建国门外大街1号', countryCode: 'CN' },
        { address: '1600 Pennsylvania Avenue NW, Washington, DC 20500', countryCode: 'US' },
      ];

      // Mock cache miss to ensure addresses are queued
      mockAddressCacheService.getGeocodeCache.mockResolvedValue(null);

      const result = await service.batchGeocode(addresses);

      expect(result).toHaveLength(2);
      expect(result[0]).toContain('queued:');
      expect(result[1]).toContain('queued:');
    });
  });

  describe('healthCheck and getStats', () => {
    it('should perform health check', async () => {
      // Mock NominatimService
      const mockNominatimService = {
        healthCheck: jest.fn().mockResolvedValue(true),
      };

      // Replace the NominatimService in the module
      const module = await Test.createTestingModule({
        providers: [
          AddressService,
          AddressValidationService,
          {
            provide: NominatimService,
            useValue: mockNominatimService,
          },
          AddressFormattingService,
          {
            provide: AddressCacheService,
            useValue: mockAddressCacheService,
          },
          {
            provide: getRepositoryToken(Address),
            useValue: mockRepository,
          },
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<AddressService>(AddressService);

      const result = await service.healthCheck();
      expect(result).toBe(true);
    });

    it('should get service stats', async () => {
      const mockCacheStats = {
        redisKeys: 10,
        dbEntries: 5,
        failedEntries: 1,
      };

      mockAddressCacheService.getCacheStats.mockResolvedValue(mockCacheStats);

      // Mock NominatimService
      const mockNominatimService = {
        healthCheck: jest.fn().mockResolvedValue(true),
      };

      // Replace the NominatimService in the module
      const module = await Test.createTestingModule({
        providers: [
          AddressService,
          AddressValidationService,
          {
            provide: NominatimService,
            useValue: mockNominatimService,
          },
          AddressFormattingService,
          {
            provide: AddressCacheService,
            useValue: mockAddressCacheService,
          },
          {
            provide: getRepositoryToken(Address),
            useValue: mockRepository,
          },
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<AddressService>(AddressService);

      const result = await service.getStats();
      expect(result.cacheStats).toEqual(mockCacheStats);
      expect(result.serviceHealth).toBe(true);
    });
  });
});
