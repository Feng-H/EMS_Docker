-- 保养管理模块升级脚本
-- 添加保养内容项表和更新相关表结构

-- 保养内容项表
CREATE TABLE IF NOT EXISTS maintenance_items (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES maintenance_plans(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    item_type VARCHAR(20) NOT NULL, -- 'qualitative' (定性) 或 'quantitative' (定量)
    qualitative_options JSONB, -- 定性选项 {normal: '正常', abnormal: '异常'}
    quantitative_settings JSONB, -- 定量设置 {unit: '℃', minValue: 10, maxValue: 50}
    sort_order INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 更新保养计划表：修改频率类型注释
-- ALTER TABLE maintenance_plans ALTER COLUMN frequency_type TYPE VARCHAR(20);
-- 注意：PostgreSQL 不支持直接修改注释，需要在应用层处理

-- 更新保养任务表：添加异常相关字段
ALTER TABLE maintenance_tasks 
ADD COLUMN IF NOT EXISTS has_abnormal BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS abnormal_work_order_id INTEGER REFERENCES work_orders(id);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_maintenance_items_plan ON maintenance_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_items_sort ON maintenance_items(plan_id, sort_order);

