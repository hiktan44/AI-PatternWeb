"use client";

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "80px 5% 60px" }}>
      <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, marginBottom: 40 }}>
        <span style={{ width: 10, height: 10, background: "var(--accent1)", borderRadius: "50%", display: "inline-block" }} />
        AI-PatternWeb
      </a>

      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 36, fontWeight: 800, marginBottom: 32, letterSpacing: -1 }}>Gizlilik Politikası (KVKK)</h1>

      <div style={{ fontSize: 15, color: "var(--muted)", lineHeight: 2 }}>
        <p style={{ marginBottom: 24 }}>Son güncelleme: Mart 2026</p>

        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 12, marginTop: 32 }}>1. Veri Sorumlusu</h2>
        <p style={{ marginBottom: 24 }}>AI-PatternWeb platformu, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) kapsamında veri sorumlusu sıfatıyla kişisel verilerinizi işlemektedir.</p>

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
        <p style={{ marginBottom: 24 }}>Kişisel verileriniz SSL/TLS şifrelemesi ile korunmakta olup, Türkiye&apos;de barındırılan sunucularımızda güvenli bir şekilde saklanmaktadır. Erişim yetkilendirmesi, şifreleme ve düzenli güvenlik testleri ile verilerinizin güvenliği sağlanmaktadır.</p>

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
        <p style={{ marginBottom: 24 }}>Platformumuz, kalıp analizi ve optimizasyonu için yapay zeka teknolojileri kullanmaktadır. Yüklediğiniz görseller ve teknik veriler, yalnızca hizmet sunumu amacıyla işlenmekte olup üçüncü taraflarla paylaşılmamaktadır. AI modelleri eğitiminde kişisel verileriniz kullanılmamaktadır.</p>

        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 12, marginTop: 32 }}>7. İletişim</h2>
        <p>KVKK kapsamındaki talepleriniz için: <strong>kvkk@aipatternweb.com</strong></p>
      </div>

      <div style={{ marginTop: 60, paddingTop: 32, borderTop: "1px solid var(--border)", fontSize: 13, color: "var(--muted)" }}>
        © 2026 AI-PatternWeb. Tüm hakları saklıdır. · <a href="/terms" style={{ color: "var(--accent2)" }}>Kullanım Şartları</a>
      </div>
    </div>
  );
}
