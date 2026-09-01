import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { db } from './db.js';

/**
 * PrismaService wraps the Prisma Next `db` client and exposes it
 * as a NestJS Injectable. The `db` client from Prisma Next manages
 * its own connection pool, so we only need to handle cleanup on
 * module destroy.
 *
 * Usage in other services: inject PrismaService and access `prisma.db`
 * to run typed queries (e.g., `this.prisma.db.user.findMany()`).
 */
@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly db = db;

  async onModuleDestroy() {
    await this.db.close();
  }
}
