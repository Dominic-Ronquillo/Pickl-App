-- Supabase exposes tables in the public schema through its Data API (PostgREST) with the
-- project's public anon key. Courtside only reads and writes through apps/api, so every table
-- gets Row Level Security with no policies: the Data API sees nothing, while the API keeps
-- full access because it connects as the tables' owner (owners bypass RLS unless FORCE is set).
--
-- New tables must do the same: add `ALTER TABLE "<Table>" ENABLE ROW LEVEL SECURITY;` to the
-- migration that creates them.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VenueStaff" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Venue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Court" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PricingRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourtBlock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OpenPlaySession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OpenPlayCourt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OpenPlayRegistration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Game" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GamePlayer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QueueEntry" ENABLE ROW LEVEL SECURITY;

-- Prisma's own bookkeeping table (absent from Prisma's shadow database, hence the check).
DO $$
BEGIN
  IF to_regclass('public."_prisma_migrations"') IS NOT NULL THEN
    ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
