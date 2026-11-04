-- Run once after the first migration (npm run db:constraints).
-- Guarantees at the database level that two active bookings, or two blocks,
-- can never overlap on the same court, even under concurrent requests.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS booking_no_overlap;
ALTER TABLE "Booking"
  ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist ("courtId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&)
  WHERE (status IN ('PENDING', 'CONFIRMED'));

ALTER TABLE "CourtBlock" DROP CONSTRAINT IF EXISTS courtblock_no_overlap;
ALTER TABLE "CourtBlock"
  ADD CONSTRAINT courtblock_no_overlap
  EXCLUDE USING gist ("courtId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&);

ALTER TABLE "Booking" ADD CONSTRAINT booking_valid_range CHECK ("endsAt" > "startsAt");
ALTER TABLE "CourtBlock" ADD CONSTRAINT courtblock_valid_range CHECK ("endsAt" > "startsAt");
ALTER TABLE "OpenPlaySession" ADD CONSTRAINT session_valid_range CHECK ("endsAt" > "startsAt");
