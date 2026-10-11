# Kalite kontrolü salt okunur

F153: `qa-validate` GET isteği, analiz yokken örnek kalıbı başarılı analiz ve 0,95 güven skoru olarak kaydediyordu. Şimdi yalnız kullanıcının yetkili projesindeki en güncel gerçek kalıp parçalarını kontrol eder. Dosya, analiz, güven skoru, kredi veya denetim kaydı oluşturmaz/değiştirmez. GET kalite hatası için webhook da göndermez; ayrı POST otomatik düzeltme akışı kendi bildirimini korur.

Analizsiz proje/dosya, boş analiz, işaretli örnek sonuç, sağlayıcı hatası, parçasız veya bozuk koordinatlı kayıt 409 ve Türkçe açıklama döndürür. `uploads/demo_pattern.png` yolu eski örnek kaydı olarak reddedilir. Yeni analiz örnek/hatalıysa eski başarılı analize geri dönüp onay verilmez. Geometri doğrulayıcıya kopyalanır ve gerçek proje kategorisi aktarılır. Mevcut istemci `detail` metnini ilk kalite kontrolü hatasında gösterir.

16 yeni test gerçek PostgreSQL/SQLAlchemy/FastAPI ASGI/JWT kullanır. Dosya/analiz/kredi/denetim kaydı snapshot'ı, SQL sorgularının yalnız SELECT olması, commit ve webhook bulunmaması doğrulanır. Bilinen kurgusal geometri gerçek kalite doğrulayıcısının sonucuyla karşılaştırılır; kendini kesen kalıp ve yinelenen GET de yazma/bildirim oluşturmaz. Önceki 56 kimlik/sahiplik testi ve mevcut dört kalibrasyon testi ayrıca çalışır. Dış ağ kapalıdır; gerçek kullanıcı/kalıp/AI hizmeti kullanılmaz.

Bu kaynak değişikliği #2 dosya sahipliği dalına dayanır; önceki kimlik geçişi ve ayarları gerekir. Üretim dağıtımı veya gerçek kayıtlarda toplu temizleme yapılmadı. Eski sürüm mevcut dosyanın içine işaretsiz örnek geometri yazmışsa bunu güvenilir şekilde ayırmak mümkün değildir; bu kayıtlar ayrıca incelenip yeniden gerçek analizden geçirilmelidir. Yalnız yol/işaret ile açıkça saptanabilen örnekler reddedilir.

Kalıbın üretim doğruluğu, eksik ölçü kontrolleri, kaydedilmeyen yeni üretim sürümleri, DXF'nin doğru sürümü kullanması ve arayüzün önceki kalite sonucunu önbellekte tutması ayrı açık işlerdir. Bu PR salt okunur API davranışını doğrular; tam üretim kalite onayı vermez.
