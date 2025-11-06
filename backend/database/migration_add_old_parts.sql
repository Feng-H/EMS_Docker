-- 创建旧件表
CREATE TABLE IF NOT EXISTS old_parts (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER REFERENCES work_orders(id) ON DELETE CASCADE,
    device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
    part_no VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    spec JSONB DEFAULT '{}',
    supplier VARCHAR(200),
    unit VARCHAR(20) DEFAULT '个',
    location VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_old_parts_work_order ON old_parts(work_order_id);
CREATE INDEX IF NOT EXISTS idx_old_parts_device ON old_parts(device_id);

