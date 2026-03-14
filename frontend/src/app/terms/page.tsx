"use client";

export default function TermsPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "80px 5% 60px" }}>
      <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, marginBottom: 40 }}>
        <span style={{ width: 10, height: 10, background: "var(--accent1)", borderRadius: "50%", display: "inline-block" }} />
        AI-PatternWeb
      </a>

      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 36, fontWeight: 800, marginBottom: 32, letterSpacing: -1 }}>Kullanım Şartları</h1>

      <div style={{ fontSize: 15, color: "var(--muted)", lineHeight: 2 }}>
        <p style={{ marginBottom: 24 }}>Son güncelleme: Mart 2026</p>

        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 12, marginTop: 32 }}>1. Hizmet Tanımı</h2>
        <p style={{ marginBottom: 24 }}>AI-PatternWeb, yapay zeka destekli, kural tabanlı bir web-based pattern engineering platformudur. Platform, görsel ve teknik verilerden üretim-güvenli 2D kalıp, seri, dikiş payı ve pastal yerleşimi oluşturma hizmeti sunmaktadır.</p>

        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 12, marginTop: 32 }}>2. Sorumluluk Reddi</h2>
        <p style={{ marginBottom: 24 }}>AI tarafından oluşturulan kalıplar, nihai üretim öncesinde mutlaka uzman modelistler tarafından kontrol edilmelidir. Platform, AI çıktılarının doğrudan üretimde kullanılmasından kaynaklanan kayıplardan sorumluluk kabul etmez. Tüm kalıplar &quot;QA Validation&quot; sürecinden geçmelidir.</p>

        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 12, marginTop: 32 }}>3. Fikri Mülkiyet</h2>
        <p style={{ marginBottom: 24 }}>Kullanıcıların oluşturduğu kalıp ve proje dosyaları kullanıcıya aittir. Platform, bu içerikleri yalnızca hizmet sunumu amacıyla kullanır, üçüncü taraflarla paylaşmaz ve AI modeli eğitiminde kullanmaz.</p>

        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 12, marginTop: 32 }}>4. Hesap ve Güvenlik</h2>
        <p style={{ marginBottom: 24 }}>Kullanıcılar, hesap bilgilerinin güvenliğinden sorumludur. Şüpheli aktivite tespit edilmesi halinde derhal bildirimde bulunulmalıdır.</p>

        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 12, marginTop: 32 }}>5. Ödeme ve İade</h2>
        <p style={{ marginBottom: 24 }}>Abonelik iptalleri ilgili dönem sonunda geçerli olur. 14 günlük ücretsiz deneme süresi bitiminde otomatik ücretlendirme yapılmaz, kullanıcı aktif olarak plan seçmelidir. İade talepleri 7 iş günü içinde değerlendirilir.</p>

        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 12, marginTop: 32 }}>6. Uyuşmazlık</h2>
        <p style={{ marginBottom: 24 }}>İşbu sözleşmeden doğan uyuşmazlıklarda Türkiye Cumhuriyeti kanunları uygulanır.</p>
      </div>

      <div style={{ marginTop: 60, paddingTop: 32, borderTop: "1px solid var(--border)", fontSize: 13, color: "var(--muted)" }}>
        © 2026 AI-PatternWeb. Tüm hakları saklıdır. · <a href="/privacy" style={{ color: "var(--accent2)" }}>Gizlilik Politikası</a>
      </div>
    </div>
  );
}
