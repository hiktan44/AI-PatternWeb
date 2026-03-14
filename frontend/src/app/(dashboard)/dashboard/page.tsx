"use client";

import styles from "../dashboard.module.css";

export default function DashboardPage() {
  return (
    <div>
      <h1 className={styles.pageTitle}>Dashboard</h1>
      <p className={styles.pageSubtitle}>Projelerinizin ve üretim süreçlerinizin genel görünümü</p>

      <div className={styles.statsGrid}>
        {[
          { icon: "📁", value: "0", label: "Aktif Proje" },
          { icon: "✂️", value: "0", label: "Kalıp Oluşturuldu" },
          { icon: "📤", value: "0", label: "Export Yapıldı" },
          { icon: "🪙", value: "50", label: "Kalan Kredi" },
        ].map((s, i) => (
          <div key={i} className={styles.statCard}>
            <div className={styles.statCardIcon}>{s.icon}</div>
            <div className={styles.statCardValue}>{s.value}</div>
            <div className={styles.statCardLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
        Son Projeler
      </h2>
      <div className={styles.projectGrid}>
        <a href="/projects" className={styles.newProjectBtn}>
          <div className={styles.newProjectIcon}>+</div>
          <div className={styles.newProjectText}>Yeni Proje Oluştur</div>
        </a>
      </div>
    </div>
  );
}
