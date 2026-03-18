-- Add attachment_urls array to tasks for admin-uploaded reference images
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] NOT NULL DEFAULT '{}';
