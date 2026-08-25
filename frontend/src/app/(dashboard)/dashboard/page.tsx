"use client";

import { useT } from "@/lib/i18n";
import styles from "../dashboard.module.css";

export default function DashboardPage() {
  const t = useT();

  return (
    <div>
      <h1 className={styles.pageTitle}>{t("dashboard.title")}</h1>
      <p className={styles.pageSubtitle}>{t("dashboard.subtitle")}</p>

      <div className={styles.statsGrid}>
        {[
          { icon: "📁", value: "0", label: t("dashboard.activeProjects") },
          { icon: "✂️", value: "0", label: t("dashboard.patternsCreated") },
          { icon: "📤", value: "0", label: t("dashboard.exportsMade") },
          { icon: "🪙", value: "50", label: t("dashboard.creditsLeft") },
        ].map((s, i) => (
          <div key={i} className={styles.statCard}>
            <div className={styles.statCardIcon}>{s.icon}</div>
            <div className={styles.statCardValue}>{s.value}</div>
            <div className={styles.statCardLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
        {t("dashboard.recentProjects")}
      </h2>
      <div className={styles.projectGrid}>
        <a href="/projects" className={styles.newProjectBtn}>
          <div className={styles.newProjectIcon}>+</div>
          <div className={styles.newProjectText}>{t("dashboard.newProject")}</div>
        </a>
      </div>
    </div>
  );
}
