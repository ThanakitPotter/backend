import * as crypto from 'crypto';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSlipDto } from './dto/create-slip.dto.js';
import { UpdateSlipDto } from './dto/update-slip.dto.js';

@Injectable()
export class SlipsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Analyze slip image using Google Gemini AI to automatically extract:
   * - income_amount
   * - tax_deducted
   * - received_date
   */
  async analyzeSlip(imageBase64: string) {
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
        income_amount: 0,
        tax_deducted: 0,
        received_date: today,
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
                text: `You are an AI document analysis specialist for Thai bank transfer slips, payment receipts, invoices, and withholding tax certificates (หนังสือรับรองการหักภาษี ณ ที่จ่าย / 50 ทวิ).
Carefully read and extract the financial data from this image:
1. income_amount: The main transaction amount, total payment amount, or income before tax (float/number).
2. tax_deducted: The withholding tax amount (ภาษีหัก ณ ที่จ่าย). If it is a normal transfer slip with no withholding tax, return 0.
3. received_date: The date of the slip/transaction in ISO format YYYY-MM-DD (e.g., "2026-09-02"). If the year is in Thai Buddhist Era (เช่น 2567, 2568, 2569), convert to Christian Year (2024, 2025, 2026). If date cannot be identified, use current date.

Respond ONLY with valid JSON with NO markdown ticks or extra text:
{
  "income_amount": 0.00,
  "tax_deducted": 0.00,
  "received_date": "YYYY-MM-DD"
}`,
              },
            ],
          },
        ],
      });

      const responseText = response.text?.trim() || '{}';
      const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      return {
        income_amount: Number(parsed.income_amount) || 0,
        tax_deducted: Number(parsed.tax_deducted) || 0,
        received_date: parsed.received_date || new Date().toISOString().split('T')[0],
        ai_detected: true,
      };
    } catch (err: any) {
      console.error('Gemini slip analysis error:', err);
      return {
        income_amount: 0,
        tax_deducted: 0,
        received_date: new Date().toISOString().split('T')[0],
        ai_detected: false,
        error: err.message,
      };
    }
  }

  /**
   * Create a new slip, scoped to the authenticated user.
   */
  async create(userId: string, dto: CreateSlipDto) {
    const slip = await this.prisma.db.orm.public.Slip.create({
      id: crypto.randomUUID(),
      user_id: userId,
      income_amount: Number(dto.income_amount),
      tax_deducted: Number(dto.tax_deducted),
      received_date: (globalThis as any).Temporal.Instant.from(new Date(dto.received_date).toISOString()),
      slip_image_url: dto.slip_image_url,
    });

    return slip;
  }

  /**
   * List all slips belonging to the authenticated user.
   * Data isolation: strictly filtered by user_id.
   */
  async findAll(userId: string) {
    const slips = await this.prisma.db.orm.public.Slip
      .where({ user_id: userId })
      .orderBy((slip) => slip.received_date.desc())
      .all();

    return slips;
  }

  /**
   * Find a single slip by ID, strictly scoped to the authenticated user.
   */
  async findOne(userId: string, slipId: string) {
    const slip = await this.prisma.db.orm.public.Slip
      .where({ id: slipId })
      .first();

    if (!slip) {
      throw new NotFoundException(`Slip with ID "${slipId}" not found`);
    }

    if (slip.user_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return slip;
  }

  /**
   * Update a slip by ID, strictly scoped to the authenticated user.
   */
  async update(userId: string, slipId: string, dto: UpdateSlipDto) {
    // Verify ownership first
    await this.findOne(userId, slipId);

    const data: Record<string, unknown> = {};

    if (dto.income_amount !== undefined) {
      data.income_amount = Number(dto.income_amount);
    }
    if (dto.tax_deducted !== undefined) {
      data.tax_deducted = Number(dto.tax_deducted);
    }
    if (dto.received_date !== undefined) {
      data.received_date = (globalThis as any).Temporal.Instant.from(new Date(dto.received_date).toISOString());
    }
    if (dto.slip_image_url !== undefined) {
      data.slip_image_url = dto.slip_image_url;
    }

    const updatedSlip = await this.prisma.db.orm.public.Slip
      .where({ id: slipId })
      .update(data);

    return updatedSlip;
  }

  /**
   * Delete a slip by ID, strictly scoped to the authenticated user.
   */
  async remove(userId: string, slipId: string) {
    // Verify ownership first
    await this.findOne(userId, slipId);

    await this.prisma.db.orm.public.Slip
      .where({ id: slipId })
      .delete();

    return { deleted: true };
  }

  // ──────────────────────────────────────────────
  // Mock S3 Pre-signed URL generation
  // ──────────────────────────────────────────────

  /**
   * Generates a mock AWS S3 Pre-signed URL for securely viewing the slip image.
   *
   * In production, replace this with actual AWS SDK v3 calls:
   *   const command = new GetObjectCommand({ Bucket, Key });
   *   const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
   */
  async getPresignedImageUrl(userId: string, slipId: string) {
    const slip = await this.findOne(userId, slipId);

    // Mock: simulate a pre-signed URL with expiry timestamp
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour from now
    const mockSignature = Buffer.from(`${slipId}:${expiresAt.toISOString()}`)
      .toString('base64url');

    const presignedUrl =
      `https://tax-summary-bucket.s3.amazonaws.com/${encodeURIComponent(slip.slip_image_url)}` +
      `?X-Amz-Expires=3600` +
      `&X-Amz-Signature=${mockSignature}` +
      `&X-Amz-Date=${expiresAt.toISOString()}`;

    return {
      slip_id: slipId,
      presigned_url: presignedUrl,
      expires_at: expiresAt.toISOString(),
    };
  }
}
