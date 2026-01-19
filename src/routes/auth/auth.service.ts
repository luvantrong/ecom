/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  HttpException,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { addMilliseconds } from 'date-fns';
import ms from 'ms';
import envConfig from 'src/shared/config';
import { TypeOfVerificationCode } from 'src/shared/constants/auth.constant';
import { generateOTP, isUniqueConstraintPrismaError } from 'src/shared/helpers';
import { SharedUserRepository } from 'src/shared/repositories/shared-user.repo';
import { HashingService } from 'src/shared/services/hashing.service';
import {
  LoginBodyType,
  RefreshTokenBodyType,
  RegisterBodyType,
  SendOtpBodyType,
} from './auth.model';
import { AuthRepository } from './auth.repo';
import { RolesService } from './roles.service';
import { EmailService } from 'src/shared/services/email.service';
import { TokenService } from 'src/shared/services/token.service';
import { AccessTokenPayloadCreate } from 'src/shared/types/jwt.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly hashingService: HashingService,
    private readonly authRepository: AuthRepository,
    private readonly roleService: RolesService,
    private readonly emailService: EmailService,
    private readonly sharedUserRepository: SharedUserRepository,
    private readonly tokenService: TokenService,
  ) {}

  async register(body: RegisterBodyType) {
    try {
      const verificationCode =
        await this.authRepository.findUniqueVerificationCode({
          email: body.email,
          code: body.code,
          type: TypeOfVerificationCode.REGISTER,
        });

      if (!verificationCode) {
        throw new UnprocessableEntityException([
          {
            path: 'code',
            message: 'Invalid OTP',
          },
        ]);
      }

      if (verificationCode.expiresAt < new Date()) {
        throw new UnprocessableEntityException([
          {
            path: 'code',
            message: 'Expired OTP',
          },
        ]);
      }

      const clientRoleId = await this.roleService.getClientRoleId();
      const hashedPassword = await this.hashingService.hash(body.password);
      return await this.authRepository.createUser({
        email: body.email,
        name: body.name,
        phoneNumber: body.phoneNumber,
        password: hashedPassword,
        roleId: clientRoleId,
      });
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new UnprocessableEntityException([
          {
            path: 'email',
            message: 'Email already exists',
          },
        ]);
      }
      throw error;
    }
  }

  async sendOTP(body: SendOtpBodyType) {
    // 1. Kiểm tra email đã tồn tại trong database chưa
    // 2. Tạo OTP
    const user = await this.sharedUserRepository.findUnique({
      email: body.email,
    });
    if (user) {
      throw new UnprocessableEntityException([
        {
          path: 'email',
          message: 'Email already exists',
        },
      ]);
    }
    const code = generateOTP();

    const verificationCode = this.authRepository.createVerificationCode({
      email: body.email,
      code,
      type: body.type,
      expiresAt: addMilliseconds(
        new Date(),
        ms(envConfig.OTP_EXPIRES_IN as ms.StringValue),
      ),
    });

    const { error } = await this.emailService.sendOTP({
      email: body.email,
      code,
    });

    if (error) {
      console.log(error);

      throw new UnprocessableEntityException([
        {
          path: 'code',
          message: 'Send OTP failed',
        },
      ]);
    }

    return verificationCode;
  }

  async login(body: LoginBodyType & { userAgent: string; ip: string }) {
    const user = await this.authRepository.findUniqueUserIncludeRRole({
      email: body.email,
    });

    if (!user) {
      throw new UnprocessableEntityException([
        {
          path: 'email',
          message: 'Email not found',
        },
      ]);
    }

    const isPasswordMatch = await this.hashingService.compare(
      body.password,
      user.password,
    );

    if (!isPasswordMatch) {
      throw new UnprocessableEntityException([
        {
          path: 'password',
          message: 'Password not match',
        },
      ]);
    }

    const device = await this.authRepository.createDevice({
      userId: user.id,
      userAgent: body.userAgent,
      ip: body.ip,
    });

    const tokens = await this.generateTokens({
      userId: user.id,
      deviceId: device.id,
      roleId: user.roleId,
      roleName: user.role.name,
    });

    return tokens;
  }

  async generateTokens({
    userId,
    deviceId,
    roleName,
    roleId,
  }: AccessTokenPayloadCreate) {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken({
        userId,
        deviceId,
        roleName,
        roleId,
      }),
      this.tokenService.signRefreshToken({
        userId,
      }),
    ]);

    const decodeRefreshToken =
      await this.tokenService.verifyRefreshToken(refreshToken);

    await this.authRepository.createRefreshToken({
      token: refreshToken,
      userId,
      expiresAt: new Date(decodeRefreshToken.exp * 1000),
      deviceId,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshToken({
    refreshToken,
    userAgent,
    ip,
  }: RefreshTokenBodyType & { userAgent: string; ip: string }) {
    try {
      // 1. Kiểm tra refreshToken có hợp lệ hay không
      const { userId } =
        await this.tokenService.verifyRefreshToken(refreshToken);

      // 2. Kiểm tra refreshToken có tồn tại trong database hay không
      const refreshTokenInDb =
        await this.authRepository.findUniqueRefreshTokenIncludeUserRole({
          token: refreshToken,
        });

      if (!refreshTokenInDb) {
        throw new UnauthorizedException('Refresh token has been used');
      }
      // 3. Cập nhật device
      const {
        deviceId,
        user: { roleId, name: roleName },
      } = refreshTokenInDb;
      const $updateDevice = this.authRepository.updateDevice(deviceId, {
        userAgent,
        ip,
      });
      // 4. Xoá refresh token cũ
      const $deleteRefreshToken = this.authRepository.deleteRefreshToken({
        token: refreshToken,
      });

      // 5. Tạo mới access token và refresh token
      const $tokens = this.generateTokens({
        userId,
        deviceId,
        roleId,
        roleName,
      });

      const [, , tokens] = await Promise.all([
        $updateDevice,
        $deleteRefreshToken,
        $tokens,
      ]);

      return tokens;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new UnauthorizedException();
    }
  }

  logout(refreshToken: string) {
    return `This action removes a #${refreshToken} auth`;
  }
}
