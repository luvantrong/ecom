import { Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import { UserType } from '../models/shared-user.model';
import { Prisma } from '@prisma/client';

@Injectable()
export class SharedUserRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findUnique(
    uniqueObject: Prisma.UserWhereUniqueInput,
  ): Promise<UserType | null> {
    return this.prismaService.user.findUnique({
      where: uniqueObject,
    });
  }
}
