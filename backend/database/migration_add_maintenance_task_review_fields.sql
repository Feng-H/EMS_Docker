ALTER TABLE maintenance_tasks
    ADD COLUMN IF NOT EXISTS review_notes TEXT;

ALTER TABLE maintenance_tasks
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;

ALTER TABLE maintenance_tasks
    ADD COLUMN IF NOT EXISTS reviewed_by INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_maintenance_tasks_reviewed_by'
          AND table_name = 'maintenance_tasks'
    ) THEN
        ALTER TABLE maintenance_tasks
            ADD CONSTRAINT fk_maintenance_tasks_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id);
    END IF;
END $$;
