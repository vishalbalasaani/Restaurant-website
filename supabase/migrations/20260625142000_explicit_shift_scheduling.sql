-- Create a safe transition for existing TIME columns to TIMESTAMPTZ
ALTER TABLE public.restaurant_settings 
  ALTER COLUMN closing_time DROP DEFAULT,
  ALTER COLUMN opening_time DROP DEFAULT;

ALTER TABLE public.restaurant_settings 
  ALTER COLUMN closing_time TYPE TIMESTAMPTZ USING 
    CASE 
      WHEN closing_time < opening_time THEN (CURRENT_DATE + closing_time + interval '1 day')
      ELSE (CURRENT_DATE + closing_time)
    END;

ALTER TABLE public.restaurant_settings 
  ALTER COLUMN opening_time TYPE TIMESTAMPTZ USING (CURRENT_DATE + opening_time);
