import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity()
export class Territory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ unique: true })
  userId: number;

  /** Array of "lat.xx,lng.xx" tile keys representing conquered grid cells */
  @Column('simple-json', { nullable: true })
  tiles: string[];

  @Column('int', { default: 0 })
  tileCount: number;

  /** Approximate area in km² (tileCount × ~0.81 km²) */
  @Column('float', { default: 0 })
  areaKm2: number;

  @Column({ default: '#FC4C02' })
  color: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
