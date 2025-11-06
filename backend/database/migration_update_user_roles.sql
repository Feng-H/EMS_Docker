-- 更新角色表，添加新的角色：操作工、维修工、工程师、管理员（admin）
-- 删除旧角色，插入新角色

-- 删除旧角色（如果存在）
DELETE FROM roles WHERE name IN ('pm', 'technician', 'operator', 'warehouse');

-- 插入新角色
INSERT INTO roles (name, permissions, description) VALUES
('操作工', '{"devices": ["read"], "work_orders": ["read"]}', '操作工'),
('维修工', '{"devices": ["read"], "maintenance": ["read"], "work_orders": ["read", "write"], "spare_parts": ["read"]}', '维修工'),
('工程师', '{"devices": ["read", "write"], "maintenance": ["read", "write"], "work_orders": ["read", "write"], "spare_parts": ["read", "write"], "users": ["read", "write"]}', '工程师'),
('admin', '{"all": true}', '管理员')
ON CONFLICT (name) DO NOTHING;

-- 更新现有用户的角色（如果有的话）
-- 将旧的 role_id 映射到新角色（需要根据实际情况调整）

