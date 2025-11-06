import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsEmail } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ description: '用户名', required: false })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ description: '姓名', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: '工号', required: false })
  @IsString()
  @IsOptional()
  employeeNo?: string;

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

  @ApiProperty({ description: '是否启用', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

