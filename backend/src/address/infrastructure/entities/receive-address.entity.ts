import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'users_receive_address' })
@Index(['userId'])
@Index(['userId', 'isDefault'])
export class ReceiveAddressEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  userId!: string;

  @Column({ type: 'varchar', length: 50 })
  userName!: string;

  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  @Column({ type: 'varchar', length: 12 })
  provinceCode!: string;

  @Column({ type: 'varchar', length: 50 })
  provinceName!: string;

  @Column({ type: 'varchar', length: 12 })
  cityCode!: string;

  @Column({ type: 'varchar', length: 50 })
  cityName!: string;

  @Column({ type: 'varchar', length: 12 })
  districtCode!: string;

  @Column({ type: 'varchar', length: 50 })
  districtName!: string;

  @Column({ type: 'varchar', length: 200 })
  detailAddress!: string;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
