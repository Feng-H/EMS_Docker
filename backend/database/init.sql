-- 设备管理系统数据库初始化脚本

-- 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    permissions JSONB DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 部门/位置表
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id INTEGER REFERENCES locations(id),
    type VARCHAR(50) NOT NULL, -- 'department', 'workshop', 'location'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 厂房表
CREATE TABLE IF NOT EXISTS workshops (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    address VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    employee_no VARCHAR(50) UNIQUE,
    phone VARCHAR(20),
    email VARCHAR(100),
    role_id INTEGER REFERENCES roles(id),
    department_id INTEGER REFERENCES locations(id),
    is_active BOOLEAN DEFAULT true,
    skills JSONB DEFAULT '[]',
    availability_calendar JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 设备表
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    asset_no VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    model VARCHAR(100),
    brand VARCHAR(100),
    workshop_id INTEGER REFERENCES workshops(id),
    location VARCHAR(200), -- 位置（文本输入）
    status VARCHAR(20) DEFAULT 'in_use', -- 'in_use', 'trial_run', 'debugging', 'sealed', 'scrapped'
    purchase_date DATE,
    warranty_until DATE,
    spec JSONB DEFAULT '{}',
    image_urls TEXT[] DEFAULT '{}',
    attachments JSONB DEFAULT '[]',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 设备部位表（设备结构）
CREATE TABLE IF NOT EXISTS device_parts (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    parent_part_id INTEGER REFERENCES device_parts(id),
    name VARCHAR(200) NOT NULL,
    part_no VARCHAR(50),
    spec JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 保养计划表
CREATE TABLE IF NOT EXISTS maintenance_plans (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    frequency_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly', 'run_hours'
    frequency_value INTEGER NOT NULL,
    next_due_at TIMESTAMP,
    assigned_group_id INTEGER REFERENCES locations(id),
    assigned_to INTEGER REFERENCES users(id),
    active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 保养任务表
CREATE TABLE IF NOT EXISTS maintenance_tasks (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES maintenance_plans(id),
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP NOT NULL,
    assigned_to INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled', 'overdue'
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    result JSONB DEFAULT '{}',
    attachments TEXT[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 工单表
CREATE TABLE IF NOT EXISTS work_orders (
    id SERIAL PRIMARY KEY,
    order_no VARCHAR(50) UNIQUE NOT NULL,
    reporter_id INTEGER REFERENCES users(id),
    device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    status VARCHAR(20) DEFAULT 'created', -- 'created', 'assigned', 'accepted', 'in_progress', 'pending_acceptance', 'completed', 'closed'
    assigned_to INTEGER REFERENCES users(id),
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    accepted_at TIMESTAMP,
    attachments TEXT[] DEFAULT '{}',
    fault_category VARCHAR(100),
    fault_cause TEXT,
    solution TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 工单评论表
CREATE TABLE IF NOT EXISTS work_order_comments (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER REFERENCES work_orders(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    attachments TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 备件表
CREATE TABLE IF NOT EXISTS spare_parts (
    id SERIAL PRIMARY KEY,
    part_no VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    spec JSONB DEFAULT '{}',
    supplier VARCHAR(200),
    stock_qty DECIMAL(10, 2) DEFAULT 0,
    min_stock DECIMAL(10, 2) DEFAULT 0,
    unit VARCHAR(20) DEFAULT '个',
    location VARCHAR(100),
    image_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 备件出入库记录表
CREATE TABLE IF NOT EXISTS part_movements (
    id SERIAL PRIMARY KEY,
    part_id INTEGER REFERENCES spare_parts(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'in', 'out', 'adjust', 'scrap'
    qty DECIMAL(10, 2) NOT NULL,
    related_order_id INTEGER, -- 关联工单或保养任务ID
    related_type VARCHAR(20), -- 'work_order', 'maintenance_task', 'purchase', 'adjustment'
    operator_id INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 维修记录表
CREATE TABLE IF NOT EXISTS repair_records (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER REFERENCES work_orders(id) ON DELETE CASCADE,
    technician_id INTEGER REFERENCES users(id),
    description TEXT,
    time_spent DECIMAL(10, 2), -- 工时（小时）
    labor_cost DECIMAL(10, 2),
    material_cost DECIMAL(10, 2),
    total_cost DECIMAL(10, 2),
    attachments TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 工单备件消耗表
CREATE TABLE IF NOT EXISTS work_order_parts (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER REFERENCES work_orders(id) ON DELETE CASCADE,
    part_id INTEGER REFERENCES spare_parts(id),
    qty DECIMAL(10, 2) NOT NULL,
    movement_id INTEGER REFERENCES part_movements(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_devices_asset_no ON devices(asset_no);
CREATE INDEX IF NOT EXISTS idx_devices_location ON devices(location_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_device ON work_orders(device_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned ON work_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_status ON maintenance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_scheduled ON maintenance_tasks(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_part_movements_part ON part_movements(part_id);
CREATE INDEX IF NOT EXISTS idx_part_movements_type ON part_movements(type);

-- 插入默认角色
INSERT INTO roles (name, permissions, description) VALUES
('admin', '{"all": true}', '系统管理员'),
('pm', '{"devices": ["read", "write"], "maintenance": ["read", "write"], "work_orders": ["read", "write"], "reports": ["read"]}', '维护管理员'),
('technician', '{"devices": ["read"], "maintenance": ["read"], "work_orders": ["read", "write"], "spare_parts": ["read"]}', '维修人员'),
('operator', '{"devices": ["read", "write"], "work_orders": ["read", "write"]}', '设备录入员'),
('warehouse', '{"spare_parts": ["read", "write"], "work_orders": ["read"]}', '仓库管理员')
ON CONFLICT (name) DO NOTHING;

-- 插入默认管理员用户（密码: admin123，需要在应用启动时由bcrypt加密）
-- INSERT INTO users (username, password_hash, name, role_id) VALUES
-- ('admin', '$2b$10$YourHashedPasswordHere', '系统管理员', 1);
