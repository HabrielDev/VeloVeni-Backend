import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity()
export class Activity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  stravaActivityId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @Column()
  name: string;

  @Column('float')
  distance: number;

  @Column('int')
  movingTime: number;

  @Column('float', { nullable: true })
  elevationGain: number;

  @Column()
  sportType: string;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column('float', { nullable: true })
  startLat: number | null;

  @Column('float', { nullable: true })
  startLng: number | null;

  @Column('text', { nullable: true })
  summaryPolyline: string | null;

  @Column('json', { nullable: true })
  gpsTrack: any; // GeoJSON

  @Column({ default: false })
  qualifying: boolean;

  @Column('text', { nullable: true })
  qualifyingReason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
