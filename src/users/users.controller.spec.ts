import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UsersController } from './users.controller';
import { RegisterDto } from './dto';
import { JwtGuard } from './jwt.guard';
import { AppLogger } from '../common/app-logger.service';

describe('UsersController', () => {
  let controller: UsersController;
  let prismaService: PrismaService;

  const mockPrismaService = {
    app_user: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockAppLogger = {
    logUserAction: jest.fn(),
    logError: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    logApiCall: jest.fn(),
    logDatabaseOperation: jest.fn(),
    logAuthEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AppLogger,
          useValue: mockAppLogger,
        },
      ],
    })
      .overrideGuard(JwtGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /users/register', () => {
    const mockUser = {
      id: 'user-123',
      phone_e164: '+1234567890',
      display_name: 'John Doe',
      upi_vpa: 'john.doe@paytm',
      upi_verified: false,
      base_currency: 'INR',
      created_at: new Date('2023-01-01T00:00:00.000Z'),
      updated_at: new Date('2023-01-01T00:00:00.000Z'),
    };

    const mockRequest = {
      user: { id: 'user-123' },
    };

    it('should register user with displayName only', async () => {
      const registerDto: RegisterDto = {
        displayName: 'John Doe',
      };

      mockPrismaService.app_user.update.mockResolvedValue(mockUser);

      const result = await controller.register(mockRequest, registerDto);

      expect(mockPrismaService.app_user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          display_name: 'John Doe',
          base_currency: 'INR',
        },
        select: {
          id: true,
          phone_e164: true,
          display_name: true,
          upi_vpa: true,
          upi_verified: true,
          base_currency: true,
          created_at: true,
          updated_at: true,
        },
      });

      expect(result).toEqual({
        id: 'user-123',
        phoneE164: '+1234567890',
        displayName: 'John Doe',
        upiVpa: 'john.doe@paytm',
        upiVerified: false,
        baseCurrency: 'INR',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      });
    });

    it('should register user with displayName and upiVpa', async () => {
      const registerDto: RegisterDto = {
        displayName: 'John Doe',
        upiVpa: 'john.doe@paytm',
      };

      mockPrismaService.app_user.update.mockResolvedValue(mockUser);

      const result = await controller.register(mockRequest, registerDto);

      expect(mockPrismaService.app_user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          display_name: 'John Doe',
          upi_vpa: 'john.doe@paytm',
          upi_verified: false,
          base_currency: 'INR',
        },
        select: {
          id: true,
          phone_e164: true,
          display_name: true,
          upi_vpa: true,
          upi_verified: true,
          base_currency: true,
          created_at: true,
          updated_at: true,
        },
      });

      expect(result).toEqual({
        id: 'user-123',
        phoneE164: '+1234567890',
        displayName: 'John Doe',
        upiVpa: 'john.doe@paytm',
        upiVerified: false,
        baseCurrency: 'INR',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      });
    });

    it('should register user with custom baseCurrency', async () => {
      const registerDto: RegisterDto = {
        displayName: 'John Doe',
        baseCurrency: 'USD',
      };

      const mockUserWithUSD = { ...mockUser, base_currency: 'USD' };
      mockPrismaService.app_user.update.mockResolvedValue(mockUserWithUSD);

      const result = await controller.register(mockRequest, registerDto);

      expect(mockPrismaService.app_user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          display_name: 'John Doe',
          base_currency: 'USD',
        },
        select: {
          id: true,
          phone_e164: true,
          display_name: true,
          upi_vpa: true,
          upi_verified: true,
          base_currency: true,
          created_at: true,
          updated_at: true,
        },
      });

      expect(result.baseCurrency).toBe('USD');
    });

    it('should handle Prisma unique violation on upi_vpa with 409', async () => {
      const registerDto: RegisterDto = {
        displayName: 'John Doe',
        upiVpa: 'existing@paytm',
      };

      const prismaError = new Error('Unique constraint failed on the constraint: `app_user_upi_vpa_key`');
      prismaError.code = 'P2002';
      prismaError.meta = { target: ['upi_vpa'] };

      mockPrismaService.app_user.update.mockRejectedValue(prismaError);

      await expect(controller.register(mockRequest, registerDto)).rejects.toThrow(ConflictException);
    });

    it('should lowercase upiVpa before saving', async () => {
      const registerDto: RegisterDto = {
        displayName: 'John Doe',
        upiVpa: 'JOHN.DOE@PAYTM',
      };

      mockPrismaService.app_user.update.mockResolvedValue(mockUser);

      await controller.register(mockRequest, registerDto);

      expect(mockPrismaService.app_user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          display_name: 'John Doe',
          upi_vpa: 'john.doe@paytm',
          upi_verified: false,
          base_currency: 'INR',
        },
        select: {
          id: true,
          phone_e164: true,
          display_name: true,
          upi_vpa: true,
          upi_verified: true,
          base_currency: true,
          created_at: true,
          updated_at: true,
        },
      });
    });
  });

  describe('GET /me', () => {
    const mockUser = {
      id: 'user-123',
      phone_e164: '+1234567890',
      display_name: 'John Doe',
      upi_vpa: 'john.doe@paytm',
      upi_verified: false,
      base_currency: 'INR',
      created_at: new Date('2023-01-01T00:00:00.000Z'),
      updated_at: new Date('2023-01-01T00:00:00.000Z'),
    };

    const mockRequest = {
      user: { id: 'user-123' },
    };

    it('should return user profile', async () => {
      mockPrismaService.app_user.findUnique.mockResolvedValue(mockUser);

      const result = await controller.getMe(mockRequest);

      expect(mockPrismaService.app_user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          id: true,
          phone_e164: true,
          display_name: true,
          upi_vpa: true,
          upi_verified: true,
          base_currency: true,
          created_at: true,
          updated_at: true,
        },
      });

      expect(result).toEqual({
        id: 'user-123',
        phoneE164: '+1234567890',
        displayName: 'John Doe',
        upiVpa: 'john.doe@paytm',
        upiVerified: false,
        baseCurrency: 'INR',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      });
    });

    it('should return null fields when user data is incomplete', async () => {
      const incompleteUser = {
        id: 'user-123',
        phone_e164: '+1234567890',
        display_name: null,
        upi_vpa: null,
        upi_verified: false,
        base_currency: 'INR',
        created_at: new Date('2023-01-01T00:00:00.000Z'),
        updated_at: new Date('2023-01-01T00:00:00.000Z'),
      };

      mockPrismaService.app_user.findUnique.mockResolvedValue(incompleteUser);

      const result = await controller.getMe(mockRequest);

      expect(result).toEqual({
        id: 'user-123',
        phoneE164: '+1234567890',
        displayName: null,
        upiVpa: null,
        upiVerified: false,
        baseCurrency: 'INR',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      });
    });
  });
});
