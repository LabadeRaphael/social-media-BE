import { UsersService } from './users.service';
import { BadRequestException, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';

@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) { }

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
  async blockUser(@Req() req, @Param('id') targetUserId: string) {
    const userId = req.user?.sub;
    if (userId === targetUserId) throw new BadRequestException("You can't block yourself");
    return this.userService.blockUser(userId, targetUserId);
  }

}
