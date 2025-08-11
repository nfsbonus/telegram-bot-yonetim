/*
  # Rename subscribers to users and add bot control functionality
  
  1. Changes
    - Rename subscribers table to users
    - Add webhook_url column to bots table
    - Add commands column to bots table
    
  2. Security
    - Update RLS policies for renamed table
    - Maintain existing security rules
*/

-- Rename subscribers table to users
ALTER TABLE subscribers RENAME TO users;

-- Add new columns to bots table
ALTER TABLE bots 
  ADD COLUMN webhook_url text,
  ADD COLUMN commands jsonb DEFAULT '[]'::jsonb;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can manage subscribers of their bots" ON users;

CREATE POLICY "Users can manage users of their bots"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bots
      WHERE bots.id = users.bot_id
      AND bots.user_id = auth.uid()
    )
  );

-- Create function to start bot
CREATE OR REPLACE FUNCTION start_bot(bot_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE bots
  SET 
    status = 'online',
    last_active = NOW()
  WHERE id = bot_id
  AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Create function to stop bot
CREATE OR REPLACE FUNCTION stop_bot(bot_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE bots
  SET 
    status = 'offline',
    last_active = NOW()
  WHERE id = bot_id
  AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;