-- Defensive idempotent re-create of the credit deduction SQL functions.
--
-- Migration 018 originally introduced these in the parent who-am-i-paying
-- schema, but as we found with migration 036, several pre-Propertoasty
-- migrations were never actually applied to this Supabase project.
-- Including them here so the credit-gated lead acceptance flow has
-- somewhere to call.
--
-- Both are SECURITY DEFINER so RLS doesn't get in the way when callers
-- (route handlers using the service-role admin client) invoke them.

create or replace function public.deduct_credit(p_user_id uuid)
returns boolean as $$
begin
  update public.users
  set credits = credits - 1, updated_at = now()
  where id = p_user_id and credits > 0;
  return found;
end;
$$ language plpgsql security definer;

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

notify pgrst, 'reload schema';
