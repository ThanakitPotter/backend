import * as crypto from 'crypto';
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { GoogleLoginDto } from './dto/google-login.dto.js';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.db.orm.User
      .where({ email: dto.email })
      .first();

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const user = await this.prisma.db.orm.User.create({
      id: crypto.randomUUID(),
      email: dto.email,
      password_hash: passwordHash,
    });

    const token = this.generateToken(user.id, user.email);
    return { access_token: token, user: { id: user.id, email: user.email } };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.db.orm.User
      .where({ email: dto.email })
      .first();

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user.id, user.email);
    return { access_token: token, user: { id: user.id, email: user.email } };
  }

  async googleLogin(dto: GoogleLoginDto) {
    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (e) {
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!payload || !payload.email) {
      throw new UnauthorizedException('Invalid Google token payload');
    }

    const email = payload.email;

    let user = await this.prisma.db.orm.User
      .where({ email })
      .first();

    if (!user) {
      user = await this.prisma.db.orm.User.create({
        id: crypto.randomUUID(),
        email,
        password_hash: null,
      });
    }

    const token = this.generateToken(user.id, user.email);
    return { access_token: token, user: { id: user.id, email: user.email } };
  }

  private generateToken(userId: string, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }
}
