-- ============================================================
-- HotByte Migration: Add hotel_type column to hotels table
-- Run this script on existing databases to add Hotel Type support.
-- Safe to run multiple times (uses IF NOT EXISTS).
-- ============================================================

-- Step 1: Add the hotel_type column with a default of 'both'
ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS hotel_type varchar(10) DEFAULT 'both';

-- Step 2: Add the CHECK constraint (only if it doesn't already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'hotels_hotel_type_check' 
    AND conrelid = 'public.hotels'::regclass
  ) THEN
    ALTER TABLE public.hotels
      ADD CONSTRAINT hotels_hotel_type_check 
      CHECK (hotel_type IN ('veg', 'nonveg', 'both'));
  END IF;
END $$;

-- Step 3: Set all existing hotels to 'both' (for any NULLs)
UPDATE public.hotels 
SET hotel_type = 'both' 
WHERE hotel_type IS NULL;

-- Verify migration
SELECT hotel_id, name, hotel_type FROM public.hotels ORDER BY hotel_id;
