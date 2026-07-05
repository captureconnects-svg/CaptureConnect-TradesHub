-- ============================================================
-- Notification System – Tables, RLS, and Realtime
-- Run in Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- ── notifications ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          text NOT NULL,
  message        text NOT NULL,
  type           text NOT NULL,  -- 'booking' | 'payment' | 'message' | 'review' | 'verification' | 'admin' | 'auth'
  link           text,
  is_read        boolean NOT NULL DEFAULT false,
  email_sent     boolean NOT NULL DEFAULT false,
  browser_sent   boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx    ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx    ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications"   ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert any notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can view all notifications"  ON public.notifications;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Any authenticated user can insert a notification for any user_id.
-- This allows cross-user notifications (e.g. client notifying a tradesperson).
CREATE POLICY "Users can insert any notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Enable realtime for the notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ── notification_preferences ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_updates      boolean NOT NULL DEFAULT true,
  payment_updates      boolean NOT NULL DEFAULT true,
  message_updates      boolean NOT NULL DEFAULT true,
  review_updates       boolean NOT NULL DEFAULT true,
  marketing_updates    boolean NOT NULL DEFAULT false,
  browser_notifications boolean NOT NULL DEFAULT true,
  email_notifications  boolean NOT NULL DEFAULT true,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preferences"   ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can upsert own preferences" ON public.notification_preferences;

CREATE POLICY "Users can view own preferences"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can upsert own preferences"
  ON public.notification_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
