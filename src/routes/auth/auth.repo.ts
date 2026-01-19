/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';
import {
  DeviceType,
  RegisterBodyType,
  RoleType,
  VerificationCodeType,
} from './auth.model';
import { UserType } from 'src/shared/models/shared-user.model';
import { TypeOfVerificationCodeType } from 'src/shared/constants/auth.constant';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuthRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async createUser(
    user: Omit<RegisterBodyType, 'confirmPassword' | 'code'> &
      Pick<UserType, 'roleId'>,
  ): Promise<Omit<UserType, 'password' | 'totpSecret'>> {
    return this.prismaService.user.create({
      data: user,
      omit: {
        password: true,
        totpSecret: true,
      },
    });
  }

  async createVerificationCode(
    payload: Pick<
      VerificationCodeType,
      'email' | 'code' | 'type' | 'expiresAt'
    >,
  ) {
    return this.prismaService.verificationCode.upsert({
      where: {
        email: payload.email,
      },
      create: payload,
      update: {
        code: payload.code,
        expiresAt: payload.expiresAt,
      },
    });
  }

  async findUniqueVerificationCode(
    uniqueValue:
      | { email: string }
      | { id: number }
      | {
          email: string;
          code: string;
          type: TypeOfVerificationCodeType;
        },
  ) {
    return this.prismaService.verificationCode.findUnique({
      where: uniqueValue,
    });
  }

  createRefreshToken(data: {
    token: string;
    userId: number;
    expiresAt: Date;
    deviceId: number;
  }) {
    return this.prismaService.refreshToken.create({
      data,
    });
  }

  createDevice(
    data: Pick<DeviceType, 'userAgent' | 'ip' | 'userId'> &
      Partial<Pick<DeviceType, 'isActive' | 'lastActive'>>,
  ) {
    return this.prismaService.device.create({
      data,
    });
  }

  async findUniqueUserIncludeRRole(
    uniqueObject: Prisma.UserWhereUniqueInput,
  ): Promise<(UserType & { role: RoleType }) | null> {
    return this.prismaService.user.findUnique({
      where: uniqueObject,
      include: {
        role: true,
      },
    });
  }
}
