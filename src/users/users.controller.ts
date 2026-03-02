import { UsersService } from './users.service';
import { BadRequestException, Controller, Get, Param, Post, Query, Req, UseInterceptors,
  UploadedFile,
  Body,
  Put,
  Delete, } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { multerConfig } from 'src/config/multer.config';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
@Controller('users')
export class UsersController {
  constructor(
    private readonly userService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
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
  async blockUser(@Req() req:Request & { user?: { sub: string } }, @Param('id') targetUserId: string) {
    const userId = req.user?.sub;
    if (userId === targetUserId) throw new BadRequestException("You can't block yourself");
    return this.userService.blockUser(userId, targetUserId);
  }
  @Post('unblock/:id')
  async unblockUser(@Req() req:Request & { user?: { sub: string } }, @Param('id') blockedUserId: string) {
    const userId = req.user?.sub;
    if (userId === blockedUserId) throw new BadRequestException("You can't block yourself not to talk of unblocking");
    return this.userService.unblockUser(userId, blockedUserId);
  }


  @Put('update')
  @UseInterceptors(FileInterceptor('avatar', multerConfig))
  async updateUser(
    @Req() req: Request & { user: { sub: string } }, 
    @Body() body: UpdateUserDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    const userId = req.user.sub;

    // 1️⃣ Validate uploaded file
    if (avatar && !avatar.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed for avatar');
    }

    // 2️⃣ Optionally upload to Cloudinary
    let avatarUrl: string | undefined;
    if (avatar) {
      const uploadResult = await this.cloudinaryService.uploadFile(avatar);
      if (!('secure_url' in uploadResult)) {
        throw new BadRequestException('Cloudinary upload failed');
      }
      avatarUrl = uploadResult.secure_url;
    }
    return this.userService.updateUser(
      userId,
      body,
      avatarUrl
     
      
    )
    // 3️⃣ Update user in DB
   

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

