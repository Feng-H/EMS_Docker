-- 添加工单报修时间、响应时间、维修时间字段

-- 添加报修时间字段
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS reported_at TIMESTAMP;

-- 添加响应时间字段（分钟）
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS response_time INTEGER;

-- 添加维修时间字段（分钟）
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS repair_time INTEGER;

-- 为已有工单设置报修时间为创建时间
UPDATE work_orders 
SET reported_at = created_at 
WHERE reported_at IS NULL;

