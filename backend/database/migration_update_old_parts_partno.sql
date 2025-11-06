-- 更新旧件编号，在原有编号后加上J（如果还没有J后缀）
UPDATE old_parts 
SET part_no = part_no || 'J'
WHERE part_no NOT LIKE '%J';

