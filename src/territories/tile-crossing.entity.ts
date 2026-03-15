import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('tile_crossing')
export class TileCrossing {
  /** "lat.xx,lng.xx" tile identifier */
  @PrimaryColumn()
  tileKey: string;

  @PrimaryColumn()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** How many qualifying activities of this user cross this tile */
  @Column('int', { default: 0 })
  crossingCount: number;

  /** Date of the most recent activity crossing this tile */
  @Column({ type: 'timestamp' })
  lastCrossedAt: Date;
}
