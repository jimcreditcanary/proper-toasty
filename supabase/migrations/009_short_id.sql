-- Add short_id column for human-readable verification IDs
alter table public.verifications
  add column short_id text unique;

-- Generate short IDs for existing verifications
-- Use a function to generate unique 6-char alphanumeric IDs
-- Excludes 0, O, I, 1 to avoid confusion
create or replace function generate_short_id() returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  loop
    result := '';
    for i in 1..6 loop
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    end loop;
    -- Check uniqueness
    if not exists (select 1 from public.verifications where short_id = result) then
      return result;
    end if;
  end loop;
end;
$$ language plpgsql;

-- Backfill existing verifications
update public.verifications set short_id = generate_short_id() where short_id is null;

-- Make NOT NULL after backfill
alter table public.verifications alter column short_id set not null;
alter table public.verifications alter column short_id set default generate_short_id();
