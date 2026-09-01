import * as crypto from 'crypto';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSlipDto } from './dto/create-slip.dto.js';
import { UpdateSlipDto } from './dto/update-slip.dto.js';

@Injectable()
export class SlipsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new slip, scoped to the authenticated user.
   */
  async create(userId: string, dto: CreateSlipDto) {
    const slip = await this.prisma.db.orm.public.Slip.create({
      id: crypto.randomUUID(),
      user_id: userId,
      income_amount: Number(dto.income_amount),
      tax_deducted: Number(dto.tax_deducted),
      received_date: new Date(dto.received_date),
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
      data.received_date = new Date(dto.received_date);
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
