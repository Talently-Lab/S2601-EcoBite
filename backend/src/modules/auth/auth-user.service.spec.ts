// NOTE: Verifies user service persistence and error handling behavior.
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode, OrmKnownCodes } from '../../common/errors/error-codes';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from './auth-user.service';
import { makeUserSafe } from './fixtures/user.fixtures';
import bcrypt from 'bcryptjs';

describe('UserService', () => {
  let service: UserService;
  let prisma: {
    user: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockImplementation(() =>
      Promise.resolve('hashed-password'),
    );
  });

  describe('create', () => {
    it('hashes the password and creates a user without assigning admin privileges', async () => {
      const dto = makeUserSafe();

      prisma.user.create.mockResolvedValue(makeUserSafe());

      await service.create({
        name: dto.name,
        email: dto.email,
        password: 'plain',
      });

      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(bcrypt.hash).toHaveBeenCalledWith('plain', 10);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash: 'hashed-password',
          registeredAt: expect.any(Date),
        },
        select: {
          id: true,
          name: true,
          email: true,
          registeredAt: true,
          role: true,
        },
      });

      const payload = prisma.user.create.mock.calls[0][0];

      expect(payload.data).not.toHaveProperty('role');
      expect(payload.data).not.toHaveProperty('active');
    });

    it('traduce unicidad violada Prisma P2002 a USR_EMAIL_TAKEN', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: OrmKnownCodes.PrismaUniqueConstraint,
          clientVersion: 'test',
        }),
      );

      await expect(
        service.create({
          name: 'A',
          email: 'dup@example.com',
          password: 'p',
        }),
      ).rejects.toMatchObject({
        constructor: AppException,
        code: ErrorCode.USR_EMAIL_TAKEN.code,
      });
    });

    it('rethrows errors that are not P2002', async () => {
      prisma.user.create.mockRejectedValue(new Error('db down'));

      await expect(
        service.create({
          name: 'A',
          email: 'x@example.com',
          password: 'p',
        }),
      ).rejects.toThrow('db down');
    });
  });

  describe('findAll', () => {
    it('applies the take=100 cap when a higher value is requested', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.findAll({ skip: 0, take: 500 });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 100,
        }),
      );
    });

    it('uses default pagination values when no parameters are provided', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.findAll();

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
        }),
      );
    });

    it('orders users by registration date descending', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.findAll();

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            registeredAt: 'desc',
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('lanza USR_NOT_FOUND si no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('550e8400-e29b-41d4-a716-446655440099'),
      ).rejects.toMatchObject({
        code: ErrorCode.USR_NOT_FOUND.code,
      });
    });
  });

  describe('update', () => {
    it('returns the user without touching Prisma when the patch is empty', async () => {
      const safe = makeUserSafe();
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: safe.id })
        .mockResolvedValueOnce(safe);

      const result = await service.update(safe.id, {});
      expect(result).toEqual(safe);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('traduce unicidad violada en update a USR_EMAIL_TAKEN', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'id-1' });
      prisma.user.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: OrmKnownCodes.PrismaUniqueConstraint,
          clientVersion: 'test',
        }),
      );

      await expect(
        service.update('id-1', { email: 'taken@example.com' }),
      ).rejects.toMatchObject({
        code: ErrorCode.USR_EMAIL_TAKEN.code,
      });
    });
  });

  describe('remove', () => {
    it('returns the existing user without modifying the database', async () => {
      const safe = makeUserSafe();

      prisma.user.findUnique.mockResolvedValue(safe);

      const result = await service.remove(safe.id);

      expect(result).toEqual(safe);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: safe.id },
        select: {
          id: true,
          name: true,
          email: true,
          registeredAt: true,
          role: true,
        },
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
