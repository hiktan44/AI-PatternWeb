"use client";

import { useAuthStore } from "@/stores/authStore";
import styles from "../dashboard.module.css";

export default function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <div>
      <h1 className={styles.pageTitle}>Ayarlar</h1>
      <p className={styles.pageSubtitle}>Hesap ve tercih ayarlarınız</p>

      <div style={{ maxWidth: 640 }}>
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 28, marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 20 }}>Profil Bilgileri</h3>
          <div className={styles.formGroup}>
            <label>Ad Soyad</label>
            <input className={styles.formInput} defaultValue={user?.name || ""} />
          </div>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input className={styles.formInput} defaultValue={user?.email || ""} disabled style={{ opacity: 0.6 }} />
          </div>
          <button className="btn btn-accent" style={{ marginTop: 16 }}>Kaydet</button>
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 28, marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 20 }}>Ölçü Tercihleri</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className={styles.formGroup}>
              <label>Ölçü Birimi</label>
              <select className={styles.formInput}><option>cm</option><option>inch</option></select>
            </div>
            <div className={styles.formGroup}>
              <label>Grading Standardı</label>
              <select className={styles.formInput}><option>TSE EN 13402</option><option>EU EN 13402</option><option>ASTM D5585</option></select>
            </div>
            <div className={styles.formGroup}>
              <label>Varsayılan Kumaş Eni</label>
              <select className={styles.formInput}><option>150 cm</option><option>140 cm</option><option>160 cm</option></select>
            </div>
            <div className={styles.formGroup}>
              <label>DXF Çıktı Formatı</label>
              <select className={styles.formInput}><option>AAMA / ASTM</option><option>Lectra DXF</option><option>Gerber DXF</option></select>
            </div>
          </div>
          <button className="btn btn-accent" style={{ marginTop: 16 }}>Kaydet</button>
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 28, marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 20 }}>Dikiş Payı Kütüphanesi</h3>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>Varsayılan dikiş payı değerlerini belirleyin. Proje bazında özelleştirilebilir.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { label: "Yan Dikiş", val: "1.0" },
              { label: "Omuz", val: "1.0" },
              { label: "Kol Evi", val: "1.0" },
              { label: "Etek Ucu", val: "3.0" },
              { label: "Yaka", val: "0.7" },
              { label: "Manşet", val: "1.0" },
            ].map((s, i) => (
              <div key={i} className={styles.formGroup}>
                <label>{s.label}</label>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input className={styles.formInput} type="number" step="0.1" defaultValue={s.val} style={{ flex: 1 }} />
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>cm</span>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-accent" style={{ marginTop: 16 }}>Kaydet</button>
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 28 }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 20, color: "var(--accent1)" }}>Tehlikeli Bölge</h3>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>Bu işlemler geri alınamaz.</p>
          <button className="btn btn-outline" style={{ color: "var(--accent1)", borderColor: "rgba(255,77,46,0.3)" }}>Hesabı Sil</button>
        </div>
      </div>
    </div>
  );
}
