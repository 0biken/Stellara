-- Parent report schedules. pg_cron posts to the report functions through pg_net.
-- The project URL and job secret are read from Vault when a job runs, so neither
-- is stored in this file or in cron.job. An operator creates the Vault secrets
-- `stellara_project_url` and `stellara_job_secret` (equal to the function secret
-- STELLARA_JOB_SECRET). Until both exist, the jobs send nothing.
create extension if not exists pg_net;

select cron.schedule('stellara-report-weekly', '0 17 * * 0', $$
  select net.http_post(
    url := u.decrypted_secret || '/functions/v1/report-weekly',
    headers := jsonb_build_object('content-type', 'application/json',
      'authorization', 'Bearer ' || s.decrypted_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000)
  from vault.decrypted_secrets u, vault.decrypted_secrets s
  where u.name = 'stellara_project_url' and s.name = 'stellara_job_secret'
$$);

select cron.schedule('stellara-report-monthly', '0 17 1 * *', $$
  select net.http_post(
    url := u.decrypted_secret || '/functions/v1/report-monthly',
    headers := jsonb_build_object('content-type', 'application/json',
      'authorization', 'Bearer ' || s.decrypted_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000)
  from vault.decrypted_secrets u, vault.decrypted_secrets s
  where u.name = 'stellara_project_url' and s.name = 'stellara_job_secret'
$$);
