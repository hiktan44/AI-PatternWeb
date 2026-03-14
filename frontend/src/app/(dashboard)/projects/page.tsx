"use client";

import { useState, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import styles from "../dashboard.module.css";

const API = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const CATEGORIES = [
  { id: "tshirt", icon: "👕", label: "Tişört", available: true },
  { id: "shirt", icon: "👔", label: "Gömlek", available: true },
  { id: "dress", icon: "👗", label: "Elbise", available: true },
  { id: "skirt", icon: "🩳", label: "Etek", available: true },
  { id: "pants", icon: "👖", label: "Pantolon", available: true },
  { id: "kids_top", icon: "🧒", label: "Çocuk Üst", available: false },
  { id: "outerwear", icon: "🧥", label: "Outerwear", available: false },
];

interface Project {
  id: string;
  name: string;
  category: string | null;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export default function ProjectsPage() {
  const { token } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", season: "", brand: "" });

  const loadProjects = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API}/api/projects/`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setProjects(await res.json());
    setLoaded(true);
  }, [token]);

  if (!loaded) loadProjects();

  const createProject = async () => {
    if (!form.name || !form.category) return;
    const res = await fetch(`${API}/api/projects/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowModal(false);
      setForm({ name: "", category: "", season: "", brand: "" });
      loadProjects();
    }
  };

  const statusLabel: Record<string, string> = { draft: "Taslak", in_review: "İncelemede", approved: "Onaylı", production_ready: "Üretime Hazır" };
  const statusClass: Record<string, string> = { draft: styles.statusDraft, in_review: styles.statusReview, approved: styles.statusApproved, production_ready: styles.statusProduction };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 className={styles.pageTitle}>Projeler</h1>
          <p className={styles.pageSubtitle}>Kalıp projelerinizi yönetin</p>
        </div>
        <button className="btn btn-accent" onClick={() => setShowModal(true)}>+ Yeni Proje</button>
      </div>

      <div className={styles.projectGrid}>
        {projects.map((p) => (
          <a key={p.id} href={`/projects/${p.id}`} className={styles.projectCard}>
            <div className={styles.projectCardHeader}>
              <span className={styles.projectCategory} style={{ background: "rgba(26,86,255,0.08)", color: "var(--accent2)" }}>
                {CATEGORIES.find((c) => c.id === p.category)?.icon} {CATEGORIES.find((c) => c.id === p.category)?.label || p.category}
              </span>
              <span className={`${styles.projectStatus} ${statusClass[p.status] || styles.statusDraft}`}>
                {statusLabel[p.status] || p.status}
              </span>
            </div>
            <div className={styles.projectName}>{p.name}</div>
            <div className={styles.projectMeta}>
              <span>v{p.version}</span>
              <span>{new Date(p.created_at).toLocaleDateString("tr-TR")}</span>
            </div>
          </a>
        ))}

        <button className={styles.newProjectBtn} onClick={() => setShowModal(true)}>
          <div className={styles.newProjectIcon}>+</div>
          <div className={styles.newProjectText}>Yeni Proje Oluştur</div>
        </button>
      </div>

      {/* NEW PROJECT MODAL */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Yeni Proje Oluştur</h2>

            <div className={styles.formGroup}>
              <label>Proje Adı *</label>
              <input className={styles.formInput} placeholder="örn: Yaz Koleksiyonu Gömlek" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className={styles.formGroup}>
              <label>Ürün Kategorisi *</label>
              <div className={styles.categoryGrid}>
                {CATEGORIES.map((c) => (
                  <div
                    key={c.id}
                    className={`${styles.categoryOption} ${form.category === c.id ? styles.categoryOptionActive : ""} ${!c.available ? styles.categoryOptionDisabled : ""}`}
                    onClick={() => c.available && setForm({ ...form, category: c.id })}
                  >
                    <div className={styles.categoryOptionIcon}>{c.icon}</div>
                    <div className={styles.categoryOptionLabel}>{c.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className={styles.formGroup}>
                <label>Sezon</label>
                <input className={styles.formInput} placeholder="örn: SS26" value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} />
              </div>
              <div className={styles.formGroup}>
                <label>Marka</label>
                <input className={styles.formInput} placeholder="örn: AVVA" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
            </div>

            <div className={styles.formActions}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>İptal</button>
              <button className="btn btn-accent" onClick={createProject} disabled={!form.name || !form.category}>Oluştur</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
