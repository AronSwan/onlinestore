import { AddressService } from '../application/address.service';
import { ReceiveAddressRespDTO, ReceiveAddressSaveCommand, ReceiveAddressUpdateCommand } from '../application/dto/receive-address.dto';
export declare class AddressController {
    private readonly service;
    constructor(service: AddressService);
    list(customerUserId: string): Promise<ReceiveAddressRespDTO[]>;
    save(body: ReceiveAddressSaveCommand): Promise<void>;
    update(body: ReceiveAddressUpdateCommand): Promise<void>;
    remove(customerUserId: string, receiveAddressId: string): Promise<void>;
    setDefault(receiveAddressId: string, userId: string): Promise<void>;
}
