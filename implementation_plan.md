# Explicit Shift Scheduling (Date + Time)

This plan shifts the restaurant scheduling architecture from a "recurring daily schedule" to "explicit shift scheduling" where the admin specifies both the start date/time and the end date/time for the current operating shift.

## User Review Required
> [!IMPORTANT]
> This change means the system will **NO LONGER** open automatically every day at a recurring time. You must manually set the "Opening Time" and "Closing Time" dates for **each new shift** using the dashboard. If you fail to update the dates for tomorrow, the restaurant will remain closed!

## Proposed Changes

### Database Schema
#### [NEW] `supabase/migrations/explicit_shift_scheduling.sql`
- Create a migration to change the `opening_time` and `closing_time` columns in `restaurant_settings` from the `TIME` data type to `TIMESTAMPTZ`.
- This allows the database to store full dates (e.g., `June 26, 2026 11:00 AM`) instead of just times (`11:00`).

### Utilities & Logic
#### [MODIFY] `src/lib/utils.ts`
- Dramatically simplify `getEffectiveRestaurantStatus` by replacing all the complex "midnight crossover" math with straightforward timestamp comparisons (`now >= openDate && now < closeDate`).
- Preserve the manual override state machine, but tie it to the explicit shift boundaries.

### Dashboard UI
#### [MODIFY] `src/app/(admin)/dashboard/settings/page.tsx`
- Replace the buggy native `<input type="datetime-local">` with a custom compound input: a native Date picker side-by-side with a 30-minute Time slot dropdown.
- This entirely bypasses the HTML5 validation bug (`Please enter a valid value. The two nearest valid values are...`) caused by the `min` attribute conflicting with `step="1800"`.
- Implement logic to filter out past 30-minute slots if the selected date is "Today".

## Verification Plan
1. Run the database migration.
2. Visit the dashboard and test selecting a date + time combination.
3. Verify that selecting a "Today" date accurately disables past 30-minute time slots in the dropdown.
4. Verify the customer UI reflects the explicit date/time in the CountdownBanner and Menu banner.
