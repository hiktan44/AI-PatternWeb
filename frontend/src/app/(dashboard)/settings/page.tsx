"use client";

import { useAuthStore } from "@/stores/authStore";
import { useT } from "@/lib/i18n";
import styles from "../dashboard.module.css";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const t = useT();

  return (
    <div>
      <h1 className={styles.pageTitle}>{t("settings.title")}</h1>
      <p className={styles.pageSubtitle}>{t("settings.subtitle")}</p>

      <div style={{ maxWidth: 640 }}>
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 28, marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 20 }}>{t("settings.profileInfo")}</h3>
          <div className={styles.formGroup}>
            <label>{t("settings.name")}</label>
            <input className={styles.formInput} defaultValue={user?.name || ""} />
          </div>
          <div className={styles.formGroup}>
            <label>{t("settings.email")}</label>
            <input className={styles.formInput} defaultValue={user?.email || ""} disabled style={{ opacity: 0.6 }} />
          </div>
          <button className="btn btn-accent" style={{ marginTop: 16 }}>{t("settings.save")}</button>
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 28, marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 20 }}>{t("settings.measurementPrefs")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className={styles.formGroup}>
              <label>{t("settings.measurementUnit")}</label>
              <select className={styles.formInput}><option>{t("settings.cm")}</option><option>{t("settings.inch")}</option></select>
            </div>
            <div className={styles.formGroup}>
              <label>{t("settings.gradingStandard")}</label>
              <select className={styles.formInput}><option>{t("settings.tseStandard")}</option><option>{t("settings.euStandard")}</option><option>{t("settings.astmStandard")}</option></select>
            </div>
            <div className={styles.formGroup}>
              <label>{t("settings.defaultFabricWidth")}</label>
              <select className={styles.formInput}><option>{t("settings.fabric150")}</option><option>{t("settings.fabric140")}</option><option>{t("settings.fabric160")}</option></select>
            </div>
            <div className={styles.formGroup}>
              <label>{t("settings.dxfFormat")}</label>
              <select className={styles.formInput}><option>{t("settings.aamaFormat")}</option><option>{t("settings.lectraFormat")}</option><option>{t("settings.gerberFormat")}</option></select>
            </div>
          </div>
          <button className="btn btn-accent" style={{ marginTop: 16 }}>{t("settings.save")}</button>
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 28, marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 20 }}>{t("settings.seamAllowanceLib")}</h3>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>{t("settings.seamAllowanceDesc")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { label: t("settings.seam.sideSeam"), val: "1.0" },
              { label: t("settings.seam.shoulder"), val: "1.0" },
              { label: t("settings.seam.armhole"), val: "1.0" },
              { label: t("settings.seam.hem"), val: "3.0" },
              { label: t("settings.seam.neckline"), val: "0.7" },
              { label: t("settings.seam.cuff"), val: "1.0" },
            ].map((s, i) => (
              <div key={i} className={styles.formGroup}>
                <label>{s.label}</label>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input className={styles.formInput} type="number" step="0.1" defaultValue={s.val} style={{ flex: 1 }} />
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{t("settings.cm")}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-accent" style={{ marginTop: 16 }}>{t("settings.save")}</button>
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 28 }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 20, color: "var(--accent1)" }}>{t("settings.dangerZone")}</h3>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>{t("settings.dangerZoneDesc")}</p>
          <button className="btn btn-outline" style={{ color: "var(--accent1)", borderColor: "rgba(255,77,46,0.3)" }}>{t("settings.deleteAccount")}</button>
        </div>
      </div>
    </div>
  );
}
