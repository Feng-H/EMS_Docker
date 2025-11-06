import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MaintenanceService } from './maintenance.service';

@Injectable()
export class MaintenanceSchedulerService {
  private readonly logger = new Logger(MaintenanceSchedulerService.name);

  constructor(private readonly maintenanceService: MaintenanceService) {}

  /**
   * 班次保养：每天早上8点和晚上20点生成任务
   */
  @Cron('0 8,20 * * *') // 每天8点和20点执行
  async handleShiftMaintenance() {
    this.logger.log('开始执行班次保养任务生成...');
    try {
      await this.generateTasksForFrequencyType('shift');
      this.logger.log('班次保养任务生成完成');
    } catch (error) {
      this.logger.error('班次保养任务生成失败', error);
    }
  }

  /**
   * 每日保养：每天1:00生成任务
   */
  @Cron('0 1 * * *') // 每天1点执行
  async handleDailyMaintenance() {
    this.logger.log('开始执行每日保养任务生成...');
    try {
      await this.generateTasksForFrequencyType('daily');
      this.logger.log('每日保养任务生成完成');
    } catch (error) {
      this.logger.error('每日保养任务生成失败', error);
    }
  }

  /**
   * 每周保养：每周一早上8点生成任务
   */
  @Cron('0 8 * * 1') // 每周一8点执行
  async handleWeeklyMaintenance() {
    this.logger.log('开始执行每周保养任务生成...');
    try {
      await this.generateTasksForFrequencyType('weekly');
      this.logger.log('每周保养任务生成完成');
    } catch (error) {
      this.logger.error('每周保养任务生成失败', error);
    }
  }

  /**
   * 每月保养：每月1号8点生成任务
   */
  @Cron('0 8 1 * *') // 每月1号8点执行
  async handleMonthlyMaintenance() {
    this.logger.log('开始执行每月保养任务生成...');
    try {
      await this.generateTasksForFrequencyType('monthly');
      this.logger.log('每月保养任务生成完成');
    } catch (error) {
      this.logger.error('每月保养任务生成失败', error);
    }
  }

  /**
   * 每年保养：1月1日生成任务
   */
  @Cron('0 8 1 1 *') // 每年1月1日8点执行
  async handleYearlyMaintenance() {
    this.logger.log('开始执行每年保养任务生成...');
    try {
      await this.generateTasksForFrequencyType('yearly');
      this.logger.log('每年保养任务生成完成');
    } catch (error) {
      this.logger.error('每年保养任务生成失败', error);
    }
  }

  /**
   * 为指定频率类型的所有激活计划生成任务
   */
  private async generateTasksForFrequencyType(frequencyType: string) {
    // 获取所有激活的、匹配频率类型的保养计划
    const plans = await this.maintenanceService.findAllPlansForScheduler(frequencyType);

    for (const plan of plans) {
      try {
        // 计算任务执行时间
        const scheduledAt = this.calculateScheduledAt(plan.frequencyType, plan.frequencyValue);
        
        // 自动生成任务（不检查是否已有任务，因为这是定时任务）
        await this.maintenanceService.generateTasksAuto(plan.id, scheduledAt);
        this.logger.log(`计划 ${plan.id} (${plan.title}) 任务生成成功`);
      } catch (error) {
        this.logger.error(`计划 ${plan.id} (${plan.title}) 任务生成失败: ${error.message}`);
      }
    }
  }

  /**
   * 计算任务执行时间
   */
  private calculateScheduledAt(frequencyType: string, frequencyValue: number): Date {
    const now = new Date();
    const scheduledAt = new Date(now);

    switch (frequencyType) {
      case 'shift':
        // 班次：如果是早上8点执行，生成当天20点的任务；如果是晚上20点执行，生成明天8点的任务
        const currentHour = now.getHours();
        if (currentHour < 20) {
          // 早上8点执行，生成当天20点的任务
          scheduledAt.setHours(20, 0, 0, 0);
        } else {
          // 晚上20点执行，生成明天8点的任务
          scheduledAt.setDate(scheduledAt.getDate() + 1);
          scheduledAt.setHours(8, 0, 0, 0);
        }
        break;
      case 'daily':
        // 每日：生成明天的任务（1点执行，生成明天的任务）
        scheduledAt.setDate(scheduledAt.getDate() + frequencyValue);
        scheduledAt.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        // 每周：生成本周的任务（周一执行，生成本周的任务）
        scheduledAt.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        // 每月：生成本月的任务（1号执行，生成本月的任务）
        scheduledAt.setDate(1);
        scheduledAt.setHours(0, 0, 0, 0);
        break;
      case 'yearly':
        // 每年：生成今年的任务（1月1日执行，生成今年的任务）
        scheduledAt.setMonth(0, 1);
        scheduledAt.setHours(0, 0, 0, 0);
        break;
      default:
        scheduledAt.setDate(scheduledAt.getDate() + frequencyValue);
    }

    return scheduledAt;
  }
}

