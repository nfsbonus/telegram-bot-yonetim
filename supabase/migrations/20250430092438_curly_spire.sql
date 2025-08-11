/*
  # Add group management functionality
  
  1. New Tables
    - `groups`
      - `id` (uuid, primary key)
      - `telegram_id` (bigint, group's Telegram ID)
      - `title` (text, group name)
      - `type` (text, group type: 'group' or 'supergroup')
      - `member_count` (integer, number of members)
      - `joined_at` (timestamptz)
      - `last_active` (timestamptz)
      - `bot_id` (uuid, reference to bots table)
  
  2. Changes
    - Add `target_type` and `target_groups` to announcements table
    - Update RLS policies
*/

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('group', 'supergroup')),
  member_count integer DEFAULT 0,
  joined_at timestamptz DEFAULT now(),
  last_active timestamptz DEFAULT now(),
  bot_id uuid REFERENCES bots(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(telegram_id, bot_id)
);

-- Enable RLS on groups table
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Create policy for groups
CREATE POLICY "Users can manage groups of their bots"
  ON groups
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bots
      WHERE bots.id = groups.bot_id
      AND bots.user_id = auth.uid()
    )
  );

-- Add new columns to announcements table
ALTER TABLE announcements
  ADD COLUMN target_type text NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'users', 'groups')),
  ADD COLUMN target_groups uuid[] DEFAULT ARRAY[]::uuid[];

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_groups_bot_id ON groups(bot_id);