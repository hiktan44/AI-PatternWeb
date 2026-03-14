"use client";

import styles from "../dashboard.module.css";

export default function PatternsPage() {
  return (
    <div>
      <h1 className={styles.pageTitle}>Kalıplar</h1>
      <p className={styles.pageSubtitle}>Oluşturduğunuz ve import ettiğiniz kalıplar</p>

      <div className={styles.statsGrid} style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className={styles.statCard}>
          <div className={styles.statCardIcon}>✂️</div>
          <div className={styles.statCardValue}>0</div>
          <div className={styles.statCardLabel}>Toplam Kalıp</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardIcon}>📤</div>
          <div className={styles.statCardValue}>0</div>
          <div className={styles.statCardLabel}>DXF Export</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardIcon}>📐</div>
          <div className={styles.statCardValue}>0</div>
          <div className={styles.statCardLabel}>Serileme Yapılan</div>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>✂️</div>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 8, color: "var(--muted)" }}>Henüz kalıp yok</h3>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>Bir proje oluşturup görsel yükleyin veya DXF import edin.</p>
        <a href="/projects" className="btn btn-accent">Proje Oluştur</a>
      </div>
    </div>
  );
}
