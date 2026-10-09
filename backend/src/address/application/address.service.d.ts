import { Repository, DataSource } from 'typeorm';
import { ReceiveAddressEntity } from '../infrastructure/entities/receive-address.entity';
import { ReceiveAddressSaveCommand, ReceiveAddressUpdateCommand, ReceiveAddressRespDTO } from './dto/receive-address.dto';
export declare class AddressService {
    private readonly repo;
    private readonly dataSource;
    constructor(repo: Repository<ReceiveAddressEntity>, dataSource: DataSource);
    listByUserId(userId: string): Promise<ReceiveAddressRespDTO[]>;
    save(cmd: ReceiveAddressSaveCommand): Promise<void>;
    update(cmd: ReceiveAddressUpdateCommand): Promise<void>;
    remove(userId: string, addressId: string): Promise<void>;
    setDefault(userId: string, addressId: string): Promise<void>;
}
