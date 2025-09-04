import { z } from 'zod';

export const UlidSchema = z.string().min(26).max(26);
export type Ulid = z.infer<typeof UlidSchema>;

export const TimestampSchema = z.number().int().positive();
export type Timestamp = z.infer<typeof TimestampSchema>;

export const TraceIdSchema = z.string().min(1);
export type TraceId = z.infer<typeof TraceIdSchema>;

export interface BaseEntity {
  id: Ulid;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface VersionedEntity extends BaseEntity {
  version: string;
}

export interface AuthoredEntity extends BaseEntity {
  author: string;
}
