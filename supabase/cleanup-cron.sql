-- Local Drop: auto-delete files after 30 days
-- Jalankan setelah Edge Function `delete-expired-files` sudah di-deploy.
--
-- 1) Ganti PROJECT_REF dengan project reference Supabase kamu.
-- 2) Buat secret acak dan simpan di Vault dengan nama cleanup_secret.
-- 3) Deploy function dengan environment variable CLEANUP_SECRET yang sama.
--
-- Contoh membuat secret di Vault:
-- select vault.create_secret('GANTI_DENGAN_SECRET_ACAK', 'cleanup_secret');
--
-- Jika cron lama pernah dibuat, hapus dulu dengan:
-- select cron.unschedule('local-drop-delete-expired-files');

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Simpan secret hanya di Vault, jangan taruh secret di frontend.
-- select vault.create_secret('GANTI_DENGAN_SECRET_ACAK', 'cleanup_secret');

select cron.schedule(
  'local-drop-delete-expired-files',
  '15 0 * * *',
  $$
  select net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/delete-expired-files',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cleanup-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cleanup_secret' limit 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
