import { Body, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ConfigType } from '@nestjs/config';
import authConfig from 'src/config/auth.config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    @Inject(authConfig.KEY)
    private readonly authConfiguration: ConfigType<typeof authConfig>,
    private readonly jwtService: JwtService
  ) { }
  async register(user: RegisterDto) {
    return await this.usersService.register(user);
  }
  async login(login: LoginDto) {
    // console.log(this.authConfiguration);
    const user = await this.usersService.login(login);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');

    }

    const passwordValid = await bcrypt.compare(login.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = await this.jwtService.signAsync({
      sub:user.id,
      email:user.email,
    },{
      secret:this.authConfiguration.jwtSecret,
      expiresIn:this.authConfiguration.jwtExpiration,
      audience:this.authConfiguration.audience,
      issuer:this.authConfiguration.audience
    })
    return {
      token
    }

  }
}
