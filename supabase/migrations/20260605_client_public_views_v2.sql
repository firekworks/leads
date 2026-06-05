drop view if exists public.client_dashboard_view;

create or replace view public.client_dashboard_view
with (security_barrier = true)
as
select
  c.id as client_id,
  c.name as client_name,
  c.sector,
  c.city,
  c.logo_url,
  c.client_portal_enabled,
  c.portal_status,
  c.public_leaderboard_name,
  c.show_in_leaderboard,
  mm.id,
  mm.month,
  mm.year,
  mm.reach,
  mm.impressions,
  mm.clicks,
  mm.leads,
  mm.messages,
  mm.bookings,
  mm.calls,
  mm.whatsapp_clicks,
  mm.website_clicks,
  mm.ad_spend,
  mm.service_fee,
  mm.extra_costs,
  mm.estimated_revenue,
  mm.estimated_roi,
  mm.real_revenue,
  mm.real_roi,
  mm.roi_type,
  mm.best_content_id,
  mm.summary_client,
  mm.diagnosis_client,
  mm.next_month_plan_client
from public.clients c
left join public.monthly_metrics mm on mm.client_id = c.id
where c.client_portal_enabled = true
  and private.can_view_client(c.id);

create or replace view public.client_alerts_public_view
with (security_barrier = true)
as
select
  id,
  client_id,
  title,
  severity,
  'client'::text as visibility,
  created_at
from public.alerts
where visible_to_client = true
  and private.can_view_client(client_id);

create or replace view public.client_tasks_public_view
with (security_barrier = true)
as
select
  id,
  client_id,
  title,
  due_date,
  status,
  visible_to_client
from public.tasks
where visible_to_client = true
  and private.can_view_client(client_id);

grant select on public.client_dashboard_view to authenticated;
grant select on public.client_alerts_public_view to authenticated;
grant select on public.client_tasks_public_view to authenticated;
