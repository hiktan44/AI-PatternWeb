"use client";

import { useT } from "@/lib/i18n";
import styles from "../dashboard.module.css";

export default function PatternsPage() {
  const t = useT();

  return (
    <div>
      <h1 className={styles.pageTitle}>{t("patterns.title")}</h1>
      <p className={styles.pageSubtitle}>{t("patterns.subtitle")}</p>

      <div className={styles.statsGrid} style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className={styles.statCard}>
          <div className={styles.statCardIcon}>✂️</div>
          <div className={styles.statCardValue}>0</div>
          <div className={styles.statCardLabel}>{t("patterns.totalPatterns")}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardIcon}>📤</div>
          <div className={styles.statCardValue}>0</div>
          <div className={styles.statCardLabel}>{t("patterns.dxfExports")}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardIcon}>📐</div>
          <div className={styles.statCardValue}>0</div>
          <div className={styles.statCardLabel}>{t("patterns.graded")}</div>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>✂️</div>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 8, color: "var(--muted)" }}>{t("patterns.noPatterns")}</h3>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>{t("patterns.noPatternsDesc")}</p>
        <a href="/projects" className="btn btn-accent">{t("patterns.createProject")}</a>
      </div>
    </div>
  );
}
