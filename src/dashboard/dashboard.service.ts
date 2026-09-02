import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string) {
    const now = new Date();

    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [weekly, monthly, yearly] = await Promise.all([
      this.getAggregateForDate(userId, startOfWeek),
      this.getAggregateForDate(userId, startOfMonth),
      this.getAggregateForDate(userId, startOfYear),
    ]);

    return {
      weekly: { income: weekly.income?.toString() ?? '0', tax: weekly.tax?.toString() ?? '0' },
      monthly: { income: monthly.income?.toString() ?? '0', tax: monthly.tax?.toString() ?? '0' },
      yearly: { income: yearly.income?.toString() ?? '0', tax: yearly.tax?.toString() ?? '0' },
    };
  }

  private async getAggregateForDate(userId: string, date: Date) {
    const instant = (globalThis as any).Temporal.Instant.from(date.toISOString());
    const agg = await this.prisma.db.orm.public.Slip
      .where({ user_id: userId })
      .where((slip) => slip.received_date.gte(instant))
      .aggregate((a) => ({
        income: a.sum('income_amount'),
        tax: a.sum('tax_deducted'),
      }));
    return agg;
  }
}
