# Local Drop — Auto Delete 30 Hari

Semua file baru dari website sekarang mengikuti satu kebijakan: **tersedia maksimal 30 hari**. Tidak ada toggle permanen di UI.

## Apa yang berubah

- Upload selalu memakai nama `file_<timestamp>_<nama-file>`.
- Tidak ada `autoDelete`, `perm_`, atau pilihan penyimpanan permanen di frontend.
- Halaman file menampilkan sisa masa simpan, misalnya `Tersisa 18 hari`.
- Daftar file memakai pengurutan Terbaru/Terlama, bukan filter 30 hari/permanen.
- Cleanup dilakukan di Supabase Edge Function, bukan timer browser.
- Supabase Cron menjalankan cleanup otomatis setiap hari.
- Cleanup menghapus **semua object di bucket `files` yang lebih tua dari 30 hari**, termasuk file lama yang sebelumnya memakai prefix `perm_` atau `temp_30d_`.

## 1. Deploy Edge Function

Pastikan Supabase CLI sudah terhubung ke project.

```bash
supabase functions deploy delete-expired-files --no-verify-jwt
```

Set environment variable `CLEANUP_SECRET` pada Edge Function. Jangan pernah menaruh secret ini di HTML/JS frontend.

Contoh:

```bash
supabase secrets set CLEANUP_SECRET="SECRET_ACAK_YANG_PANJANG"
```

`SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` tersedia untuk Edge Function melalui environment Supabase. Jangan masukkan service-role key ke frontend.

## 2. Aktifkan Cron

Buka SQL Editor Supabase.

Di `supabase/cleanup-cron.sql`:

1. Ganti `PROJECT_REF` dengan project reference kamu.
2. Buat secret Vault dengan nilai **yang sama persis** dengan `CLEANUP_SECRET`.
3. Jalankan SQL tersebut.

Contoh pembuatan secret:

```sql
select vault.create_secret('SECRET_ACAK_YANG_PANJANG', 'cleanup_secret');
```

Lalu jalankan blok `cron.schedule`.

Cron di contoh berjalan setiap hari pukul 00:15 UTC. File yang sudah lebih dari 30 hari akan dihapus pada eksekusi cleanup berikutnya.

## 3. Tes manual

Untuk menguji function sebelum menunggu Cron, kirim request dengan header `x-cleanup-secret` yang benar:

```bash
curl -X POST \
  'https://PROJECT_REF.supabase.co/functions/v1/delete-expired-files' \
  -H 'x-cleanup-secret: SECRET_ACAK_YANG_PANJANG' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Response akan memberi jumlah object yang ditemukan dan dihapus.

## Catatan penting

Website menggunakan bucket `files`. Function menghapus berdasarkan `created_at`, bukan berdasarkan nama file. Jadi prefix lama tidak lagi menentukan masa simpan.

Jika kamu tidak ingin file lama ikut terhapus, ubah function agar hanya menargetkan prefix `file_`. Versi paket ini sengaja menggunakan kebijakan global 30 hari agar aturan baru benar-benar konsisten.
