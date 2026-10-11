BEGIN;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS google_sub varchar(255);
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_sub ON public.users (google_sub);
COMMIT;

-- Eski hesaplara subject uydurulmaz veya e-posta tabanlı toplu eşleme yapılmaz.
-- Mevcut uygulama açılmadan önce doğru veritabanında bu geçiş uygulanmalıdır.
