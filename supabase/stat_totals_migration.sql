-- ============================================================
-- tradesperson_stat_totals
-- Persistent cumulative counters for profile views and likes.
-- A trigger on client_activity keeps these updated atomically,
-- so the totals survive even after activity records expire or
-- are deleted.
-- ============================================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS tradesperson_stat_totals (
  tradesperson_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_profile_views bigint     NOT NULL DEFAULT 0,
  total_likes        bigint      NOT NULL DEFAULT 0,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- 2. Row-level security (tradesperson reads their own row only)
ALTER TABLE tradesperson_stat_totals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select own stat totals"
  ON tradesperson_stat_totals FOR SELECT
  USING (tradesperson_id = auth.uid());

-- 3. Trigger function — SECURITY DEFINER so it can bypass RLS
--    and update any tradesperson's row regardless of caller.
CREATE OR REPLACE FUNCTION update_stat_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.activity_type = 'profile_view' THEN
    INSERT INTO tradesperson_stat_totals (tradesperson_id, total_profile_views, total_likes)
    VALUES (NEW.tradesperson_id, 1, 0)
    ON CONFLICT (tradesperson_id) DO UPDATE
      SET total_profile_views = tradesperson_stat_totals.total_profile_views + 1,
          updated_at = now();

  ELSIF NEW.activity_type = 'like' THEN
    INSERT INTO tradesperson_stat_totals (tradesperson_id, total_profile_views, total_likes)
    VALUES (NEW.tradesperson_id, 0, 1)
    ON CONFLICT (tradesperson_id) DO UPDATE
      SET total_likes = tradesperson_stat_totals.total_likes + 1,
          updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Attach trigger to client_activity
DROP TRIGGER IF EXISTS on_activity_log_update_stats ON client_activity;
CREATE TRIGGER on_activity_log_update_stats
  AFTER INSERT ON client_activity
  FOR EACH ROW EXECUTE FUNCTION update_stat_totals();

-- 5. Backfill from existing activity records (all rows, including expired)
INSERT INTO tradesperson_stat_totals (tradesperson_id, total_profile_views, total_likes)
SELECT
  tradesperson_id,
  COUNT(*) FILTER (WHERE activity_type = 'profile_view') AS total_profile_views,
  COUNT(*) FILTER (WHERE activity_type = 'like')         AS total_likes
FROM client_activity
GROUP BY tradesperson_id
ON CONFLICT (tradesperson_id) DO UPDATE
  SET total_profile_views = EXCLUDED.total_profile_views,
      total_likes         = EXCLUDED.total_likes,
      updated_at          = now();
