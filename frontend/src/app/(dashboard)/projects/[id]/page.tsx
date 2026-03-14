"use client";

import { useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import styles from "../../dashboard.module.css";

const API = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface ProjectFile { id: string; filename: string; file_type: string; file_size: number; confidence_score: number | null; analysis_result: Record<string, unknown> | null; }
interface ProjectData { id: string; name: string; category: string; status: string; base_size: string | null; fabric_width: string | null; fabric_type: string | null; version: number; }

const STEPS = [
  { id: "upload", label: "Görsel Yükle", icon: "📸" },
  { id: "analyze", label: "AI Analiz", icon: "🤖" },
  { id: "measure", label: "Ölçü & Onay", icon: "📏" },
  { id: "edit", label: "Kalıp Editör", icon: "✏️" },
  { id: "seam", label: "Dikiş Payı", icon: "🧵" },
  { id: "grade", label: "Serileme", icon: "📐" },
  { id: "marker", label: "Pastal", icon: "📦" },
  { id: "qa", label: "QA & Export", icon: "✅" },
];

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { token } = useAuthStore();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const [pRes, fRes] = await Promise.all([
      fetch(`${API}/api/projects/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/api/projects/${id}/files`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (pRes.ok) setProject(await pRes.json());
    if (fRes.ok) setFiles(await fRes.json());
    setLoaded(true);
  }, [token, id]);

  if (!loaded) load();

  const uploadFile = async (file: File) => {
    if (!token) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API}/api/projects/${id}/files`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (res.ok) {
      const newFile = await res.json();
      setFiles((prev) => [...prev, newFile]);
      if (currentStep === 0) setCurrentStep(1);
    }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const formatSize = (b: number) => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;

  if (!project) return <div className={styles.loadingScreen}><div className={styles.loadingSpinner} /><p>Proje yükleniyor...</p></div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 className={styles.pageTitle}>{project.name}</h1>
          <p className={styles.pageSubtitle}>v{project.version} · {project.category?.toUpperCase()}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span className={`${styles.projectStatus} ${styles.statusDraft}`} style={{ fontSize: 13 }}>
            {project.status === "draft" ? "Taslak" : project.status}
          </span>
        </div>
      </div>

      {/* STEP PROGRESS */}
      <div style={{ display: "flex", gap: 4, marginBottom: 32 }}>
        {STEPS.map((step, i) => (
          <div
            key={step.id}
            onClick={() => i <= currentStep && setCurrentStep(i)}
            style={{
              flex: 1, padding: "12px 8px", borderRadius: 12, textAlign: "center",
              background: i <= currentStep ? (i === currentStep ? "rgba(26,86,255,0.1)" : "rgba(0,200,150,0.08)") : "var(--surface)",
              border: i === currentStep ? "1.5px solid var(--accent2)" : "1px solid var(--border)",
              cursor: i <= currentStep ? "pointer" : "default", transition: "all .2s",
              opacity: i > currentStep ? 0.5 : 1,
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 4 }}>{step.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: i === currentStep ? "var(--accent2)" : "var(--muted)" }}>{step.label}</div>
          </div>
        ))}
      </div>

      {/* STEP CONTENT */}
      {currentStep === 0 && (
        <div>
          <div
            className={`${styles.uploadZone} ${dragging ? styles.uploadZoneDrag : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" hidden accept="image/*,.pdf,.dxf,.csv,.xlsx" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
            <div className={styles.uploadIcon}>{uploading ? "⏳" : "📁"}</div>
            <div className={styles.uploadTitle}>{uploading ? "Yükleniyor..." : "Dosya Sürükleyin veya Tıklayın"}</div>
            <div className={styles.uploadSub}>Ürün fotoğrafı, teknik çizim, eskiz, DXF veya ölçü tablosu</div>
            <div className={styles.uploadFormats}>JPG, PNG, PDF, DXF, CSV, XLSX · Maks 50MB</div>
          </div>

          {files.length > 0 && (
            <div className={styles.fileList}>
              {files.map((f) => (
                <div key={f.id} className={styles.fileItem}>
                  <div className={styles.fileItemIcon}>{f.file_type.includes("image") ? "🖼️" : f.filename.endsWith(".dxf") ? "📐" : "📄"}</div>
                  <div className={styles.fileItemInfo}>
                    <div className={styles.fileItemName}>{f.filename}</div>
                    <div className={styles.fileItemSize}>{formatSize(f.file_size)}</div>
                  </div>
                  {f.confidence_score && (
                    <div className={styles.fileItemScore} style={{ background: f.confidence_score > 0.8 ? "rgba(0,200,150,0.1)" : "rgba(255,184,0,0.1)", color: f.confidence_score > 0.8 ? "#009a6e" : "#b38600" }}>
                      {(f.confidence_score * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {files.length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn btn-accent" onClick={() => setCurrentStep(1)}>Devam → AI Analiz</button>
            </div>
          )}
        </div>
      )}

      {currentStep === 1 && (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 12 }}>AI Analiz</h3>
          <p style={{ color: "var(--muted)", maxWidth: 480, margin: "0 auto 32px" }}>
            Yüklediğiniz görseller AI tarafından analiz edilerek ürün kategorisi, parça yapısı ve ön kalıp taslağı oluşturulacak.
          </p>
          <button className="btn btn-accent btn-lg" onClick={() => setCurrentStep(2)}>
            Analizi Başlat (1 Kredi)
          </button>
        </div>
      )}

      {currentStep === 2 && (
        <div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Ölçü Tablosu ve Onay</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <div className={styles.formGroup}>
              <label>Baz Beden *</label>
              <select className={styles.formInput}>
                <option value="">Seçin...</option>
                {["XS", "S", "M", "L", "XL", "XXL"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Kumaş Eni (cm)</label>
              <input className={styles.formInput} type="number" placeholder="150" />
            </div>
            <div className={styles.formGroup}>
              <label>Kumaş Tipi</label>
              <select className={styles.formInput}>
                <option value="">Seçin...</option>
                <option value="dokuma">Dokuma</option>
                <option value="orme">Örme</option>
                <option value="denim">Denim</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Kumaş Yönü</label>
              <select className={styles.formInput}>
                <option value="">Seçin...</option>
                <option value="one_way">Tek Yön</option>
                <option value="two_way">Çift Yön</option>
                <option value="nap">Nap</option>
              </select>
            </div>
          </div>

          <h4 style={{ fontWeight: 700, marginBottom: 12 }}>Ölçü Tablosu (cm)</h4>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginBottom: 24 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>Ölçü</th>
                {["S", "M", "L", "XL"].map((s) => <th key={s} style={{ padding: "8px 12px" }}>{s}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Göğüs", vals: [96, 100, 104, 110] },
                { label: "Bel", vals: [84, 88, 92, 98] },
                { label: "Basen", vals: [100, 104, 108, 114] },
                { label: "Omuz", vals: [44, 46, 48, 50] },
                { label: "Kol Boyu", vals: [62, 63, 64, 65] },
                { label: "Ön Boy", vals: [72, 74, 76, 78] },
              ].map((row, ri) => (
                <tr key={ri} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600 }}>{row.label}</td>
                  {row.vals.map((v, vi) => (
                    <td key={vi} style={{ padding: "8px 12px", textAlign: "center" }}>
                      <input className={styles.formInput} style={{ width: 60, textAlign: "center", padding: "6px 8px" }} defaultValue={v} type="number" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button className="btn btn-outline" onClick={() => setCurrentStep(1)}>← Geri</button>
            <button className="btn btn-accent" onClick={() => setCurrentStep(3)}>Onayla ve Kalıba Geç →</button>
          </div>
        </div>
      )}

      {currentStep === 3 && (
        <div className={styles.editorLayout}>
          <div className={styles.canvasArea}>
            <div className={styles.canvasToolbar2}>
              {["✦ Seç", "⊕ Ekle", "📏 Ölçü", "↩ Geri"].map((t, i) => (
                <button key={i} className="btn btn-sm btn-ghost">{t}</button>
              ))}
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>2D Pattern Editör — Konva.js</span>
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 500, background: "#fafaf8", position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, #d4d4d4 1px, transparent 1px)", backgroundSize: "24px 24px", opacity: 0.5 }} />
              <svg width="400" height="360" viewBox="0 0 400 360" style={{ position: "relative", zIndex: 1 }}>
                <g><path d="M100,50 L125,38 L175,33 L225,33 L275,38 L300,50 L300,58 L275,65 L263,280 L137,280 L125,65 L100,58 Z" fill="rgba(26,86,255,0.06)" stroke="#1a56ff" strokeWidth="1.5" strokeLinejoin="round"/><text x="200" y="165" textAnchor="middle" style={{ fontSize: 12, fill: "#888" }}>ÖN BEDEN</text></g>
                <g><path d="M35,75 L90,70 L100,165 L45,175 Z" fill="rgba(0,200,150,0.08)" stroke="#00c896" strokeWidth="1.5" strokeLinejoin="round"/><text x="65" y="125" textAnchor="middle" style={{ fontSize: 10, fill: "#888" }}>KOL</text></g>
                <g><path d="M310,50 L330,38 L350,33 L375,33 L395,38 L400,60 L380,72 L370,280 L325,280 L318,72 Z" fill="rgba(255,184,0,0.07)" stroke="#ffb800" strokeWidth="1.5" strokeLinejoin="round"/><text x="358" y="165" textAnchor="middle" style={{ fontSize: 10, fill: "#888" }}>ARKA</text></g>
                <line x1="200" y1="210" x2="200" y2="260" stroke="#888" strokeWidth="1"/><polygon points="200,207 197,213 203,213" fill="#888"/><polygon points="200,263 197,257 203,257" fill="#888"/>
              </svg>
            </div>
          </div>
          <div className={styles.sidePanel}>
            <div className={styles.panelSection}>
              <div className={styles.panelTitle}>Parçalar</div>
              {["Ön Beden", "Arka Beden", "Kol (x2)", "Yaka", "Manşet (x2)"].map((p, i) => (
                <div key={i} style={{ padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }} className={styles.projectCard}>
                  <span>{p}</span>
                  <span className="badge badge-green" style={{ fontSize: 10 }}>✓</span>
                </div>
              ))}
            </div>
            <div className={styles.panelSection}>
              <div className={styles.panelTitle}>Confidence</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, height: 8, background: "var(--surface)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: "94%", height: "100%", background: "var(--accent3)", borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent3)" }}>94%</span>
              </div>
            </div>
            <div style={{ padding: 20 }}>
              <button className="btn btn-accent" style={{ width: "100%" }} onClick={() => setCurrentStep(4)}>Dikiş Payı →</button>
            </div>
          </div>
        </div>
      )}

      {currentStep === 4 && (
        <div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Dikiş Payı ve Annotation</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
            {[
              { part: "Yan Dikiş", value: "1.0 cm" },
              { part: "Omuz", value: "1.0 cm" },
              { part: "Kol Evi", value: "1.0 cm" },
              { part: "Etek Ucu", value: "3.0 cm" },
              { part: "Yaka", value: "0.7 cm" },
              { part: "Manşet", value: "1.0 cm" },
            ].map((s, i) => (
              <div key={i} style={{ padding: 16, background: "#fff", border: "1px solid var(--border)", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{s.part}</span>
                <input className={styles.formInput} style={{ width: 70, textAlign: "center", padding: "6px 8px" }} defaultValue={s.value} />
              </div>
            ))}
          </div>
          <div style={{ padding: 20, background: "#fff", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 24 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Annotation</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["✓ Notch", "✓ Grainline", "✓ Drill Mark", "✓ Fold Mark", "✓ Parça Adı", "✓ Beden Etiketi"].map((a, i) => (
                <span key={i} className="badge badge-green">{a}</span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button className="btn btn-outline" onClick={() => setCurrentStep(3)}>← Geri</button>
            <button className="btn btn-accent" onClick={() => setCurrentStep(5)}>Serileme →</button>
          </div>
        </div>
      )}

      {currentStep === 5 && (
        <div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Otomatik Serileme (Grading)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <div className={styles.formGroup}>
              <label>Baz Beden</label>
              <select className={styles.formInput} defaultValue="M"><option>S</option><option>M</option><option>L</option></select>
            </div>
            <div className={styles.formGroup}>
              <label>Grading Standardı</label>
              <select className={styles.formInput} defaultValue="tse"><option value="tse">TSE EN 13402</option><option value="eu">EU EN 13402</option><option value="astm">ASTM D5585</option></select>
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Hedef Bedenler</div>
            <div style={{ display: "flex", gap: 8 }}>
              {["XS", "S", "M", "L", "XL", "XXL", "3XL"].map((s) => (
                <label key={s} style={{ padding: "8px 16px", border: "1.5px solid var(--border)", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" defaultChecked={["S", "M", "L", "XL"].includes(s)} /> {s}
                </label>
              ))}
            </div>
          </div>
          <div style={{ padding: 20, background: "#fff", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 24, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📐</div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Seri Önizleme</div>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>S, M, L, XL bedenleri oluşturulacak. Beden arası oran kontrolü yapılarak anormal sıçrama tespit edilecek.</p>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button className="btn btn-outline" onClick={() => setCurrentStep(4)}>← Geri</button>
            <button className="btn btn-accent" onClick={() => setCurrentStep(6)}>Seriyi Oluştur & Pastal →</button>
          </div>
        </div>
      )}

      {currentStep === 6 && (
        <div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Pastal / Marker Yerleşimi</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
            <div className={styles.formGroup}><label>Kumaş Eni</label><input className={styles.formInput} defaultValue="150 cm" /></div>
            <div className={styles.formGroup}><label>Serim Tipi</label><select className={styles.formInput}><option>Çift Kat</option><option>Tek Kat</option><option>Açık En</option></select></div>
            <div className={styles.formGroup}><label>Kumaş Yönü</label><select className={styles.formInput}><option>Tek Yön</option><option>Çift Yön</option></select></div>
          </div>
          <div style={{ padding: 24, background: "#fff", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontWeight: 700 }}>Marker Sonucu</div>
              <span className="badge badge-green">Optimum</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              <div><div style={{ fontSize: 11, color: "var(--muted)" }}>Fire Oranı</div><div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: "var(--accent3)" }}>%7.4</div></div>
              <div><div style={{ fontSize: 11, color: "var(--muted)" }}>Toplam Uzunluk</div><div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800 }}>4.2 m</div></div>
              <div><div style={{ fontSize: 11, color: "var(--muted)" }}>Parça Sayısı</div><div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800 }}>22</div></div>
              <div><div style={{ fontSize: 11, color: "var(--muted)" }}>Beden Dağılımı</div><div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800 }}>4</div></div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button className="btn btn-outline" onClick={() => setCurrentStep(5)}>← Geri</button>
            <button className="btn btn-accent" onClick={() => setCurrentStep(7)}>QA & Export →</button>
          </div>
        </div>
      )}

      {currentStep === 7 && (
        <div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 20 }}>QA Validation & Export</h3>
          <div style={{ padding: 24, background: "#fff", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontWeight: 700 }}>Doğrulama Raporu</div>
              <span className="badge badge-green" style={{ fontSize: 13 }}>✓ PASSED</span>
            </div>
            {[
              { check: "Tüm parçalar kapalı contour", status: "pass" },
              { check: "Self-intersection yok", status: "pass" },
              { check: "Tüm parçalarda grainline var", status: "pass" },
              { check: "Tüm parçalarda isim var", status: "pass" },
              { check: "Dikiş payları tanımlı", status: "pass" },
              { check: "Ölçüler tolerans içinde", status: "pass" },
              { check: "Notch pozisyonları tutarlı", status: "pass" },
              { check: "Beden arası oranlar mantıklı", status: "pass" },
            ].map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 7 ? "1px solid var(--border)" : "none" }}>
                <span style={{ color: c.status === "pass" ? "var(--accent3)" : "var(--accent1)", fontWeight: 700 }}>{c.status === "pass" ? "✓" : "✗"}</span>
                <span style={{ fontSize: 14 }}>{c.check}</span>
              </div>
            ))}
          </div>

          <h4 style={{ fontWeight: 700, marginBottom: 16 }}>Export Formatları</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              { format: "DXF", icon: "📐", desc: "Lectra, Gerber uyumlu kalıp dosyası" },
              { format: "PDF", icon: "📄", desc: "A4 tiled, gerçek ölçekli çıktı" },
              { format: "CSV", icon: "📊", desc: "Parça raporu ve ölçü tablosu" },
            ].map((e, i) => (
              <div key={i} style={{ padding: 20, background: "#fff", border: "1px solid var(--border)", borderRadius: 12, textAlign: "center", cursor: "pointer", transition: "all .2s" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>{e.icon}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 4 }}>{e.format} Export</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{e.desc}</div>
                <button className="btn btn-accent btn-sm" style={{ marginTop: 12 }}>İndir</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
