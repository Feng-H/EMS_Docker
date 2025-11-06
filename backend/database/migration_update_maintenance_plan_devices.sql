-- 保养计划设备关联表迁移脚本
-- 将保养计划从单设备关联改为多设备关联

-- 创建保养计划设备关联表
CREATE TABLE IF NOT EXISTS maintenance_plan_devices (
    plan_id INTEGER REFERENCES maintenance_plans(id) ON DELETE CASCADE,
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (plan_id, device_id)
);

-- 迁移现有数据（如果 maintenance_plans 表中有 device_id 字段）
-- 注意：如果表结构已经改变，此迁移可能不需要
-- DO $$
-- BEGIN
--     IF EXISTS (SELECT 1 FROM information_schema.columns 
--                WHERE table_name = 'maintenance_plans' AND column_name = 'device_id') THEN
--         INSERT INTO maintenance_plan_devices (plan_id, device_id)
--         SELECT id, device_id FROM maintenance_plans WHERE device_id IS NOT NULL
--         ON CONFLICT DO NOTHING;
--     END IF;
-- END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_maintenance_plan_devices_plan ON maintenance_plan_devices(plan_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_plan_devices_device ON maintenance_plan_devices(device_id);

