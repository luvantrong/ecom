import { ConflictException, Injectable } from '@nestjs/common';
import { isUniqueConstraintPrismaError } from 'src/shared/helpers';
import { HashingService } from 'src/shared/services/hashing.service';
import { TokenService } from 'src/shared/services/token.service';
import { RegisterBodyType } from './auth.model';
import { AuthRepository } from './auth.repo';
import { RolesService } from './roles.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly hashingService: HashingService,
    private readonly authRepository: AuthRepository,
    private readonly tokenService: TokenService,
    private readonly roleService: RolesService,
  ) {}

  async register(body: RegisterBodyType) {
    try {
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
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  login(body: any) {
    return `This action adds a new auth ${body}}`;
  }

  refreshToken(refreshToken: string) {
    return `This action returns all auth ${refreshToken}`;
  }

  logout(refreshToken: string) {
    return `This action removes a #${refreshToken} auth`;
  }
}
