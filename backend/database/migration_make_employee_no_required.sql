-- 使工号字段为必填项
-- 先为没有工号的用户生成临时工号
UPDATE users 
SET employee_no = 'EMP' || LPAD(id::text, 6, '0')
WHERE employee_no IS NULL OR employee_no = '';

-- 添加唯一约束（如果还没有）
ALTER TABLE users 
ALTER COLUMN employee_no SET NOT NULL;

-- 确保唯一约束存在
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_employee_no_key'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_employee_no_key UNIQUE (employee_no);
    END IF;
END $$;

