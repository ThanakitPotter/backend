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
      weekly,
      monthly,
      yearly,
    };
  }

  private async getAggregateForDate(userId: string, date: Date) {
    const instant = (globalThis as any).Temporal.Instant.from(date.toISOString());
    
    const slipAgg = await this.prisma.db.orm.public.Slip
      .where({ user_id: userId })
      .where((slip) => slip.received_date.gte(instant))
      .aggregate((a) => ({
        income: a.sum('income_amount'),
        tax: a.sum('tax_deducted'),
      }));

    const expenseAgg = await this.prisma.db.orm.public.Expense
      .where({ user_id: userId })
      .where((exp) => exp.receipt_date.gte(instant))
      .aggregate((a) => ({
        amount: a.sum('amount'),
        vat: a.sum('vat_amount'),
      }));

    const income = slipAgg.income ?? 0;
    const tax = slipAgg.tax ?? 0;
    const expense = expenseAgg.amount ?? 0;
    const vat = expenseAgg.vat ?? 0;
    const net_profit = income - expense - tax;

    return {
      income: income.toString(),
      tax: tax.toString(),
      expense: expense.toString(),
      vat: vat.toString(),
      net_profit: net_profit.toString(),
    };
  }
}
