import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'users_session' })
@Index(['userId'])
@Index(['expiresAt'])
export class UserSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  userId!: string;

  @Column({ type: 'varchar', length: 255 })
  refreshTokenHash!: string;

  @Column({ type: 'int', default: 0 })
  version!: number;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceInfo!: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
