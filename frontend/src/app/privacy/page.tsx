"use client";

import { useT } from "@/lib/i18n";

export default function PrivacyPage() {
  const t = useT();

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "80px 5% 60px" }}>
      <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, marginBottom: 40 }}>
        <span style={{ width: 10, height: 10, background: "var(--accent1)", borderRadius: "50%", display: "inline-block" }} />
        AI-PatternWeb
      </a>

      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 36, fontWeight: 800, marginBottom: 32, letterSpacing: -1 }}>{t("privacy.title")}</h1>

      <div style={{ fontSize: 15, color: "var(--muted)", lineHeight: 2 }}>
        <p style={{ marginBottom: 24 }}>{t("privacy.lastUpdated")}</p>

        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 12, marginTop: 32 }}>1. Veri Sorumlusu</h2>
        <p style={{ marginBottom: 24 }}><strong>STRATEJİ DANIŞMANLIK HİZMETLERİ SAN. VE TİC. A.Ş.</strong>, AI-PatternWeb hizmetinde 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) kapsamında veri sorumlusudur.</p>

        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 12, marginTop: 32 }}>2. İşlenen Kişisel Veriler</h2>
        <ul style={{ paddingLeft: 24, marginBottom: 24 }}>
          <li>Kimlik bilgileri (ad, soyad)</li>
          <li>İletişim bilgileri (e-posta adresi)</li>
          <li>Müşteri işlem bilgileri (proje verileri, kalıp dosyaları)</li>
          <li>İşlem güvenliği bilgileri (IP adresi, oturum bilgileri)</li>
          <li>Finansal bilgiler (ödeme işlem numarası, plan bilgisi)</li>
        </ul>

        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 12, marginTop: 32 }}>3. Veri İşleme Amaçları</h2>
        <ul style={{ paddingLeft: 24, marginBottom: 24 }}>
          <li>Üyelik işlemlerinin yürütülmesi</li>
          <li>Kalıp mühendisliği hizmetlerinin sunulması</li>
          <li>Ödeme işlemlerinin gerçekleştirilmesi</li>
          <li>Yasal yükümlülüklerin yerine getirilmesi</li>
          <li>Hizmet kalitesinin iyileştirilmesi</li>
        </ul>

        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 12, marginTop: 32 }}>4. Veri Güvenliği</h2>
        <p style={{ marginBottom: 24 }}>Kişisel veriler için erişim yetkilendirmesi, aktarım güvenliği ve hizmetin niteliğine uygun teknik ve idari tedbirler uygulanır. Hizmet için zorunlu altyapı sağlayıcılarıyla paylaşım, amaç ve yetkiyle sınırlı tutulur.</p>

        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 12, marginTop: 32 }}>5. Haklarınız (KVKK Madde 11)</h2>
        <ul style={{ paddingLeft: 24, marginBottom: 24 }}>
          <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
          <li>İşlenmiş ise buna ilişkin bilgi talep etme</li>
          <li>Verilerinizin düzeltilmesini isteme</li>
          <li>Verilerinizin silinmesini veya yok edilmesini isteme</li>
          <li>Verilerinizin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
          <li>İşlenen verilerin münhasıran otomatik analiz yoluyla aleyhinize çıkan sonuca itiraz etme</li>
          <li>Kanuna aykırı işleme sebebiyle zararınızın giderilmesini talep etme</li>
        </ul>

        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 12, marginTop: 32 }}>6. AI Kullanımı</h2>
        <p style={{ marginBottom: 24 }}>Platform, kalıp analizi ve optimizasyonu için yapay zekâ teknolojileri kullanabilir. Yüklenen görsel ve teknik veriler talep edilen hizmetin üretilmesi için yapılandırılmış sağlayıcılara aktarılabilir; güncel sağlayıcı ve işleme kapsamı hizmet yapılandırmasına göre değerlendirilir.</p>

        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 12, marginTop: 32 }}>7. İletişim</h2>
        <p>KVKK kapsamındaki talepleriniz için: <strong>info@stratejidanismanlik.com.tr</strong><br />Zafer Mah. Kumrulu Sok. No. 2/18 Bahçelievler/İstanbul · Yenibosna V.D. · Vergi No: 7810520457</p>
      </div>

      <div style={{ marginTop: 60, paddingTop: 32, borderTop: "1px solid var(--border)", fontSize: 13, color: "var(--muted)" }}>
        {t("legal.copyright")} · <a href="/terms" style={{ color: "var(--accent2)" }}>{t("legal.termsLink")}</a> · <a href="/cookies">Çerez Politikası</a> · <a href="/contact">İletişim</a>
      </div>
    </div>
  );
}
