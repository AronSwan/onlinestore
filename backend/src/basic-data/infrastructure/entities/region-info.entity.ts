import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'basic_region_info' })
@Index(['level'])
@Index(['parent'])
@Index(['sort'])
export class RegionInfoEntity {
  @PrimaryColumn({ type: 'varchar', length: 12 })
  code!: string;

  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @Column({ type: 'int' })
  level!: number;

  @Column({ type: 'varchar', length: 12, nullable: true })
  parent!: string | null;

  @Column({ type: 'int', default: 0 })
  sort!: number;
}
