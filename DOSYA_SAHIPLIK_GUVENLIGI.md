# Dosya sahiplik denetimi

F151: Dosya listeleme ve indirme projeyi mevcut kullanıcıya bağlamıyordu. Analiz/üretim, kullanıcının projesini kontrol ettikten sonra dosyayı bağımsız `file_id` ile seçiyordu; başka bir projenin dosyası bu araya girebiliyordu.

Ortak proje/dosya erişim yardımcıları UUID biçimini, istenen projeyi ve oturumdaki kullanıcıyı birlikte doğrular. Dosya sorgusu proje tablosuna bağlanır ve hem `Project.user_id` hem `ProjectFile.project_id` koşullarını uygular. Yetkisiz veya bulunamayan dosya 404 döner. Açıkça verilen yanlış dosya kimliği, örnek şablon üretimine düşmez. Reddedilen istek disk yoluna bakmadan ve sağlayıcı çağrısı/analiz kaydı/kredi değişimi yapmadan durur.

İki kurgusal kullanıcı, üç proje, üç ayrı disk dosyası ve gerçek PostgreSQL/SQLAlchemy/FastAPI ASGI/JWT ile 17 yeni test yazıldı. Sahip kendi dosyasını listeleyip tam byte içeriğini indirebilir; yetkili analiz/üretim yalnız seçilen dosyayı kullanır. Bu iki olumlu AI denemesinde ücretli sağlayıcı yerine kurgusal sonuç kullanılır. Olumsuz deneyler dosya okuması, sağlayıcı çağrısı, kredi ve analiz mutasyonunun gerçekleşmediğini ayrıca kontrol eder. Dış ağ kapalıdır; hiçbir gerçek kullanıcı/dosya/sağlayıcı kullanılmaz.

Önceki Google/JWT paketinin 39 testi ve mevcut dört kalibrasyon testi de çalıştırılır. Bu PR önceki kimlik güvenliği dalını temel alır; üretime geçiş için o paketteki `google_sub` SQL geçişi ve ayarlar gerekir. Bu paket ek SQL geçişi içermez.

Dosya erişim yetkisi düzeltildi; üretimin kredi rezervasyonu/başarısızlık iadesi ve kalıp kalitesi ayrı açık işlerdir (F152/F155). Üretim/Coolify dağıtımı, ana dal ve gerçek dosyalar değiştirilmedi.
