-- Add image URL to badges and pre-fill with local paths
ALTER TABLE badges ADD COLUMN image_url text;

-- Each badge image should be placed at public/badges/{id}.png
UPDATE badges SET image_url = '/badges/' || id || '.png';
