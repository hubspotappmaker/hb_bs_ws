import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto, SignUpDto } from '@app/common/interface/dto/common/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('sign-up')
  async signUp(
    @Body() signUpDto: SignUpDto
  ) {
    return await this.authService.signUp(signUpDto);
  }

  @Post('sign-in')
  async signin(
    @Body() signInDto: SignInDto
  ) {
    return await this.authService.signIn(signInDto);
  }

  @Get('user/:id')
  async getUserById(
    @Param('id') id: string
  ) {
    return await this.authService.getUserById(id);
  }
}
