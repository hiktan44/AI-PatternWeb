# Google giriş, JWT ve sunucu adı güvenliği

F156, F157 ve F159 için kaynak düzeltmesi. Google girişi artık resmi SDK ile imza, uygulama audience'ı, issuer ve süreyi doğrular. Sertifika isteğinde token taşınmaz ve zaman aşımı beş saniyedir. Sunucuda `GOOGLE_CLIENT_ID` eksikse giriş kapalıdır. Uygulamanın mevcut GSI tarayıcı akışı ID tokenı kullanır; eski access-token alternatifi kabul edilmez.

Hesaplar benzersiz `google_sub` üzerinden bulunur. E-posta değişse de aynı subject yeni hesap, tekrar deneme süresi veya tekrar kredi vermez. Yeni kayıt mevcut 50 kredi/14 günlük deneme kuralını korur. Eşzamanlı kayıtlar benzersiz indeks ve işlem geri alma ile aynı hesabı kullanır; eski hesaba bağlantı satır kilidiyle korunur. Devre dışı hesaplar Google, HTTP ve WebSocket girişinde reddedilir.

Google'ın yetkili olduğu Gmail veya doğrulanmış Workspace adresi, önceden doğrulanmış yerel hesaba bir kez bağlanabilir. Doğrulanmamış yerel hesap, dış e-posta veya başka subject'e bağlı hesap otomatik bağlanmaz. Bu hesaplar için ayrı parola/e-posta doğrulamalı bağlama ekranı bu paketin kapsamında değildir. Eski Google hesaplarında `email_verified` true ise yetkili Gmail/Workspace adresi ilk geçerli girişte bağlanabilir; dış e-posta kullanan eski hesaplar güvenli bağlama tamamlanana kadar bu giriş yolunda 409 alır.

Bu politika [Google'ın ID token doğrulama ve e-posta sahipliği rehberine](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token) dayanır. Kalıcı kimlik subject'tir; `email_verified` tek başına Google dışındaki adresin güncel sahipliğini kanıtlamaz.

JWT sır değeri artık zorunlu `SecretStr` alanıdır: eksik, kısa, düşük çeşitlilikteki veya bilinen yer tutucu değerle uygulama başlayamaz. JWT imzalama, HTTP doğrulama ve WebSocket doğrulama açık değerini yalnız kripto çağrısında kullanır. Genel `*` TrustedHost izni kaldırılmıştır; `TRUSTED_HOSTS` sadece açıkça izin verilen sunucuları içerir. Docker Compose eksik JWT/host ayarıyla başlamaz. Google web istemci kimliği backend'e ve frontend derleme argümanına aynı ayardan aktarılır.

## Üretim geçişi

Bu PR ana dala birleştirilmedi, dağıtılmadı; canlı veri, hesap, parola veya sır değiştirilmedi.

1. Doğru uygulama veritabanını ve yedeğini doğruladıktan sonra `backend/migrations/20261012_google_identity.sql` geçişini uygulayın. `create_all`, mevcut tabloya yeni sütun eklemez. Geçiş eski hesapları topluca e-postayla bağlamaz.
2. Güçlü ayrı `JWT_SECRET` üretip Coolify gizli ayarına girin. Mevcut güvenli sır korunabilir; değiştirirseniz eski JWT oturumları geçersiz olur. `.env.example` bu nedenle boş sır içerir.
3. `TRUSTED_HOSTS` içine gerçek backend alan adını ve kullanılan yerel sağlık kontrolü adlarını ekleyin. `ALLOWED_ORIGINS` ayrı bir tarayıcı kaynak iznidir. Genel `*` eklemeyin. `ENVIRONMENT=production` kullanın.
4. `GOOGLE_CLIENT_ID` ile tarayıcının `NEXT_PUBLIC_GOOGLE_CLIENT_ID` değerini aynı web istemcisine ayarlayın. Compose bunu derleme argümanıyla yapar. Doğrudan Docker derlemesinde argümanı ayrıca verin ve frontend'i yeniden derleyin.
5. Dağıtımdan sonra doğru Google hesabıyla giriş, eski hesap geçişi, devre dışı hesap, yabancı Host reddi ve sağlık kontrolünü doğrulayın.

## Test kapsamı

Gerçek Google SDK ve RSA imzaları, gerçek FastAPI ASGI/HTTP/WebSocket/JWT, SQLAlchemy ve ayrı PostgreSQL veritabanı kullanılır. Yalnız Google sertifika HTTP taşıması kurgusal sertifikaya yönlendirilir; token doğrulayıcısı veya kimlik iddiaları taklit edilmez. Harici TCP/UDP bağlantıları engellenir; test ortamı kullanıcının `.env` dosyasını ve sağlayıcı anahtarlarını okumaz. Standart test çalıştırıcısı yerel `codex_aipattern_auth_` önekli ayrı veritabanı gerektirir.

```sh
AIPATTERN_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/codex_aipattern_auth_deneme python backend/scripts/test-auth-security.py
```

39 yeni test; ayrıca mevcut dört saf kalibrasyon testi çalışır. Yanlış audience/issuer/imza, süre, eksik subject, e-posta güveni, devre dışı kullanıcı, token sınırı, eşzamanlı kayıt/bağlama, üretim Host reddi, gerçek uygulama açılışı ve tekrarlanabilir eski şema geçişi kapsanır. SQLAlchemy'nin Apple işlemcideki asyncio bağımlılığı için [resmi kurulum biçimi](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html#asyncio-platform-installation-notes-including-apple-m1) kullanılmıştır.

Gerçek Google hesabı/sertifika servisi, tarayıcı OAuth yönlendirmesi, üretim proxy/Coolify dağıtımı ve ücretli Vertex/ödeme akışları denenmedi. Dosya sahipliği, kalıp kalitesi, kredi tüketimi ve abonelik geliştirmeleri bu üç bulgudan ayrıdır; açık kalır. Mevcut paketlerin genel güvenlik güncellemesi de ayrıca değerlendirilmelidir.
