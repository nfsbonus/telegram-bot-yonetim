/*
  # Initial Schema Setup for Telegram Bot Management System

  1. New Tables
    - `bots`
      - `id` (uuid, primary key)
      - `name` (text)
      - `token` (text)
      - `status` (text)
      - `created_at` (timestamp)
      - `subscribers_count` (integer)
      - `last_active` (timestamp)
      - `user_id` (uuid, foreign key)

    - `subscribers`
      - `id` (uuid, primary key)
      - `telegram_id` (bigint)
      - `username` (text)
      - `first_name` (text)
      - `last_name` (text)
      - `joined_at` (timestamp)
      - `last_active` (timestamp)
      - `is_blocked` (boolean)
      - `bot_id` (uuid, foreign key)

    - `announcements`
      - `id` (uuid, primary key)
      - `bot_id` (uuid, foreign key)
      - `title` (text)
      - `description` (text)
      - `image_url` (text)
      - `created_at` (timestamp)
      - `sent_at` (timestamp)
      - `status` (text)
      - `delivered_count` (integer)
      - `total_count` (integer)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create bots table
CREATE TABLE IF NOT EXISTS bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  token text NOT NULL,
  status text NOT NULL DEFAULT 'offline',
  created_at timestamptz DEFAULT now(),
  subscribers_count integer DEFAULT 0,
  last_active timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) NOT NULL
);

ALTER TABLE bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bots"
  ON bots
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Create subscribers table
CREATE TABLE IF NOT EXISTS subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL,
  username text NOT NULL,
  first_name text NOT NULL,
  last_name text,
  joined_at timestamptz DEFAULT now(),
  last_active timestamptz DEFAULT now(),
  is_blocked boolean DEFAULT false,
  bot_id uuid REFERENCES bots(id) ON DELETE CASCADE NOT NULL
);

ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage subscribers of their bots"
  ON subscribers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bots
      WHERE bots.id = subscribers.bot_id
      AND bots.user_id = auth.uid()
    )
  );

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid REFERENCES bots(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'draft',
  delivered_count integer DEFAULT 0,
  total_count integer DEFAULT 0
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage announcements of their bots"
  ON announcements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bots
      WHERE bots.id = announcements.bot_id
      AND bots.user_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subscribers_bot_id ON subscribers(bot_id);
CREATE INDEX IF NOT EXISTS idx_announcements_bot_id ON announcements(bot_id);
CREATE INDEX IF NOT EXISTS idx_bots_user_id ON bots(user_id);