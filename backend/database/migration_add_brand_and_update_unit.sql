-- 添加品牌字段
ALTER TABLE spare_parts 
ADD COLUMN IF NOT EXISTS brand VARCHAR(100);

-- 更新单位：将"个"改为"pc"
UPDATE spare_parts 
SET unit = 'pc' 
WHERE unit = '个' OR unit IS NULL;

-- 设置默认单位为 pc
ALTER TABLE spare_parts 
ALTER COLUMN unit SET DEFAULT 'pc';

