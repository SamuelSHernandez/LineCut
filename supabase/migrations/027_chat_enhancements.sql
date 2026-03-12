-- Chat enhancements: image messages and emoji reactions
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image'));

CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS: users can manage their own reactions on orders they participate in
CREATE POLICY "Users can view reactions on their orders" ON message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN orders o ON o.id = cm.order_id
      WHERE cm.id = message_reactions.message_id
      AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can add reactions on their orders" ON message_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN orders o ON o.id = cm.order_id
      WHERE cm.id = message_reactions.message_id
      AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can remove their own reactions" ON message_reactions
  FOR DELETE USING (user_id = auth.uid());
