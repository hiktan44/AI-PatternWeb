"use client";

import styles from "../dashboard.module.css";

const TEMPLATES = [
  { name: "Basic Tişört — Erkek", category: "tshirt", icon: "👕", status: "Kullanıma Hazır", desc: "Standart fit, yuvarlak yaka, kısa kol" },
  { name: "Slim Fit Gömlek — Erkek", category: "shirt", icon: "👔", status: "Kullanıma Hazır", desc: "Slim fit, button-down yaka, uzun kol" },
  { name: "Basic Elbise — Kadın", category: "dress", icon: "👗", status: "Kullanıma Hazır", desc: "A-line silüet, diz hizası, yuvarlak yaka" },
  { name: "Kalem Etek — Kadın", category: "skirt", icon: "🩳", status: "Kullanıma Hazır", desc: "Dar kesim, bel lastikli, diz altı" },
  { name: "Chino Pantolon — Erkek", category: "pants", icon: "👖", status: "Kullanıma Hazır", desc: "Regular fit, düz paça, cepli" },
  { name: "Oversize Tişört — Unisex", category: "tshirt", icon: "👕", status: "Beta", desc: "Dropped shoulder, boxy fit, uzun beden" },
];

export default function TemplatesPage() {
  return (
    <div>
      <h1 className={styles.pageTitle}>Kalıp Şablonları</h1>
      <p className={styles.pageSubtitle}>Hazır kalıp şablonlarından hızlıca yeni projeler oluşturun</p>

      <div className={styles.projectGrid}>
        {TEMPLATES.map((t, i) => (
          <div key={i} className={styles.projectCard}>
            <div className={styles.projectCardHeader}>
              <span className={styles.projectCategory} style={{ background: "rgba(26,86,255,0.08)", color: "var(--accent2)" }}>
                {t.icon} {t.category}
              </span>
              <span className={`${styles.projectStatus} ${t.status === "Beta" ? styles.statusReview : styles.statusApproved}`}>{t.status}</span>
            </div>
            <div className={styles.projectName}>{t.name}</div>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>{t.desc}</p>
            <button className="btn btn-outline btn-sm" style={{ width: "100%", justifyContent: "center" }}>Bu Şablonla Proje Oluştur</button>
          </div>
        ))}
      </div>
    </div>
  );
}
