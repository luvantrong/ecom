import { Body, Controller, Post } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { RegisterBodyDTO, RegisterResDTO } from './auth.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ZodSerializerDto(RegisterResDTO)
  register(@Body() body: RegisterBodyDTO) {
    return this.authService.register(body);
  }

  // @Post('login')
  // login(@Body() body: any) {
  //   return this.authService.login(body);
  // }

  // @Post('refresh-token')
  // @HttpCode(HttpStatus.OK)
  // refreshToken(@Body() body: any) {
  //   return this.authService.refreshToken(body.refreshToken);
  // }

  // @Post('logout')
  // logout(@Body() body: any) {
  //   return this.authService.logout(body.refreshToken);
  // }
}
