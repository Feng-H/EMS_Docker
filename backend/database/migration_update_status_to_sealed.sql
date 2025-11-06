-- 设备状态迁移脚本：将 'scrapped' (报废) 改为 'sealed' (封存)
-- 执行时间：2025-11-06

-- 更新现有设备状态
UPDATE devices 
SET status = 'sealed' 
WHERE status = 'scrapped';

-- 验证更新结果
SELECT 
    status, 
    COUNT(*) as count 
FROM devices 
GROUP BY status 
ORDER BY status;

