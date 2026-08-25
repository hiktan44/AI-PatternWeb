"use client";

import { useT } from "@/lib/i18n";
import styles from "../dashboard.module.css";

const TEMPLATES = [
  { name: "Basic Tişört — Erkek", category: "tshirt", icon: "👕", status: "Kullanıma Hazır", desc: "Standart fit, yuvarlak yaka, kısa kol", nameKey: "templates.name.basicTshirt", descKey: "templates.basicTshirt" },
  { name: "Slim Fit Gömlek — Erkek", category: "shirt", icon: "👔", status: "Kullanıma Hazır", desc: "Slim fit, button-down yaka, uzun kol", nameKey: "templates.name.slimShirt", descKey: "templates.slimShirt" },
  { name: "Basic Elbise — Kadın", category: "dress", icon: "👗", status: "Kullanıma Hazır", desc: "A-line silüet, diz hizası, yuvarlak yaka", nameKey: "templates.name.basicDress", descKey: "templates.basicDress" },
  { name: "Kalem Etek — Kadın", category: "skirt", icon: "🩳", status: "Kullanıma Hazır", desc: "Dar kesim, bel lastikli, diz altı", nameKey: "templates.name.pencilSkirt", descKey: "templates.pencilSkirt" },
  { name: "Chino Pantolon — Erkek", category: "pants", icon: "👖", status: "Kullanıma Hazır", desc: "Regular fit, düz paça, cepli", nameKey: "templates.name.chinoPants", descKey: "templates.chinoPants" },
  { name: "Oversize Tişört — Unisex", category: "tshirt", icon: "👕", status: "Beta", desc: "Dropped shoulder, boxy fit, uzun beden", nameKey: "templates.name.oversizeTshirt", descKey: "templates.oversizeTshirt" },
];

export default function TemplatesPage() {
  const t = useT();

  return (
    <div>
      <h1 className={styles.pageTitle}>{t("templates.title")}</h1>
      <p className={styles.pageSubtitle}>{t("templates.subtitle")}</p>

      <div className={styles.projectGrid}>
        {TEMPLATES.map((template, i) => (
          <div key={i} className={styles.projectCard}>
            <div className={styles.projectCardHeader}>
              <span className={styles.projectCategory} style={{ background: "rgba(26,86,255,0.08)", color: "var(--accent2)" }}>
                {template.icon} {template.category}
              </span>
              <span className={`${styles.projectStatus} ${template.status === "Beta" ? styles.statusReview : styles.statusApproved}`}>
                {template.status === "Beta" ? t("templates.status.beta") : t("templates.status.ready")}
              </span>
            </div>
            <div className={styles.projectName}>{t(template.nameKey)}</div>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>{t(template.descKey)}</p>
            <button className="btn btn-outline btn-sm" style={{ width: "100%", justifyContent: "center" }}>{t("projects.useTemplate")}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
