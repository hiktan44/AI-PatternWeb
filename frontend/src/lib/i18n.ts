"use client";
import { useLang, type Lang } from "@/lib/use-lang";

/**
 * Basit anahtar-bazlı çeviri sözlüğü.
 * Yeni metin eklerken: hem tr hem en doldur — fallback yoksa key görünür.
 *
 * Kullanım:
 *   const t = useT();
 *   <h1>{t("nav.home")}</h1>
 */

type Dict = Record<string, { tr: string; en: string }>;

const DICT: Dict = {
  // ─── Header / nav ───
  "nav.features": { tr: "Özellikler", en: "Features" },
  "nav.how": { tr: "Nasıl Çalışır", en: "How It Works" },
  "nav.pricing": { tr: "Fiyatlar", en: "Pricing" },
  "nav.demo": { tr: "Demo", en: "Demo" },
  "nav.start": { tr: "Ücretsiz Başla", en: "Start Free" },
  "nav.dashboard": { tr: "Dashboard", en: "Dashboard" },
  "nav.projects": { tr: "Projeler", en: "Projects" },
  "nav.patterns": { tr: "Kalıplar", en: "Patterns" },
  "nav.templates": { tr: "Şablonlar", en: "Templates" },
  "nav.billing": { tr: "Plan & Kredi", en: "Plan & Credits" },
  "nav.settings": { tr: "Ayarlar", en: "Settings" },
  "nav.logout": { tr: "Çıkış", en: "Logout" },
  "nav.search": { tr: "Proje ara...", en: "Search projects..." },

  // ─── Hero section ───
  "hero.badge": { tr: "Yeni: Stripe Eşleşmeli Otomatik Marker", en: "New: Stripe Matched Auto Marker" },
  "hero.headline1": { tr: "Fotoğraftan", en: "From photo to" },
  "hero.headline2": { tr: "üretime hazır", en: "production ready" },
  "hero.headline3": { tr: "kalıba.", en: "patterns." },
  "hero.subtitle": { tr: "Görsel, eskiz veya ölçü tablosu yükleyin. Yapay zeka destekli, kural tabanlı sistemimiz sizi DXF export'a kadar güvenle taşıyın.", en: "Upload images, sketches or measurement charts. Our AI-powered, rule-based system safely guides you to DXF export." },
  "hero.cta": { tr: "14 Gün Ücretsiz Dene", en: "Try 14 Days Free" },
  "hero.demo": { tr: "Demo İzle", en: "Watch Demo" },
  
  "hero.stat1": { tr: "Ölçü doğruluk oranı", en: "Measurement accuracy rate" },
  "hero.stat2": { tr: "Manuel kalıba kıyasla hız", en: "Speed vs manual patterns" },
  "hero.stat3": { tr: "Ortalama fire düşüşü", en: "Average waste reduction" },

  // ─── Trusted brands ───
  "logos.label": { tr: "Güvenen markalar", en: "Trusted brands" },

  // ─── Features section ───
  "features.title": { tr: "Üretim zincirinin her adımı için", en: "For every step of the production chain" },
  "features.subtitle": { tr: "Fotoğraftan export'a kadar her aşamada doğrulama katmanlı, kural tabanlı mühendislik.", en: "Validation-layered, rule-based engineering at every stage from photo to export." },
  
  "features.f1.title": { tr: "Görselden Kalıp Çıkarımı", en: "Pattern Extraction from Images" },
  "features.f1.desc": { tr: "Ürün fotoğrafı, eskiz veya teknik çizim yükleyin. AI otomatik kategori tespit ederek ön kalıp taslağını oluşturur. Düşük güven skorunda sistem size soru sorar.", en: "Upload product photos, sketches or technical drawings. AI automatically detects the category and creates a preliminary pattern draft. The system asks you questions when confidence is low." },
  
  "features.f2.title": { tr: "Ölçü Kalibrasyon Motoru", en: "Measurement Calibration Engine" },
  "features.f2.desc": { tr: "Kütüphane + ölçü tablosu + kullanıcı onayı üçlüsüyle çalışır. Tolerans dışı her bölge işaretlenir. Sistem emin olmadığını asla gizlemez.", en: "Works with a triple combination of library + size chart + user approval. Areas outside tolerance are marked. The system never hides its uncertainties." },
  
  "features.f3.title": { tr: "Otomatik Serileme", en: "Automatic Grading" },
  "features.f3.desc": { tr: "Baz bedenden hedef beden setini saniyeler içinde türetin. TSE, EU ve ABD standartları dahili. Nokta bazlı grading özelleştirme desteği.", en: "Generate target size set from base size in seconds. Built-in TSE, EU and US standards. Point-based grading customization support." },
  
  "features.f4.title": { tr: "Dikiş Payı Yönetimi", en: "Seam Allowance Management" },
  "features.f4.desc": { tr: "Segment bazlı dikiş payı tanımlaması. Notch, drill, grainline, fold mark ve annotation otomatik. Üretim kuralı kütüphanesi kaydedilebilir.", en: "Segment-based seam allowance definition. Automatic notch, drill, grainline, fold mark and annotation. Production rule library can be saved." },
  
  "features.f5.title": { tr: "Minimum Fireli Pastal", en: "Minimum Waste Marker" },
  "features.f5.desc": { tr: "Kumaş eni, nap yönü, desen eşleşmesi ve serim tipine göre optimum marker. Fire raporunu indirin, alternatif yerleşimleri karşılaştırın.", en: "Optimal marker based on fabric width, nap direction, pattern matching and spreading type. Download waste report, compare alternative layouts." },
  
  "features.f6.title": { tr: "QA Validation ve Export", en: "QA Validation and Export" },
  "features.f6.desc": { tr: "Export öncesi 40+ otomatik kontrol. Açık contour, eksik grainline veya isimsiz parça varsa export kilitlenir. DXF, PDF ve üretim raporu.", en: "40+ automatic controls before export. Export is blocked if there are open contours, missing grainlines or unnamed pieces. DXF, PDF and production report." },

  // ─── How it works section ───
  "how.title": { tr: "4 adımda üretime hazır kalıp", en: "Production-ready pattern in 4 steps" },
  "how.subtitle": { tr: "Her adımda sistem ya sizi yönlendirir ya da onayınızı alır. Hata üretime gitmez.", en: "At each step, the system either guides you or asks for your approval. Errors don't reach production." },
  
  "how.step1.title": { tr: "Görsel veya Çizim Yükle", en: "Upload Image or Drawing" },
  "how.step1.desc": { tr: "Fotoğraf, eskiz, teknik çizim veya DXF. Sistem kalite kontrolü yapar, ürün kategorisini tespit eder ve ön kalıp yapısını çıkarır.", en: "Photo, sketch, technical drawing or DXF. System performs quality control, detects product category and extracts preliminary pattern structure." },
  
  "how.step2.title": { tr: "Ölçü ve Onay", en: "Measurements and Approval" },
  "how.step2.desc": { tr: "Belirsiz alanlar için yapılandırılmış sorular sorulur. Ölçü tablosu verilir, sistem parametrik oturtma yapar ve kalıbı kilitler.", en: "Structured questions are asked for uncertain areas. Size chart is provided, system performs parametric fitting and locks the pattern." },
  
  "how.step3.title": { tr: "Seri ve Pastal", en: "Grading and Marker" },
  "how.step3.desc": { tr: "Beden serisi otomatik oluşur. Kumaş eni ve serim tipi girilir, minimum fireli marker hesaplanır. Fire raporu hazır.", en: "Size series is automatically generated. Fabric width and spreading type are entered, minimum waste marker is calculated. Waste report is ready." },
  
  "how.step4.title": { tr: "QA ve Export", en: "QA and Export" },
  "how.step4.desc": { tr: "40+ otomatik kontrol. Passed statüsünde DXF, PDF ve üretim raporu export edilir. Lectra, Gerber ve benzeri CAD sistemleriyle uyumlu.", en: "40+ automatic controls. When Passed, DXF, PDF and production report are exported. Compatible with Lectra, Gerber and similar CAD systems." },

  // ─── Video section ───
  "video.title": { tr: "Görmek inanmaktır", en: "Seeing is believing" },
  "video.badge": { tr: "Kalıp parçası", en: "Pattern piece" },
  "video.part": { tr: "Ön Beden", en: "Front Body" },
  "video.verified": { tr: "Doğrulandı", en: "Verified" },
  "video.confidence": { tr: "Güven", en: "Confidence" },
  "video.high": { tr: "Yüksek", en: "High" },
  "video.time": { tr: "Süre", en: "Time" },
  "video.complete": { tr: "Analiz tamam", en: "Analysis complete" },
  "video.title2": { tr: "Fotoğraftan DXF'e: Canlı Demo", en: "From Photo to DXF: Live Demo" },
  "video.subtitle": { tr: "Basic gömlek — 45 saniye — Gerber uyumlu çıktı", en: "Basic shirt — 45 seconds — Gerber compatible output" },

  // ─── Pricing section ───
  "pricing.title": { tr: "Her ölçeğe uygun plan", en: "Plans for every scale" },
  "pricing.subtitle": { tr: "14 gün ücretsiz deneyin. Kredi kartı gerekmez.", en: "Try free for 14 days. No credit card required." },
  
  "pricing.starter": { tr: "Starter", en: "Starter" },
  "pricing.free": { tr: "Ücretsiz", en: "Free" },
  "pricing.forever": { tr: "Sonsuza kadar", en: "Forever" },
  "pricing.starter.desc": { tr: "Öğrenciler ve freelancer'lar için temel özellikler.", en: "Basic features for students and freelancers." },
  
  "pricing.professional": { tr: "Professional", en: "Professional" },
  "pricing.professional.price": { tr: "₺1.490", en: "₺1,490" },
  "pricing.period": { tr: "/ay · yıllıkta %20 indirim", en: "/month · 20% off annual" },
  "pricing.professional.desc": { tr: "Atölyeler, KOBİ markalar ve freelance modelistler için.", en: "For workshops, SME brands and freelance pattern makers." },
  
  "pricing.studio": { tr: "Studio", en: "Studio" },
  "pricing.studio.price": { tr: "₺4.290", en: "₺4,290" },
  "pricing.studio.desc": { tr: "Üretim grupları, kalıp ofisleri ve ekip çalışması için.", en: "For production groups, pattern offices and team work." },
  "pricing.popular": { tr: "En Popüler", en: "Most Popular" },
  
  "pricing.enterprise": { tr: "Enterprise", en: "Enterprise" },
  "pricing.custom": { tr: "Özel", en: "Custom" },
  "pricing.quote": { tr: "Teklif alın", en: "Get Quote" },
  "pricing.enterprise.desc": { tr: "Fason firmalar, çok markalı gruplar ve PLM entegrasyonu için.", en: "For contractor firms, multi-brand groups and PLM integration." },
  
  "pricing.start": { tr: "Başla", en: "Start" },
  "pricing.try": { tr: "14 Gün Dene", en: "Try 14 Days" },
  "pricing.contact": { tr: "İletişime Geç", en: "Contact Us" },

  // ─── Testimonials section ───
  "testimonials.title": { tr: "Kullanıcı Yorumları", en: "User Reviews" },
  "testimonials.subtitle": { tr: "Üreticiler ne diyor?", en: "What do producers say?" },

  // ─── CTA section ───
  "cta.badge": { tr: "14 gün ücretsiz · Kredi kartı yok", en: "14 days free · No credit card" },
  "cta.title": { tr: "Üretim güvenli kalıpa bugün geçin.", en: "Switch to production-safe patterns today." },
  "cta.subtitle": { tr: "Binlerce konfeksiyoncu ve modelistle birlikte — fotoğraftan DXF'e, dakikalar içinde.", en: "With thousands of garment manufacturers and pattern makers — from photo to DXF in minutes." },
  "cta.start": { tr: "Ücretsiz Başla", en: "Start Free" },
  "cta.demo": { tr: "Demo İzle", en: "Watch Demo" },
  "cta.note": { tr: "Türkiye'de barındırılır · KVKK uyumlu · TSE standartları destekli", en: "Hosted in Turkey · KVKK compliant · TSE standards supported" },

  // ─── Footer ───
  "footer.desc": { tr: "Fotoğraftan üretime hazır kalıba. Yapay zeka destekli, kural tabanlı, üretim güvenli pattern engineering platformu.", en: "From photo to production-ready patterns. AI-powered, rule-based, production-safe pattern engineering platform." },
  "footer.product": { tr: "Ürün", en: "Product" },
  "footer.company": { tr: "Şirket", en: "Company" },
  "footer.support": { tr: "Destek", en: "Support" },
  "footer.copyright": { tr: "© 2026 AI-PatternWeb. Tüm hakları saklıdır.", en: "© 2026 AI-PatternWeb. All rights reserved." },
  "footer.kvkk": { tr: "KVKK Uyumlu", en: "KVKK Compliant" },
  "footer.tse": { tr: "TSE Standartları", en: "TSE Standards" },
  "footer.hosted": { tr: "Türkiye'de Barındırılır", en: "Hosted in Turkey" },

  // ─── Auth / Login ───
  "auth.signin.title": { tr: "Hesabınıza giriş yapın", en: "Sign in to your account" },
  "auth.signup.title": { tr: "Ücretsiz hesap oluşturun", en: "Create your free account" },
  "auth.google": { tr: "Google ile Giriş Yap", en: "Sign in with Google" },
  "auth.or": { tr: "veya", en: "or" },
  "auth.name": { tr: "Ad Soyad", en: "Full Name" },
  "auth.email": { tr: "Email", en: "Email" },
  "auth.password": { tr: "Şifre", en: "Password" },
  "auth.signin": { tr: "Giriş Yap", en: "Sign In" },
  "auth.signup": { tr: "Kayıt Ol", en: "Sign Up" },
  "auth.loading": { tr: "Yükleniyor...", en: "Loading..." },
  "auth.noaccount": { tr: "Hesabınız yok mu?", en: "Don't have an account?" },
  "auth.haveaccount": { tr: "Zaten hesabınız var mı?", en: "Already have an account?" },
  "auth.signup.link": { tr: "Ücretsiz Kayıt Ol", en: "Sign Up Free" },
  "auth.trial": { tr: "14 gün ücretsiz deneme · Kredi kartı gerekmez", en: "14 days free trial · No credit card required" },
  "auth.error.google": { tr: "Google ile giriş yakında aktif olacak. Lütfen email ile devam edin.", en: "Google login will be available soon. Please continue with email." },

  // ─── Dashboard ───
  "dashboard.loading": { tr: "Yükleniyor...", en: "Loading..." },
  "dashboard.credits": { tr: "Kredi", en: "Credits" },

  // ─── Common ───
  "common.loading": { tr: "Yükleniyor...", en: "Loading..." },
  "common.search": { tr: "Ara", en: "Search" },
  "common.save": { tr: "Kaydet", en: "Save" },
  "common.cancel": { tr: "İptal", en: "Cancel" },
  "common.edit": { tr: "Düzenle", en: "Edit" },
  "common.delete": { tr: "Sil", en: "Delete" },
  "common.back": { tr: "Geri", en: "Back" },
  "common.next": { tr: "İleri", en: "Next" },
  "common.submit": { tr: "Gönder", en: "Submit" },
  "common.close": { tr: "Kapat", en: "Close" },
  "common.error": { tr: "Hata", en: "Error" },
  "common.success": { tr: "Başarılı", en: "Success" },
  "common.try": { tr: "Tekrar Dene", en: "Try Again" },
  "common.yes": { tr: "Evet", en: "Yes" },
  "common.no": { tr: "Hayır", en: "No" },

  // ─── Language switcher ───
  "lang.switch": { tr: "Dil", en: "Language" },
  "lang.tr": { tr: "Türkçe", en: "Turkish" },
  "lang.en": { tr: "İngilizce", en: "English" },

  // ─── Billing ───
  "billing.title": { tr: "Plan & Kredi", en: "Plan & Credits" },
  "billing.subtitle": { tr: "Mevcut planınız ve kredi durumunuz", en: "Your current plan and credit status" },
  "billing.currentPlan": { tr: "Mevcut Plan", en: "Current Plan" },
  "billing.creditsRemaining": { tr: "Kalan Kredi", en: "Credits Remaining" },
  "billing.projectUsage": { tr: "Proje Kullanımı", en: "Project Usage" },
  "billing.trialDays": { tr: "Trial Kalan Gün", en: "Trial Days Left" },
  "billing.compare": { tr: "Planları Karşılaştır", en: "Compare Plans" },
  "billing.credits": { tr: "kredi", en: "credits" },
  "billing.upgrade": { tr: "Yükselt", en: "Upgrade" },
  "billing.currentPlanBtn": { tr: "Mevcut Plan", en: "Current Plan" },

  // ─── Dashboard ───
  "dashboard.title": { tr: "Dashboard", en: "Dashboard" },
  "dashboard.subtitle": { tr: "Projelerinizin ve üretim süreçlerinizin genel görünümü", en: "Overview of your projects and production processes" },
  "dashboard.activeProjects": { tr: "Aktif Proje", en: "Active Projects" },
  "dashboard.patternsCreated": { tr: "Kalıp Oluşturuldu", en: "Patterns Created" },
  "dashboard.exportsMade": { tr: "Export Yapıldı", en: "Exports Made" },
  "dashboard.creditsLeft": { tr: "Kalan Kredi", en: "Credits Left" },
  "dashboard.recentProjects": { tr: "Son Projeler", en: "Recent Projects" },
  "dashboard.newProject": { tr: "Yeni Proje Oluştur", en: "Create New Project" },

  // ─── Patterns ───
  "patterns.title": { tr: "Kalıplar", en: "Patterns" },
  "patterns.subtitle": { tr: "Oluşturduğunuz ve import ettiğiniz kalıplar", en: "Your created and imported patterns" },
  "patterns.totalPatterns": { tr: "Toplam Kalıp", en: "Total Patterns" },
  "patterns.dxfExports": { tr: "DXF Export", en: "DXF Exports" },
  "patterns.graded": { tr: "Serileme Yapılan", en: "Graded Patterns" },
  "patterns.noPatterns": { tr: "Henüz kalıp yok", en: "No patterns yet" },
  "patterns.noPatternsDesc": { tr: "Bir proje oluşturup görsel yükleyin veya DXF import edin.", en: "Create a project and upload an image or import DXF." },
  "patterns.createProject": { tr: "Proje Oluştur", en: "Create Project" },

  // ─── Projects ───
  "projects.title": { tr: "Projeler", en: "Projects" },
  "projects.subtitle": { tr: "Kalıp projelerinizi yönetin", en: "Manage your pattern projects" },
  "projects.newProject": { tr: "Yeni Proje", en: "New Project" },
  "projects.createProject": { tr: "Yeni Proje Oluştur", en: "Create New Project" },
  "projects.modalTitle": { tr: "Yeni Proje Oluştur", en: "Create New Project" },
  "projects.projectName": { tr: "Proje Adı", en: "Project Name" },
  "projects.projectNamePlaceholder": { tr: "örn: Yaz Koleksiyonu Gömlek", en: "e.g., Summer Collection Shirt" },
  "projects.category": { tr: "Ürün Kategorisi", en: "Product Category" },
  "projects.season": { tr: "Sezon", en: "Season" },
  "projects.seasonPlaceholder": { tr: "örn: SS26", en: "e.g., SS26" },
  "projects.brand": { tr: "Marka", en: "Brand" },
  "projects.brandPlaceholder": { tr: "örn: AVVA", en: "e.g., AVVA" },
  "projects.cancel": { tr: "İptal", en: "Cancel" },
  "projects.create": { tr: "Oluştur", en: "Create" },
  "projects.useTemplate": { tr: "Bu Şablonla Proje Oluştur", en: "Create Project with This Template" },

  // Category names
  "projects.category.tshirt": { tr: "Tişört", en: "T-Shirt" },
  "projects.category.shirt": { tr: "Gömlek", en: "Shirt" },
  "projects.category.dress": { tr: "Elbise", en: "Dress" },
  "projects.category.skirt": { tr: "Etek", en: "Skirt" },
  "projects.category.pants": { tr: "Pantolon", en: "Pants" },
  "projects.category.kids_top": { tr: "Çocuk Üst", en: "Kids Top" },
  "projects.category.outerwear": { tr: "Outerwear", en: "Outerwear" },

  // Status labels
  "projects.status.draft": { tr: "Taslak", en: "Draft" },
  "projects.status.in_review": { tr: "İncelemede", en: "In Review" },
  "projects.status.approved": { tr: "Onaylı", en: "Approved" },
  "projects.status.production_ready": { tr: "Üretime Hazır", en: "Production Ready" },

  // ─── Settings ───
  "settings.title": { tr: "Ayarlar", en: "Settings" },
  "settings.subtitle": { tr: "Hesap ve tercih ayarlarınız", en: "Account and preference settings" },
  "settings.profileInfo": { tr: "Profil Bilgileri", en: "Profile Information" },
  "settings.name": { tr: "Ad Soyad", en: "Full Name" },
  "settings.email": { tr: "Email", en: "Email" },
  "settings.measurementPrefs": { tr: "Ölçü Tercihleri", en: "Measurement Preferences" },
  "settings.measurementUnit": { tr: "Ölçü Birimi", en: "Measurement Unit" },
  "settings.gradingStandard": { tr: "Grading Standardı", en: "Grading Standard" },
  "settings.defaultFabricWidth": { tr: "Varsayılan Kumaş Eni", en: "Default Fabric Width" },
  "settings.dxfFormat": { tr: "DXF Çıktı Formatı", en: "DXF Output Format" },
  "settings.seamAllowanceLib": { tr: "Dikiş Payı Kütüphanesi", en: "Seam Allowance Library" },
  "settings.seamAllowanceDesc": { tr: "Varsayılan dikiş payı değerlerini belirleyin. Proje bazında özelleştirilebilir.", en: "Set default seam allowance values. Can be customized per project." },
  "settings.cm": { tr: "cm", en: "cm" },
  "settings.inch": { tr: "inch", en: "inch" },
  "settings.save": { tr: "Kaydet", en: "Save" },
  "settings.tseStandard": { tr: "TSE EN 13402", en: "TSE EN 13402" },
  "settings.euStandard": { tr: "EU EN 13402", en: "EU EN 13402" },
  "settings.astmStandard": { tr: "ASTM D5585", en: "ASTM D5585" },
  "settings.fabric150": { tr: "150 cm", en: "150 cm" },
  "settings.fabric140": { tr: "140 cm", en: "140 cm" },
  "settings.fabric160": { tr: "160 cm", en: "160 cm" },
  "settings.aamaFormat": { tr: "AAMA / ASTM", en: "AAMA / ASTM" },
  "settings.lectraFormat": { tr: "Lectra DXF", en: "Lectra DXF" },
  "settings.gerberFormat": { tr: "Gerber DXF", en: "Gerber DXF" },
  "settings.dangerZone": { tr: "Tehlikeli Bölge", en: "Danger Zone" },
  "settings.dangerZoneDesc": { tr: "Bu işlemler geri alınamaz.", en: "These actions cannot be undone." },
  "settings.deleteAccount": { tr: "Hesabı Sil", en: "Delete Account" },

  // Seam allowance labels
  "settings.seam.sideSeam": { tr: "Yan Dikiş", en: "Side Seam" },
  "settings.seam.shoulder": { tr: "Omuz", en: "Shoulder" },
  "settings.seam.armhole": { tr: "Kol Evi", en: "Armhole" },
  "settings.seam.hem": { tr: "Etek Ucu", en: "Hem" },
  "settings.seam.neckline": { tr: "Yaka", en: "Neckline" },
  "settings.seam.cuff": { tr: "Manşet", en: "Cuff" },

  // ─── Templates ───
  "templates.title": { tr: "Kalıp Şablonları", en: "Pattern Templates" },
  "templates.subtitle": { tr: "Hazır kalıp şablonlarından hızlıca yeni projeler oluşturun", en: "Create new projects quickly from ready-made pattern templates" },
  "templates.status.ready": { tr: "Kullanıma Hazır", en: "Ready to Use" },
  "templates.status.beta": { tr: "Beta", en: "Beta" },

  // Template descriptions
  "templates.basicTshirt": { tr: "Standart fit, yuvarlak yaka, kısa kol", en: "Standard fit, round neck, short sleeve" },
  "templates.slimShirt": { tr: "Slim fit, button-down yaka, uzun kol", en: "Slim fit, button-down collar, long sleeve" },
  "templates.basicDress": { tr: "A-line silüet, diz hizası, yuvarlak yaka", en: "A-line silhouette, knee length, round neck" },
  "templates.pencilSkirt": { tr: "Dar kesim, bel lastikli, diz altı", en: "Slim fit, elastic waist, below knee" },
  "templates.chinoPants": { tr: "Regular fit, düz paça, cepli", en: "Regular fit, straight leg, pocketed" },
  "templates.oversizeTshirt": { tr: "Dropped shoulder, boxy fit, uzun beden", en: "Dropped shoulder, boxy fit, long body" },

  // Template names
  "templates.name.basicTshirt": { tr: "Basic Tişört — Erkek", en: "Basic T-Shirt — Men's" },
  "templates.name.slimShirt": { tr: "Slim Fit Gömlek — Erkek", en: "Slim Fit Shirt — Men's" },
  "templates.name.basicDress": { tr: "Basic Elbise — Kadın", en: "Basic Dress — Women's" },
  "templates.name.pencilSkirt": { tr: "Kalem Etek — Kadın", en: "Pencil Skirt — Women's" },
  "templates.name.chinoPants": { tr: "Chino Pantolon — Erkek", en: "Chino Pants — Men's" },
  "templates.name.oversizeTshirt": { tr: "Oversize Tişört — Unisex", en: "Oversize T-Shirt — Unisex" },

  // ─── Privacy & Terms ───
  "privacy.title": { tr: "Gizlilik Politikası (KVKK)", en: "Privacy Policy (GDPR)" },
  "privacy.lastUpdated": { tr: "Son güncelleme: Mart 2026", en: "Last updated: March 2026" },
  "terms.title": { tr: "Kullanım Şartları", en: "Terms of Service" },
  "terms.lastUpdated": { tr: "Son güncelleme: Mart 2026", en: "Last updated: March 2026" },
  "legal.copyright": { tr: "© 2026 AI-PatternWeb. Tüm hakları saklıdır.", en: "© 2026 AI-PatternWeb. All rights reserved." },
  "legal.termsLink": { tr: "Kullanım Şartları", en: "Terms of Service" },
  "legal.privacyLink": { tr: "Gizlilik Politikası", en: "Privacy Policy" },

  // ─── Project Detail Steps ───
  "project.steps.upload": { tr: "Görsel Yükle", en: "Upload Image" },
  "project.steps.analyze": { tr: "AI Analiz", en: "AI Analysis" },
  "project.steps.pattern": { tr: "Kalıp Oluştur", en: "Create Pattern" },
  "project.steps.edit": { tr: "Kalıp Editör", en: "Pattern Editor" },
  "project.steps.seam": { tr: "Dikiş Payı", en: "Seam Allowance" },
  "project.steps.grade": { tr: "Serileme", en: "Grading" },
  "project.steps.marker": { tr: "Pastal", en: "Marker" },
  "project.steps.qa": { tr: "QA & Export", en: "QA & Export" },

  // ─── Project Detail Messages ───
  "project.loading": { tr: "Proje yükleniyor...", en: "Loading project..." },
  "project.version": { tr: "Sürüm", en: "Version" },
  "project.status.draft": { tr: "Taslak", en: "Draft" },

  // Upload step
  "project.upload.title": { tr: "Dosya Sürükleyin veya Tıklayın", en: "Drag & Drop or Click to Upload" },
  "project.upload.subtitle": { tr: "Ürün fotoğrafı, teknik çizim, eskiz, DXF veya ölçü tablosu", en: "Product photo, technical drawing, sketch, DXF or measurement chart" },
  "project.upload.formats": { tr: "JPG, PNG, PDF, DXF, CSV, XLSX · Maks 50MB", en: "JPG, PNG, PDF, DXF, CSV, XLSX · Max 50MB" },
  "project.upload.uploading": { tr: "Yükleniyor...", en: "Uploading..." },
  "project.upload.continue": { tr: "Devam → AI Analiz", en: "Continue → AI Analysis" },

  // Analysis step
  "project.analysis.title": { tr: "AI Analiz", en: "AI Analysis" },
  "project.analysis.description": { tr: "Yüklediğiniz görseller Gemini AI tarafından analiz edilerek ürün kategorisi, parça yapısı ve detayları belirlenecek.", en: "Your uploaded images will be analyzed by Gemini AI to determine product category, piece structure and details." },
  "project.analysis.start": { tr: "🤖 Analizi Başlat (1 Kredi)", en: "🤖 Start Analysis (1 Credit)" },
  "project.analysis.analyzing": { tr: "⏳ Analiz Ediliyor...", en: "⏳ Analyzing..." },
  "project.analysis.results": { tr: "✅ Analiz Sonuçları", en: "✅ Analysis Results" },
  "project.analysis.confidence": { tr: "Güven", en: "Confidence" },
  "project.analysis.retry": { tr: "🔄 Tekrar Analiz Et", en: "🔄 Analyze Again" },
  "project.analysis.continue": { tr: "Kalıp Oluştur →", en: "Create Pattern →" },

  // Pattern generation step
  "project.pattern.title": { tr: "AI Kalıp Üretimi", en: "AI Pattern Generation" },
  "project.pattern.description": { tr: "Yüklediğiniz görsel ve referans kalibrasyon nesnesi kullanılarak gerçek boyutlu dikiş kalıpları üretilecektir.", en: "Real-sized sewing patterns will be produced using your uploaded image and reference calibration object." },
  "project.pattern.generate": { tr: "✂️ Kalıbı Üret (Canlı Takip)", en: "✂️ Generate Pattern (Live Tracking)" },
  "project.pattern.generating": { tr: "⏳ İşlem Yapılıyor...", en: "⏳ Processing..." },
  "project.pattern.results": { tr: "✅ AI ile Oluşturuldu", en: "✅ AI Generated" },
  "project.pattern.template": { tr: "📐 Şablon Kalıp", en: "📐 Template Pattern" },
  "project.pattern.pieces": { tr: "Parça Sayısı", en: "Piece Count" },
  "project.pattern.baseSize": { tr: "Baz Beden", en: "Base Size" },
  "project.pattern.type": { tr: "Tür", en: "Type" },
  "project.pattern.all": { tr: "📐 Tümü", en: "📐 All" },
  "project.pattern.details": { tr: "Detaylar", en: "Details" },
  "project.pattern.measurements": { tr: "📏 Ölçüler:", en: "📏 Measurements:" },
  "project.pattern.darts": { tr: "📌 Pensler:", en: "📌 Darts:" },
  "project.pattern.notches": { tr: "🔴 İşaret Noktaları:", en: "🔴 Notch Points:" },
  "project.pattern.notes": { tr: "📝", en: "📝" },
  "project.pattern.piecesList": { tr: "Parçalar:", en: "Pieces:" },
  "project.pattern.assemblyOrder": { tr: "Montaj Sırası:", en: "Assembly Order:" },
  "project.pattern.continue": { tr: "Kalıp Editör →", en: "Pattern Editor →" },
  "project.pattern.width": { tr: "Genişlik", en: "Width" },
  "project.pattern.height": { tr: "Yükseklik", en: "Height" },
  "project.pattern.quantity": { tr: "Adet", en: "Qty" },

  // Pattern step labels
  "project.pattern.step.transfer": { tr: "Veri Aktarımı & Bağlantı", en: "Data Transfer & Connection" },
  "project.pattern.step.transferDesc": { tr: "Görsel sunucuya güvenli tünelle iletiliyor", en: "Image is being transmitted to server via secure tunnel" },
  "project.pattern.step.vision": { tr: "Yapay Zeka Görsel Analizi", en: "AI Visual Analysis" },
  "project.pattern.step.visionDesc": { tr: "Gemini Vision giysi sınırlarını ve detaylarını çözümlüyor", en: "Gemini Vision is resolving garment boundaries and details" },
  "project.pattern.step.calibration": { tr: "Referans Kalibrasyon", en: "Reference Calibration" },
  "project.pattern.step.calibrationDesc": { tr: "Referans nesne algılanıp koordinat ölçekleme hesaplanıyor", en: "Reference object detected and coordinate scaling calculated" },
  "project.pattern.step.drawing": { tr: "Kalıp Çizim & Dikiş Payı", en: "Pattern Drawing & Seam Allowance" },
  "project.pattern.step.drawingDesc": { tr: "Kalıp sınırları milimetrik doğruluğa getirilip DXF/SVG oluşturuluyor", en: "Pattern boundaries brought to metric accuracy and DXF/SVG generated" },
  "project.pattern.liveFeedback": { tr: "Canlı AI Geri Bildirimi:", en: "Live AI Feedback:" },
  "project.pattern.waitMessage": { tr: "Lütfen bekleyin, işlemler başlatılıyor...", en: "Please wait, operations are starting..." },

  // Seam allowance step
  "project.seam.title": { tr: "Dikiş Payı ve Annotation", en: "Seam Allowance and Annotation" },
  "project.seam.sideSeam": { tr: "Yan Dikiş", en: "Side Seam" },
  "project.seam.shoulder": { tr: "Omuz", en: "Shoulder" },
  "project.seam.armhole": { tr: "Kol Evi", en: "Armhole" },
  "project.seam.hem": { tr: "Etek Ucu", en: "Hem" },
  "project.seam.neckline": { tr: "Yaka", en: "Neckline" },
  "project.seam.cuff": { tr: "Manşet", en: "Cuff" },
  "project.seam.back": { tr: "← Geri", en: "← Back" },
  "project.seam.next": { tr: "Serileme →", en: "Grading →" },

  // Grading step
  "project.grading.title": { tr: "Otomatik Serileme (Grading)", en: "Automatic Grading" },
  "project.grading.baseSize": { tr: "Baz Beden", en: "Base Size" },
  "project.grading.standard": { tr: "Grading Standardı", en: "Grading Standard" },
  "project.grading.tse": { tr: "TSE EN 13402", en: "TSE EN 13402" },
  "project.grading.eu": { tr: "EU EN 13402", en: "EU EN 13402" },
  "project.grading.astm": { tr: "ASTM D5585", en: "ASTM D5585" },
  "project.grading.continue": { tr: "Seriyi Oluştur & Pastal →", en: "Create Series & Marker →" },

  // Marker step
  "project.marker.title": { tr: "📦 Yapay Zeka Destekli Pastal Yerleşimi (Nesting)", en: "📦 AI-Supported Marker Layout (Nesting)" },
  "project.marker.phase": { tr: "Aşama 4: Kumaş Optimizasyonu", en: "Phase 4: Fabric Optimization" },
  "project.marker.fabricWidth": { tr: "📐 Kumaş Eni (Genişlik)", en: "📐 Fabric Width" },
  "project.marker.layoutType": { tr: "🧵 Yerleşim / Kesim Türü", en: "🧵 Layout / Cut Type" },
  "project.marker.single": { tr: "Tek Kat Serim (Single Layer)", en: "Single Layer Spreading" },
  "project.marker.double": { tr: "Çift Kat Serim (Double Layer - Simetrik)", en: "Double Layer Spreading (Symmetric)" },
  "project.marker.optimize": { tr: "🤖 Yerleşimi Optimize Et", en: "🤖 Optimize Layout" },
  "project.marker.calculating": { tr: "Hesaplanıyor...", en: "Calculating..." },
  "project.marker.efficiency": { tr: "Kumaş Verimliliği", en: "Fabric Efficiency" },
  "project.marker.wasteRate": { tr: "Fire Oranı:", en: "Waste Rate:" },
  "project.marker.totalLength": { tr: "Gerekli Toplam Boy", en: "Required Total Length" },
  "project.marker.placed": { tr: "Yerleştirilen Parça", en: "Placed Pieces" },
  "project.marker.visualization": { tr: "📐 Kumaş Pastal Görselleştirmesi (Ölçekli Dikey Rulo)", en: "📐 Fabric Marker Visualization (Scaled Vertical Roll)" },
  "project.marker.note": { tr: "* Dikey kaydırma yaparak tüm kumaş topu boyunca yerleşimi inceleyebilirsiniz.", en: "* You can review the placement throughout the fabric roll by vertical scrolling." },
  "project.marker.ready": { tr: "Pastal Yerleşimi Hazır", en: "Marker Layout Ready" },
  "project.marker.readyDesc": { tr: "AI pastal yerleşim motoru, parçalarınızın minimum fire ile kumaş enine dizilmesini hesaplar. Optimizasyonu başlatmak için yukarıdaki butona tıklayın.", en: "AI marker layout engine calculates the arrangement of your pieces with minimum waste across the fabric width. Click the button above to start optimization." },
  "project.marker.start": { tr: "🤖 Optimizasyonu Başlat", en: "🤖 Start Optimization" },

  // QA & Export step
  "project.qa.title": { tr: "📐 QA Güvenlik & CAD/CAM Üretim Modülü", en: "📐 QA Security & CAD/CAM Production Module" },
  "project.qa.description": { tr: "Kalıbınızın kalite standartlarını denetleyin, teknik üretim föyünü inceleyin ve endüstriyel çıktılar alın.", en: "Audit your pattern quality standards, review technical production sheet and get industrial outputs." },
  "project.qa.backToMarker": { tr: "← Pastal Yerleşimine Dön", en: "← Back to Marker Layout" },
  "project.qa.modelDetails": { tr: "📋 Model & Beden Genel Detayları", en: "📋 Model & Size General Details" },
  "project.qa.modelName": { tr: "Model Adı", en: "Model Name" },
  "project.qa.category": { tr: "Kategori", en: "Category" },
  "project.qa.baseSize": { tr: "Baz Beden", en: "Base Size" },
  "project.qa.fabricWidth": { tr: "Kumaş Eni", en: "Fabric Width" },
  "project.qa.createdDate": { tr: "Oluşturma Tarihi", en: "Creation Date" },
  "project.qa.version": { tr: "Sürüm", en: "Version" },
  "project.qa.notSpecified": { tr: "Belirtilmemiş", en: "Not Specified" },
  "project.qa.tshirt": { tr: "Basic Tişört", en: "Basic T-Shirt" },
  "project.qa.shirt": { tr: "Basic Gömlek", en: "Basic Shirt" },
  "project.qa.dress": { tr: "Düz Elbise", en: "Straight Dress" },
  "project.qa.skirt": { tr: "Etek", en: "Skirt" },
  "project.qa.other": { tr: "Diğer", en: "Other" },
  "project.qa.active": { tr: "(Aktif)", en: "(Active)" },
  "project.qa.cuttingList": { tr: "✂️ Kalıp Parçaları & Kesim Detayları", en: "✂️ Pattern Pieces & Cutting Details" },
  "project.qa.front": { tr: "Ön Gövde", en: "Front Body" },
  "project.qa.back": { tr: "Arka Gövde", en: "Back Body" },
  "project.qa.sleeve": { tr: "Kol Parçası", en: "Sleeve Piece" },
  "project.qa.collar": { tr: "Yaka / Tela", en: "Collar / Interfacing" },
  "project.qa.horizontal": { tr: "En Boyu (Yatay)", en: "Widthwise (Horizontal)" },
  "project.qa.vertical": { tr: "Boy İpliği (Dikey)", en: "Lengthwise (Vertical)" },
  "project.qa.toCut": { tr: "Kesilecek", en: "To Cut" },
  "project.qa.pieces": { tr: "Parçalar", en: "Pieces" },
};

export function t(key: string, lang: Lang, vars?: Record<string, string | number>): string {
  const entry = DICT[key];
  if (!entry) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[i18n] Missing key: ${key}`);
    }
    return key;
  }
  let str = entry[lang] || entry.tr || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }
  return str;
}

/**
 * React hook — komponentin içinde kolay kullanım için.
 *   const t = useT();
 *   <h1>{t("hero.title")}</h1>
 *   <span>{t("pricing.popular", { count: 5 })}</span>
 */
export function useT(): (key: string, vars?: Record<string, string | number>) => string {
  const [lang] = useLang();
  return (key, vars) => t(key, lang, vars);
}
