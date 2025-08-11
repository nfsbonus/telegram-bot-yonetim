-- Create function to update subscribers count
CREATE OR REPLACE FUNCTION update_subscribers_count(bot_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE bots
  SET subscribers_count = (
    SELECT COUNT(*)
    FROM users
    WHERE users.bot_id = bot_id
    AND NOT users.is_blocked
  )
  WHERE id = bot_id;
END;
$$;