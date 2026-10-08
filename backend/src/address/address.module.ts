import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { AddressController } from './address.controller';
import { AddressService } from './address.service';
import { NominatimService } from './services/nominatim.service';
import { AddressFormattingService } from './services/address-formatting.service';
import { AddressValidationService } from './services/address-validation.service';
import { AddressCacheService } from './services/address-cache.service';
import { AddressQueueService } from './services/address-queue.service';
import { AddressProcessor } from './processors/address.processor';
import { Address } from './entities/address.entity';
import addressConfig from './config/address.config';

@Module({
  imports: [
    ConfigModule.forFeature(addressConfig),
    TypeOrmModule.forFeature([Address]),
    BullModule.registerQueue({
      name: 'address-geocoding',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
  ],
  controllers: [AddressController],
  providers: [
    AddressService,
    NominatimService,
    AddressFormattingService,
    AddressValidationService,
    AddressCacheService,
    AddressQueueService,
    AddressProcessor,
  ],
  exports: [
    AddressService,
    AddressValidationService,
    NominatimService,
    AddressCacheService,
    AddressQueueService,
  ],
})
export class AddressModule {}
