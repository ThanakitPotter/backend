import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { SlipsService } from './slips.service.js';
import { CreateSlipDto } from './dto/create-slip.dto.js';
import { UpdateSlipDto } from './dto/update-slip.dto.js';
import { AnalyzeSlipDto } from './dto/analyze-slip.dto.js';

/**
 * All endpoints are protected by JwtAuthGuard.
 * The guard extracts `userId` from the JWT and attaches it to `req.user`.
 * Every service call passes `req.user.userId` to enforce data isolation.
 */
@Controller('slips')
@UseGuards(JwtAuthGuard)
export class SlipsController {
  constructor(private readonly slipsService: SlipsService) {}

  @Post('analyze')
  analyze(@Body() dto: AnalyzeSlipDto) {
    return this.slipsService.analyzeSlip(dto.imageBase64);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateSlipDto) {
    return this.slipsService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.slipsService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.slipsService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSlipDto,
  ) {
    return this.slipsService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.slipsService.remove(req.user.userId, id);
  }

  /**
   * GET /slips/:id/presigned-url
   * Returns a mock S3 pre-signed URL for securely viewing the slip image.
   */
  @Get(':id/presigned-url')
  getPresignedUrl(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.slipsService.getPresignedImageUrl(req.user.userId, id);
  }
}
