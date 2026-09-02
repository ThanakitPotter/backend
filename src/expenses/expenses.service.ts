import * as crypto from 'crypto';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import { UpdateExpenseDto } from './dto/update-expense.dto.js';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Analyze receipt image using Google Gemini AI to automatically extract:
   * - amount
   * - vat_amount
   * - receipt_date
   * - merchant_name
   */
  async analyzeReceipt(imageBase64: string) {
    let cleanBase64 = imageBase64;
    let mimeType = 'image/jpeg';

    if (imageBase64.includes(';base64,')) {
      const parts = imageBase64.split(';base64,');
      const mimeMatch = parts[0].match(/data:(.*?)$/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
      cleanBase64 = parts[1];
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const today = new Date().toISOString().split('T')[0];
      return {
        amount: 0,
        vat_amount: 0,
        receipt_date: today,
        merchant_name: '',
        ai_detected: false,
        message: 'GEMINI_API_KEY is not set.',
      };
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
              {
                text: `You are an OCR and AI parser for Thai receipts and invoices (ใบเสร็จรับเงิน / ใบกำกับภาษี).

Instructions:
1. amount (number):
   - Find the total amount paid (ยอดรวมทั้งสิ้น / ยอดรวม / Total / Total Amount). Remove commas or THB.
2. vat_amount (number):
   - Find the VAT amount (ภาษีมูลค่าเพิ่ม 7% / VAT 7%). If not present, return 0.00.
3. merchant_name (string):
   - Find the name of the store, company, or merchant.
4. receipt_date (string strictly YYYY-MM-DD):
   - Find the date of the receipt. Convert Thai Buddhist Era (พ.ศ.) to Christian Era (ค.ศ.).
   - Example: '11 ก.ค. 69' -> '2026-07-11'.

Return ONLY valid JSON matching this schema:
{
  "amount": 0.00,
  "vat_amount": 0.00,
  "merchant_name": "Store Name",
  "receipt_date": "YYYY-MM-DD"
}`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text?.trim() || '{}';
      const parsed = JSON.parse(responseText);

      return {
        amount: Number(parsed.amount) || 0,
        vat_amount: Number(parsed.vat_amount) || 0,
        merchant_name: parsed.merchant_name || '',
        receipt_date: parsed.receipt_date || new Date().toISOString().split('T')[0],
        ai_detected: true,
      };
    } catch (err: any) {
      console.error('Gemini receipt analysis error:', err);
      return {
        amount: 0,
        vat_amount: 0,
        merchant_name: '',
        receipt_date: new Date().toISOString().split('T')[0],
        ai_detected: false,
        error: err.message,
      };
    }
  }

  async create(userId: string, dto: CreateExpenseDto) {
    const expense = await this.prisma.db.orm.public.Expense.create({
      id: crypto.randomUUID(),
      user_id: userId,
      amount: Number(dto.amount),
      vat_amount: Number(dto.vat_amount || 0),
      merchant_name: dto.merchant_name || null,
      category: dto.category || null,
      receipt_date: (globalThis as any).Temporal.Instant.from(new Date(dto.receipt_date).toISOString()),
      receipt_image_url: dto.receipt_image_url || '',
    });
    return expense;
  }

  async findAll(userId: string) {
    const expenses = await this.prisma.db.orm.public.Expense
      .where({ user_id: userId })
      .orderBy((exp) => exp.receipt_date.desc())
      .all();
    return expenses;
  }

  async findOne(userId: string, expenseId: string) {
    const expense = await this.prisma.db.orm.public.Expense
      .where({ id: expenseId })
      .first();

    if (!expense) {
      throw new NotFoundException(`Expense with ID "${expenseId}" not found`);
    }
    if (expense.user_id !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return expense;
  }

  async update(userId: string, expenseId: string, dto: UpdateExpenseDto) {
    await this.findOne(userId, expenseId);
    const data: Record<string, unknown> = {};

    if (dto.amount !== undefined) data.amount = Number(dto.amount);
    if (dto.vat_amount !== undefined) data.vat_amount = Number(dto.vat_amount);
    if (dto.merchant_name !== undefined) data.merchant_name = dto.merchant_name;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.receipt_date !== undefined) {
      data.receipt_date = (globalThis as any).Temporal.Instant.from(new Date(dto.receipt_date).toISOString());
    }
    if (dto.receipt_image_url !== undefined) {
      data.receipt_image_url = dto.receipt_image_url;
    }

    const updatedExpense = await this.prisma.db.orm.public.Expense
      .where({ id: expenseId })
      .update(data);
    return updatedExpense;
  }

  async remove(userId: string, expenseId: string) {
    await this.findOne(userId, expenseId);
    await this.prisma.db.orm.public.Expense
      .where({ id: expenseId })
      .delete();
    return { deleted: true };
  }

  async getPresignedImageUrl(userId: string, expenseId: string) {
    const expense = await this.findOne(userId, expenseId);
    if (expense.receipt_image_url && (expense.receipt_image_url.startsWith('data:image/') || expense.receipt_image_url.startsWith('http'))) {
      return {
        expense_id: expenseId,
        presigned_url: expense.receipt_image_url,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      };
    }
    const expiresAt = new Date(Date.now() + 3600 * 1000);
    const mockSignature = Buffer.from(`${expenseId}:${expiresAt.toISOString()}`).toString('base64url');
    const presignedUrl =
      `https://tax-summary-bucket.s3.amazonaws.com/${encodeURIComponent(expense.receipt_image_url || 'expense.png')}` +
      `?X-Amz-Expires=3600` +
      `&X-Amz-Signature=${mockSignature}` +
      `&X-Amz-Date=${expiresAt.toISOString()}`;

    return {
      expense_id: expenseId,
      presigned_url: presignedUrl,
      expires_at: expiresAt.toISOString(),
    };
  }
}
