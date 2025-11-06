import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Location } from './entities/location.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(Location)
    private locationsRepository: Repository<Location>,
  ) {}

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { username },
      relations: ['role', 'department'],
    });
  }

  async findOne(id: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['role', 'department'],
    });
  }

  async findAll(page = 1, limit = 10, search?: string): Promise<{ data: User[]; total: number }> {
    const query = this.usersRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.department', 'department');

    if (search) {
      query.where('user.name LIKE :search OR user.username LIKE :search OR user.employeeNo LIKE :search', 
        { search: `%${search}%` });
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('user.created_at', 'DESC')
      .getManyAndCount();

    return { data, total };
  }

  async getRoles(): Promise<Role[]> {
    return this.rolesRepository.find();
  }

  async getLocations(type?: string): Promise<Location[]> {
    const query = this.locationsRepository.createQueryBuilder('location')
      .leftJoinAndSelect('location.parent', 'parent')
      .orderBy('location.type', 'ASC')
      .addOrderBy('location.name', 'ASC');
    
    if (type) {
      query.where('location.type = :type', { type });
    }
    
    return query.getMany();
  }

  async getLocationTree(): Promise<any[]> {
    const allLocations = await this.locationsRepository.find({
      relations: ['parent', 'children'],
      order: { type: 'ASC', name: 'ASC' },
    });

    const buildTree = (parentId: number | null = null): any[] => {
      return allLocations
        .filter(loc => loc.parentId === parentId)
        .map(loc => ({
          ...loc,
          children: buildTree(loc.id),
        }));
    };

    return buildTree();
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // 检查用户名是否已存在
    const existingUser = await this.usersRepository.findOne({
      where: { username: createUserDto.username },
    });
    if (existingUser) {
      throw new BadRequestException('用户名已存在');
    }

    // 检查工号是否已存在
    const existingEmployee = await this.usersRepository.findOne({
      where: { employeeNo: createUserDto.employeeNo },
    });
    if (existingEmployee) {
      throw new BadRequestException('工号已存在');
    }

    // 加密密码（默认123456）
    const password = createUserDto.password || '123456';
    const passwordHash = await bcrypt.hash(password, 10);

    const user = this.usersRepository.create({
      ...createUserDto,
      passwordHash,
    });

    return this.usersRepository.save(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 如果更新用户名，检查是否重复
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUser = await this.usersRepository.findOne({
        where: { username: updateUserDto.username },
      });
      if (existingUser) {
        throw new BadRequestException('用户名已存在');
      }
    }

    // 如果更新工号，检查是否重复
    if (updateUserDto.employeeNo && updateUserDto.employeeNo !== user.employeeNo) {
      const existingEmployee = await this.usersRepository.findOne({
        where: { employeeNo: updateUserDto.employeeNo },
      });
      if (existingEmployee) {
        throw new BadRequestException('工号已存在');
      }
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    await this.usersRepository.remove(user);
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.findOne(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 验证旧密码
    const isPasswordValid = await bcrypt.compare(changePasswordDto.oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('旧密码错误');
    }

    // 加密新密码
    const passwordHash = await bcrypt.hash(changePasswordDto.newPassword, 10);
    user.passwordHash = passwordHash;
    await this.usersRepository.save(user);
  }

  async importFromExcel(file: Express.Multer.File): Promise<{ success: number; failed: number; errors: any[] }> {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    let success = 0;
    let failed = 0;
    const errors: any[] = [];

    // 获取所有角色
    const roles = await this.rolesRepository.find();
    const roleMap = new Map(roles.map(r => [r.name, r.id]));

    for (let i = 0; i < data.length; i++) {
      const row: any = data[i];

      try {
        // 验证必填字段
        if (!row['工号'] || !row['姓名'] || !row['用户名']) {
          errors.push({ row: i + 2, error: '工号、姓名、用户名是必填项' });
          failed++;
          continue;
        }

        // 检查工号是否已存在
        const existingEmployee = await this.usersRepository.findOne({
          where: { employeeNo: String(row['工号']).trim() },
        });
        if (existingEmployee) {
          errors.push({ row: i + 2, error: `工号 ${row['工号']} 已存在` });
          failed++;
          continue;
        }

        // 检查用户名是否已存在
        const existingUser = await this.usersRepository.findOne({
          where: { username: String(row['用户名']).trim() },
        });
        if (existingUser) {
          errors.push({ row: i + 2, error: `用户名 ${row['用户名']} 已存在` });
          failed++;
          continue;
        }

        // 查找角色
        let roleId: number | undefined;
        if (row['角色']) {
          const roleName = String(row['角色']).trim();
          roleId = roleMap.get(roleName);
          if (!roleId) {
            errors.push({ row: i + 2, error: `角色 "${roleName}" 不存在，可选值：操作工、维修工、工程师、admin` });
            failed++;
            continue;
          }
        }

        // 创建用户
        const password = row['密码'] || '123456';
        const passwordHash = await bcrypt.hash(String(password), 10);

        const user = this.usersRepository.create({
          username: String(row['用户名']).trim(),
          name: String(row['姓名']).trim(),
          employeeNo: String(row['工号']).trim(),
          passwordHash,
          phone: row['电话'] ? String(row['电话']).trim() : undefined,
          email: row['邮箱'] ? String(row['邮箱']).trim() : undefined,
          roleId,
          isActive: row['状态'] !== '禁用',
        });

        await this.usersRepository.save(user);
        success++;
      } catch (error: any) {
        errors.push({ row: i + 2, error: error.message || '导入失败' });
        failed++;
      }
    }

    return { success, failed, errors };
  }

  async downloadTemplate(): Promise<Buffer> {
    try {
      if (!XLSX || !XLSX.utils) {
        throw new Error('XLSX 模块未正确加载');
      }

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet([
        ['用户名', '姓名', '工号', '密码', '电话', '邮箱', '角色', '状态'],
        ['user001', '张三', 'EMP001', '123456', '13800138000', 'user001@example.com', '操作工', '启用'],
        ['user002', '李四', 'EMP002', '123456', '13800138001', 'user002@example.com', '维修工', '启用'],
      ]);
      XLSX.utils.book_append_sheet(workbook, worksheet, '人员导入模板');
      
      const buffer = Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
      
      if (!buffer || buffer.length === 0) {
        throw new Error('生成的 Excel 文件为空');
      }
      
      return buffer;
    } catch (error: any) {
      console.error('生成模板失败:', error);
      throw new Error(`生成模板失败: ${error.message}`);
    }
  }

  async getStatistics() {
    const [total, active, online] = await Promise.all([
      this.usersRepository.count(),
      this.usersRepository.count({ where: { isActive: true } }),
      // 在线用户：最近1小时内有活动的用户（这里简化为活跃用户）
      this.usersRepository.count({ where: { isActive: true } }),
    ]);

    // 按角色统计
    const roleStats = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .select('role.name', 'roleName')
      .addSelect('COUNT(*)', 'count')
      .where('user.isActive = :isActive', { isActive: true })
      .groupBy('role.name')
      .getRawMany();

    return {
      total,
      active,
      online,
      roleStats: roleStats.map((r) => ({ role: r.roleName || '未分配', count: parseInt(r.count) })),
    };
  }
}
