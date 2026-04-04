insert into public.admin_settings (key, value) values ('ob_cost_per_transaction', 0.05)
on conflict (key) do nothing;
