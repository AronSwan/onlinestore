import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('addresses')
@Index(['latitude', 'longitude'])
@Index(['country', 'city'])
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  rawAddress: string;

  @Column({ type: 'varchar', length: 500 })
  formattedAddress: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  street: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  houseNumber: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postalCode: string;

  @Column({ type: 'varchar', length: 2 })
  country: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  countryCode?: string;

  @Column({ type: 'decimal', precision: 15, scale: 10, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 15, scale: 10, nullable: true })
  longitude: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  placeId: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  originalAddress?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  osmType?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  osmId?: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  importance?: number;

  @Column({ type: 'varchar', length: 50, default: 'manual' })
  source?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastVerified?: Date;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isValid: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  confidence: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
