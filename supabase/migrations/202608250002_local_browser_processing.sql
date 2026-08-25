alter table public.product_events drop constraint product_events_safe_metadata;

alter table public.product_events add constraint product_events_safe_metadata check (
  jsonb_typeof(metadata) = 'object' and
  case event_name
    when 'document_import_started' then metadata in ('{"sourceKind":"camera"}'::jsonb, '{"sourceKind":"photo"}'::jsonb, '{"sourceKind":"file"}'::jsonb, '{"sourceKind":"text"}'::jsonb)
    when 'document_import_completed' then metadata in ('{"outcome":"processing"}'::jsonb, '{"outcome":"waiting_connection"}'::jsonb)
    when 'document_import_failed' then metadata in ('{"reason":"cancelled"}'::jsonb, '{"reason":"duplicate"}'::jsonb, '{"reason":"validation"}'::jsonb, '{"reason":"local_format"}'::jsonb, '{"reason":"network_or_server"}'::jsonb)
    when 'analysis_completed' then metadata = '{}'::jsonb
    when 'analysis_failed' then metadata in ('{"reason":"invalid_provider_output"}'::jsonb, '{"reason":"processing_failed"}'::jsonb)
    when 'verification_completed' then metadata in ('{"reminderRequested":true}'::jsonb, '{"reminderRequested":false}'::jsonb)
    when 'action_completed' then metadata = '{"kind":"action"}'::jsonb
    when 'deadline_completed_on_time' then metadata = '{}'::jsonb
    when 'search_used' then metadata ? 'resultCount' and metadata - 'resultCount' = '{}'::jsonb and jsonb_typeof(metadata -> 'resultCount') = 'number' and (metadata ->> 'resultCount')::integer between 0 and 100
    when 'reminder_created' then metadata = '{"channel":"local"}'::jsonb
    else false
  end
);
