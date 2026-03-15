import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  stravaId: string;

  @Column()
  firstname: string;

  @Column()
  lastname: string;

  @Column({ nullable: true })
  profilePicture: string;

  @Column({ nullable: true })
  stravaAccessToken: string;

  @Column({ nullable: true })
  stravaRefreshToken: string;

  @Column({ type: 'timestamp', nullable: true })
  stravaTokenExpiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}