-- Create the message_templates table
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_message_templates_bot_id
ON message_templates (bot_id);

-- Create a trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_templates_updated_at
BEFORE UPDATE ON message_templates
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Add RLS policies for message_templates
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- Policy for selecting templates (users can only access templates for their bots)
CREATE POLICY message_templates_select_policy
ON message_templates
FOR SELECT
USING (
    bot_id IN (
        SELECT id FROM bots WHERE user_id = auth.uid()
    )
);

-- Policy for inserting templates (users can only insert for their bots)
CREATE POLICY message_templates_insert_policy
ON message_templates
FOR INSERT
WITH CHECK (
    bot_id IN (
        SELECT id FROM bots WHERE user_id = auth.uid()
    )
);

-- Policy for updating templates (users can only update templates for their bots)
CREATE POLICY message_templates_update_policy
ON message_templates
FOR UPDATE
USING (
    bot_id IN (
        SELECT id FROM bots WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    bot_id IN (
        SELECT id FROM bots WHERE user_id = auth.uid()
    )
);

-- Policy for deleting templates (users can only delete templates for their bots)
CREATE POLICY message_templates_delete_policy
ON message_templates
FOR DELETE
USING (
    bot_id IN (
        SELECT id FROM bots WHERE user_id = auth.uid()
    )
); 