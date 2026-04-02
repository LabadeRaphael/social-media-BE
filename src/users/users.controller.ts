import { UsersService } from './users.service';
import {
  BadRequestException, Controller, Get, Param, Post, Query, Req, UseInterceptors,
  UploadedFile,
  Body,
  Put,
  Delete,
  UnauthorizedException,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/config/multer.config';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { Response, Request } from 'express';
import { AuthHelper } from 'src/auth/helpers/verify-password.helper';
import { CookiesService } from 'src/auth/cookies.service';
@Controller('users')
export class UsersController {
  constructor(
    private readonly userService: UsersService,
    private readonly cookieService: CookiesService,
    private readonly authHelper: AuthHelper,
  ) { }

  @Get('search')
  async getUserName(
    @Req() req: Request & { user: { sub: string } },
    @Query('userName') userName: string
  ) {

    const currentUserId = req.user?.sub;

    const normalized = userName.trim().toLowerCase(); // controller-level
    return await this.userService.getUserByUsername(normalized, currentUserId);

  }

  @Get('profile')
  async getCurrentUser(@Req() req: Request & { user?: { sub: string } }) {
    const currentUserId = req.user?.sub;
    return this.userService.getUserProfile(currentUserId);
  }

  @Post('block/:id')
  async blockUser(@Req() req: Request & { user?: { sub: string } }, @Param('id') targetUserId: string) {
    const userId = req.user?.sub;
    if (userId === targetUserId) throw new BadRequestException("You can't block yourself");
    return this.userService.blockUser(userId, targetUserId);
  }
  @Post('unblock/:id')
  async unblockUser(@Req() req: Request & { user?: { sub: string } }, @Param('id') blockedUserId: string) {
    const userId = req.user?.sub;
    if (userId === blockedUserId) throw new BadRequestException("You can't block yourself not to talk of unblocking");
    return this.userService.unblockUser(userId, blockedUserId);
  }

  @Put('update')
  @UseInterceptors(FileInterceptor('avatar', multerConfig))
  async updateUser(
    @Req() req: Request & { user: { sub: string } },
    @Res({ passthrough: true }) res: Response,
    @Body() body: UpdateUserDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    const userId = req.user.sub;
    const updateData = {
      userName: body.userName,
      password: body.password,
      re_auth_psw: body.re_auth_psw,
    };
    const refreshToken = this.cookieService.getAuthCookie(req, 'refreshToken');
    try {

      return this.userService.updateUser(userId, updateData, avatar);
    } catch (error) {
      if (
        error instanceof ForbiddenException &&
        error.message.includes('locked')
      ) {
        if (refreshToken) {
          await this.userService.deleteRefreshToken(refreshToken);
        }
        // ✅ clear cookies here
        this.cookieService.clearCookie(res, 'refreshToken');
        this.cookieService.clearCookie(res, 'accessToken');
      }

      throw error;
    }
  }


  @Delete('delete-account')
  async deleteAccount(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: DeleteAccountDto) {
    const userId = req.user.sub;
    await this.userService.softDeleteUser(userId, dto.password);
    return { message: 'Account deletion successful.', status: true };
  }
}

