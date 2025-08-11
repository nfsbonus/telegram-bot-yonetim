-- Add the scheduled_time column to announcements table
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMPTZ;

-- Modify the status enum to include 'scheduled'
ALTER TABLE announcements
DROP CONSTRAINT IF EXISTS announcements_status_check;

ALTER TABLE announcements
ADD CONSTRAINT announcements_status_check
CHECK (status IN ('draft', 'sending', 'sent', 'failed', 'scheduled'));

-- Create an index for faster queries on scheduled announcements
CREATE INDEX IF NOT EXISTS idx_announcements_scheduled_time
ON announcements (scheduled_time)
WHERE status = 'scheduled';

-- Add a comment explaining the scheduled_time column
COMMENT ON COLUMN announcements.scheduled_time IS 'The time when a scheduled announcement should be sent'; 