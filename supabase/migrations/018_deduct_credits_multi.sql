-- Atomic multi-credit deduction. Returns true if the user had enough credits
-- and the count was subtracted; false otherwise. Used when a verification
-- tier costs more than 1 credit (AI valuation = 2, with online reviews = 3).

create or replace function public.deduct_credits(p_user_id uuid, p_count integer)
returns boolean as $$
begin
  if p_count is null or p_count <= 0 then
    return false;
  end if;

  update public.users
  set credits = credits - p_count, updated_at = now()
  where id = p_user_id and credits >= p_count;

  return found;
end;
$$ language plpgsql security definer;
