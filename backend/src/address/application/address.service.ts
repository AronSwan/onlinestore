import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ReceiveAddressEntity } from '../infrastructure/entities/receive-address.entity';
import {
  ReceiveAddressSaveCommand,
  ReceiveAddressUpdateCommand,
  ReceiveAddressRespDTO,
} from './dto/receive-address.dto';

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(ReceiveAddressEntity) private readonly repo: Repository<ReceiveAddressEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async listByUserId(userId: string): Promise<ReceiveAddressRespDTO[]> {
    const rows = await this.repo.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
    return rows as unknown as ReceiveAddressRespDTO[];
  }

  async save(cmd: ReceiveAddressSaveCommand): Promise<void> {
    await this.dataSource.transaction(async manager => {
      if (cmd.isDefault) {
        await manager.update(
          ReceiveAddressEntity,
          { userId: cmd.userId, isDefault: true },
          { isDefault: false },
        );
      }
      const entity = manager.create(ReceiveAddressEntity, { ...cmd });
      await manager.save(entity);
    });
  }

  async update(cmd: ReceiveAddressUpdateCommand): Promise<void> {
    await this.dataSource.transaction(async manager => {
      const existed = await manager.findOne(ReceiveAddressEntity, {
        where: { id: cmd.id, userId: cmd.userId },
      });
      if (!existed) throw new NotFoundException('Address not found');
      if (cmd.isDefault) {
        await manager.update(
          ReceiveAddressEntity,
          { userId: cmd.userId, isDefault: true },
          { isDefault: false },
        );
      }
      await manager.update(ReceiveAddressEntity, { id: cmd.id }, { ...cmd });
    });
  }

  async remove(userId: string, addressId: string): Promise<void> {
    await this.repo.delete({ id: addressId, userId });
  }

  async setDefault(userId: string, addressId: string): Promise<void> {
    await this.dataSource.transaction(async manager => {
      await manager.update(ReceiveAddressEntity, { userId, isDefault: true }, { isDefault: false });
      const found = await manager.findOne(ReceiveAddressEntity, {
        where: { id: addressId, userId },
      });
      if (!found) throw new NotFoundException('Address not found');
      await manager.update(ReceiveAddressEntity, { id: addressId }, { isDefault: true });
    });
  }
}
