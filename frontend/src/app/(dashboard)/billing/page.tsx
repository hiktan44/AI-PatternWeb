"use client";

import { useAuthStore } from "@/stores/authStore";
import styles from "../dashboard.module.css";

const PLANS = [
  { name: "Starter", price: "Ücretsiz", credits: "50/ay", features: ["3 proje/ay", "Temel kategoriler", "Watermark'lı PDF"] },
  { name: "Professional", price: "₺1.490/ay", credits: "500/ay", features: ["30 proje/ay", "DXF export", "Gelişmiş serileme", "Marker"] },
  { name: "Studio", price: "₺4.290/ay", credits: "2000/ay", features: ["Sınırsız proje", "5 ekip üyesi", "Stripe matching", "Tech pack", "Öncelikli destek"] },
  { name: "Enterprise", price: "Özel", credits: "Sınırsız", features: ["Sınırsız ekip", "SSO", "API", "PLM/ERP", "SLA"] },
];

export default function BillingPage() {
  const { user } = useAuthStore();

  return (
    <div>
      <h1 className={styles.pageTitle}>Plan & Kredi</h1>
      <p className={styles.pageSubtitle}>Mevcut planınız ve kredi durumunuz</p>

      <div className={styles.statsGrid} style={{ marginBottom: 40 }}>
        <div className={styles.statCard}>
          <div className={styles.statCardIcon}>💎</div>
          <div className={styles.statCardValue}>{user?.plan?.toUpperCase() || "STARTER"}</div>
          <div className={styles.statCardLabel}>Mevcut Plan</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardIcon}>🪙</div>
          <div className={styles.statCardValue}>{user?.credits || 0}</div>
          <div className={styles.statCardLabel}>Kalan Kredi</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardIcon}>📁</div>
          <div className={styles.statCardValue}>0 / 3</div>
          <div className={styles.statCardLabel}>Proje Kullanımı</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardIcon}>📅</div>
          <div className={styles.statCardValue}>14</div>
          <div className={styles.statCardLabel}>Trial Kalan Gün</div>
        </div>
      </div>

      <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Planları Karşılaştır</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {PLANS.map((plan, i) => (
          <div key={i} className={styles.projectCard} style={{ padding: 28, border: user?.plan === plan.name.toLowerCase() ? "2px solid var(--accent2)" : undefined }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>{plan.name}</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 4 }}>{plan.price}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>{plan.credits} kredi</div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {plan.features.map((f, fi) => (
                <li key={fi} style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "var(--accent3)" }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button className={`btn ${user?.plan === plan.name.toLowerCase() ? "btn-outline" : "btn-accent"}`} style={{ width: "100%", justifyContent: "center" }}>
              {user?.plan === plan.name.toLowerCase() ? "Mevcut Plan" : "Yükselt"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
