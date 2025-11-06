import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, UseInterceptors, UploadedFile, Res, ForbiddenException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('用户管理')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: '获取当前用户信息' })
  async getProfile(@Request() req) {
    return this.usersService.findOne(req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: '获取用户列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.usersService.findAll(page ? Number(page) : 1, limit ? Number(limit) : 10, search);
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取人员统计信息' })
  async getStatistics() {
    return this.usersService.getStatistics();
  }

  @Get('roles')
  @ApiOperation({ summary: '获取角色列表' })
  async getRoles() {
    return this.usersService.getRoles();
  }

  @Get('template')
  @ApiOperation({ summary: '下载导入模板' })
  async downloadTemplate(@Res() res: Response, @Request() req) {
    try {
      console.log('模板下载请求 - req.user:', JSON.stringify(req.user));
      console.log('模板下载请求 - req.user.role:', req.user?.role);
      
      // 权限检查：只有工程师和管理员可以下载模板
      if (!req.user || !req.user.role) {
        console.error('模板下载错误: 用户未认证或角色信息缺失');
        throw new ForbiddenException('用户未认证');
      }
      
      if (req.user.role !== '工程师' && req.user.role !== 'admin') {
        console.error('模板下载错误: 权限不足，当前角色:', req.user.role);
        throw new ForbiddenException('只有工程师和管理员可以下载模板');
      }
      
      console.log('开始生成模板...');
      const buffer = await this.usersService.downloadTemplate();
      console.log('模板生成成功，大小:', buffer.length);
      
      const filename = encodeURIComponent('人员导入模板.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
      res.send(buffer);
      console.log('模板下载响应已发送');
    } catch (error: any) {
      console.error('模板下载错误:', error);
      console.error('错误堆栈:', error.stack);
      // 如果是ForbiddenException，直接抛出，让NestJS处理
      if (error instanceof ForbiddenException) {
        throw error;
      }
      res.status(500).json({
        message: error.message || '生成模板失败',
        statusCode: 500,
      });
    }
  }

  @Get('locations/list')
  @ApiOperation({ summary: '获取位置列表' })
  @ApiQuery({ name: 'type', required: false, description: '位置类型：department, workshop, location' })
  async getLocations(@Query('type') type?: string) {
    return this.usersService.getLocations(type);
  }

  @Get('locations/tree')
  @ApiOperation({ summary: '获取位置树形结构' })
  async getLocationTree() {
    return this.usersService.getLocationTree();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取用户详情' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Post()
  @ApiOperation({ summary: '创建用户' })
  async create(@Body() createUserDto: CreateUserDto, @Request() req) {
    // 权限检查：只有工程师和管理员可以创建用户
    if (req.user.role !== '工程师' && req.user.role !== 'admin') {
      throw new ForbiddenException('只有工程师和管理员可以创建用户');
    }
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新用户' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req) {
    // 权限检查：只有工程师和管理员可以更新用户
    if (req.user.role !== '工程师' && req.user.role !== 'admin') {
      throw new ForbiddenException('只有工程师和管理员可以更新用户');
    }
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除用户' })
  async remove(@Param('id') id: string, @Request() req) {
    // 权限检查：只有工程师和管理员可以删除用户
    if (req.user.role !== '工程师' && req.user.role !== 'admin') {
      throw new ForbiddenException('只有工程师和管理员可以删除用户');
    }
    await this.usersService.remove(+id);
  }

  @Post(':id/change-password')
  @ApiOperation({ summary: '修改密码（自主变更）' })
  async changePassword(@Param('id') id: string, @Body() changePasswordDto: ChangePasswordDto, @Request() req) {
    // 只能修改自己的密码，或者管理员/工程师可以修改任何人的密码
    const userId = +id;
    if (userId !== req.user.userId && req.user.role !== '工程师' && req.user.role !== 'admin') {
      throw new ForbiddenException('只能修改自己的密码');
    }
    await this.usersService.changePassword(userId, changePasswordDto);
  }

  @Post('import')
  @ApiOperation({ summary: '批量导入用户' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async import(@UploadedFile() file: Express.Multer.File, @Request() req) {
    // 权限检查：只有工程师和管理员可以导入用户
    if (req.user.role !== '工程师' && req.user.role !== 'admin') {
      throw new ForbiddenException('只有工程师和管理员可以导入用户');
    }
    if (!file) {
      throw new ForbiddenException('请上传文件');
    }
    return this.usersService.importFromExcel(file);
  }
}
