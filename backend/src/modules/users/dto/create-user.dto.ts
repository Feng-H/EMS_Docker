import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsEmail } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: '用户名' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: '姓名' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '工号（必填）' })
  @IsString()
  @IsNotEmpty()
  employeeNo: string;

  @ApiProperty({ description: '密码（默认123456）', required: false, default: '123456' })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({ description: '电话', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: '邮箱', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: '角色ID', required: false })
  @IsNumber()
  @IsOptional()
  roleId?: number;

  @ApiProperty({ description: '部门ID', required: false })
  @IsNumber()
  @IsOptional()
  departmentId?: number;

  @ApiProperty({ description: '是否启用', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

