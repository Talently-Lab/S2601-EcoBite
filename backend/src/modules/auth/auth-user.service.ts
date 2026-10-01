// NOTE: Implements user persistence and account management operations.

import { Injectable } from '@nestjs/common';

import bcrypt from 'bcryptjs';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { AppException } from '../../common/errors/app.exception';

import { ErrorCode, OrmKnownCodes } from '../../common/errors/error-codes';

import { CreateUserDto } from './dto/create-user.dto';

import type { UpdateUserBody } from './dto/update-user.dto';

const userSafeSelect = {
  id: true,
  name: true,
  email: true,
  registeredAt: true,
} satisfies Prisma.UserSelect;

export type UserSafe = Prisma.UserGetPayload<{
  select: typeof userSafeSelect;
}>;

const BCRYPT_ROUNDS = 10;

function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === OrmKnownCodes.PrismaUniqueConstraint
  );
}

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<UserSafe> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    try {
      return await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          registeredAt: new Date(),
        },
        select: userSafeSelect,
      });
    } catch (err: unknown) {
      if (isPrismaUniqueViolation(err)) {
        throw new AppException(ErrorCode.USR_EMAIL_TAKEN);
      }

      throw err;
    }
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
  }): Promise<UserSafe[]> {
    const skip = params?.skip ?? 0;
    const take = Math.min(params?.take ?? 50, 100);

    return this.prisma.user.findMany({
      skip,
      take,
      orderBy: {
        registeredAt: 'desc',
      },
      select: userSafeSelect,
    });
  }

  async findOne(id: string): Promise<UserSafe> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSafeSelect,
    });

    if (!user) {
      throw new AppException(ErrorCode.USR_NOT_FOUND);
    }

    return user;
  }

  async update(id: string, patch: UpdateUserBody): Promise<UserSafe> {
    await this.ensureExists(id);

    const data: Prisma.UserUpdateInput = {};

    if (patch.name !== undefined) {
      data.name = patch.name;
    }

    if (patch.email !== undefined) {
      data.email = patch.email;
    }

    if (patch.password !== undefined) {
      data.passwordHash = await bcrypt.hash(patch.password, BCRYPT_ROUNDS);
    }

    if (Object.keys(data).length === 0) {
      return this.findOne(id);
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        select: userSafeSelect,
      });
    } catch (err: unknown) {
      if (isPrismaUniqueViolation(err)) {
        throw new AppException(ErrorCode.USR_EMAIL_TAKEN);
      }

      throw err;
    }
  }

  async remove(id: string): Promise<UserSafe> {
    return this.findOne(id);
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });

    if (!exists) {
      throw new AppException(ErrorCode.USR_NOT_FOUND);
    }
  }
}
