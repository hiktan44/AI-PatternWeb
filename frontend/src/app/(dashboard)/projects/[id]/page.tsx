"use client";

import { useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import styles from "../../dashboard.module.css";

const API = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface ProjectFile { id: string; filename: string; file_type: string; file_size: number; confidence_score: number | null; analysis_result: Record<string, unknown> | null; }
interface ProjectData { id: string; name: string; category: string; status: string; base_size: string | null; fabric_width: string | null; fabric_type: string | null; version: number; }

/* eslint-disable @typescript-eslint/no-explicit-any */

const STEPS = [
  { id: "upload", label: "Görsel Yükle", icon: "📸" },
  { id: "analyze", label: "AI Analiz", icon: "🤖" },
  { id: "pattern", label: "Kalıp Oluştur", icon: "✂️" },
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

  // AI analiz sonuçları
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState("");

  // Kalıp oluşturma sonuçları
  const [generating, setGenerating] = useState(false);
  const [patternResult, setPatternResult] = useState<any>(null);
  const [patternError, setPatternError] = useState("");

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

  // ====== AI ANALİZ ======
  const runAnalysis = async () => {
    if (!token || files.length === 0) return;
    setAnalyzing(true);
    setAnalysisError("");
    setAnalysisResult(null);

    const imageFile = files.find(f => f.file_type.includes("image"));
    if (!imageFile) {
      setAnalysisError("Analiz için bir görsel dosya yüklemelisiniz.");
      setAnalyzing(false);
      return;
    }

    try {
      const res = await fetch(`${API}/api/patterns/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ project_id: id, file_id: imageFile.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Analiz başarısız");
      }
      const data = await res.json();
      setAnalysisResult(data.analysis);
      // Dosya listesini güncelle (confidence_score vs.)
      load();
    } catch (err: any) {
      setAnalysisError(err.message || "Analiz sırasında hata oluştu");
    }
    setAnalyzing(false);
  };

  // ====== KALIP OLUŞTUR ======
  const generatePattern = async () => {
    if (!token) return;
    setGenerating(true);
    setPatternError("");
    setPatternResult(null);

    const imageFile = files.find(f => f.file_type.includes("image"));

    try {
      const res = await fetch(`${API}/api/patterns/generate-pattern`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          project_id: id,
          file_id: imageFile?.id || "",
          category: project?.category || "custom",
          base_size: "M",
          target_sizes: ["S", "M", "L", "XL"],
          standard: "tse",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Kalıp oluşturma başarısız");
      }
      const data = await res.json();
      setPatternResult(data);
    } catch (err: any) {
      setPatternError(err.message || "Kalıp oluşturma sırasında hata oluştu");
    }
    setGenerating(false);
  };

  const formatSize = (b: number) => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;

  // Kalıp parçalarını SVG'ye çevir
  const renderPatternSVG = () => {
    if (!patternResult) return null;
    const pieces = patternResult.pieces || patternResult.base_template;
    if (!pieces) return null;

    const colors = ["#1a56ff", "#00c896", "#ffb800", "#ff4d2e", "#9b59b6", "#e67e22"];
    const entries = Object.entries(pieces);

    // Tüm koordinatları topla, bounding box hesapla
    let allCoords: number[][] = [];
    entries.forEach(([, piece]: [string, any]) => {
      const coords = piece.coords || (piece.coords ? piece.coords : []);
      if (Array.isArray(coords)) allCoords = [...allCoords, ...coords.map((c: any) => Array.isArray(c) ? c : [c[0], c[1]])];
    });

    if (allCoords.length === 0) return null;

    const xs = allCoords.map(c => c[0]);
    const ys = allCoords.map(c => c[1]);
    const minX = Math.min(...xs) - 20;
    const minY = Math.min(...ys) - 20;
    const maxX = Math.max(...xs) + 20;
    const maxY = Math.max(...ys) + 20;
    const w = maxX - minX;
    const h = maxY - minY;

    return (
      <svg width="100%" height="100%" viewBox={`${minX} ${minY} ${w} ${h}`} style={{ maxHeight: 500 }}>
        {/* Grid */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e0e0e0" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect x={minX} y={minY} width={w} height={h} fill="url(#grid)"/>

        {entries.map(([name, piece]: [string, any], idx) => {
          const coords = piece.coords || [];
          if (!Array.isArray(coords) || coords.length < 3) return null;
          const points = coords.map((c: any) => `${c[0]},${c[1]}`).join(" ");
          const color = colors[idx % colors.length];
          // Merkez hesapla
          const cx = coords.reduce((s: number, c: any) => s + c[0], 0) / coords.length;
          const cy = coords.reduce((s: number, c: any) => s + c[1], 0) / coords.length;

          return (
            <g key={name}>
              <polygon points={points} fill={`${color}15`} stroke={color} strokeWidth="2" strokeLinejoin="round"/>
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" style={{ fontSize: Math.max(12, w/30), fill: color, fontWeight: 700 }}>
                {name.replace(/_/g, " ").toUpperCase()}
              </text>
              {piece.quantity && piece.quantity > 1 && (
                <text x={cx} y={cy + Math.max(14, w/25)} textAnchor="middle" style={{ fontSize: Math.max(10, w/40), fill: "#888" }}>
                  x{piece.quantity}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

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
      <div style={{ display: "flex", gap: 4, marginBottom: 32, overflowX: "auto" }}>
        {STEPS.map((step, i) => (
          <div
            key={step.id}
            onClick={() => i <= currentStep && setCurrentStep(i)}
            style={{
              flex: 1, padding: "12px 8px", borderRadius: 12, textAlign: "center",
              background: i <= currentStep ? (i === currentStep ? "rgba(26,86,255,0.1)" : "rgba(0,200,150,0.08)") : "var(--surface)",
              border: i === currentStep ? "1.5px solid var(--accent2)" : "1px solid var(--border)",
              cursor: i <= currentStep ? "pointer" : "default", transition: "all .2s",
              opacity: i > currentStep ? 0.5 : 1, minWidth: 80,
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 4 }}>{step.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: i === currentStep ? "var(--accent2)" : "var(--muted)" }}>{step.label}</div>
          </div>
        ))}
      </div>

      {/* === STEP 0: DOSYA YÜKLE === */}
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

      {/* === STEP 1: AI ANALİZ === */}
      {currentStep === 1 && (
        <div>
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 12 }}>AI Analiz</h3>
            <p style={{ color: "var(--muted)", maxWidth: 480, margin: "0 auto 32px" }}>
              Yüklediğiniz görseller Gemini AI tarafından analiz edilerek ürün kategorisi, parça yapısı ve detayları belirlenecek.
            </p>

            {analysisError && (
              <div style={{ background: "rgba(255,77,46,0.1)", color: "#ff4d2e", padding: "12px 20px", borderRadius: 12, marginBottom: 20, maxWidth: 500, margin: "0 auto 20px", fontSize: 14 }}>
                ⚠️ {analysisError}
              </div>
            )}

            {!analysisResult && (
              <button
                className="btn btn-accent btn-lg"
                onClick={runAnalysis}
                disabled={analyzing}
                style={{ opacity: analyzing ? 0.7 : 1, cursor: analyzing ? "wait" : "pointer" }}
              >
                {analyzing ? "⏳ Analiz Ediliyor..." : "🤖 Analizi Başlat (1 Kredi)"}
              </button>
            )}
          </div>

          {/* Analiz Sonuçları */}
          {analysisResult && (
            <div style={{ maxWidth: 700, margin: "0 auto" }}>
              <div style={{ padding: 24, background: "#fff", border: "2px solid rgba(0,200,150,0.3)", borderRadius: 16, marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h4 style={{ fontWeight: 700, margin: 0 }}>✅ Analiz Sonuçları</h4>
                  {analysisResult.confidence && (
                    <span style={{ background: "rgba(0,200,150,0.1)", color: "#009a6e", padding: "4px 12px", borderRadius: 20, fontWeight: 700, fontSize: 14 }}>
                      %{(analysisResult.confidence * 100).toFixed(0)} Güven
                    </span>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Kategori", value: analysisResult.category },
                    { label: "Giysi Tipi", value: analysisResult.garment_type },
                    { label: "Siluet", value: analysisResult.silhouette },
                    { label: "Yaka", value: analysisResult.collar_type },
                    { label: "Kol", value: analysisResult.sleeve_type },
                    { label: "Kapatma", value: analysisResult.closure_type },
                    { label: "Bel", value: analysisResult.waist_type },
                    { label: "Etek Ucu", value: analysisResult.hem_type },
                    { label: "Boy", value: analysisResult.length },
                    { label: "Kumaş Önerisi", value: analysisResult.fabric_suggestion },
                  ].filter(r => r.value).map((row, i) => (
                    <div key={i} style={{ padding: "10px 14px", background: "var(--surface)", borderRadius: 10, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, color: "var(--muted)" }}>{row.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{String(row.value)}</span>
                    </div>
                  ))}
                </div>

                {analysisResult.details && analysisResult.details.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Detaylar:</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {analysisResult.details.map((d: string, i: number) => (
                        <span key={i} className="badge badge-green">{d}</span>
                      ))}
                    </div>
                  </div>
                )}

                {analysisResult.estimated_pieces && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Tahmini Parçalar:</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {analysisResult.estimated_pieces.map((p: string, i: number) => (
                        <span key={i} style={{ padding: "4px 10px", background: "rgba(26,86,255,0.08)", color: "var(--accent2)", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>{p}</span>
                      ))}
                    </div>
                  </div>
                )}

                {analysisResult.construction_notes && (
                  <div style={{ marginTop: 16, padding: "12px 14px", background: "rgba(255,184,0,0.06)", borderRadius: 10, fontSize: 13 }}>
                    <strong>📝 Dikiş Notları:</strong> {analysisResult.construction_notes}
                  </div>
                )}

                {analysisResult.demo_mode && (
                  <div style={{ marginTop: 16, padding: "12px 14px", background: "rgba(255,77,46,0.08)", borderRadius: 10, fontSize: 13, color: "#ff4d2e" }}>
                    ⚠️ Demo modu — GEMINI_API_KEY tanımlı değil. Gerçek analiz için API key gerekli.
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <button className="btn btn-outline" onClick={() => { setAnalysisResult(null); runAnalysis(); }}>🔄 Tekrar Analiz Et</button>
                <button className="btn btn-accent" onClick={() => setCurrentStep(2)}>Kalıp Oluştur →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === STEP 2: KALIP OLUŞTUR === */}
      {currentStep === 2 && (
        <div>
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✂️</div>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 12 }}>AI Kalıp Üretimi</h3>
            <p style={{ color: "var(--muted)", maxWidth: 520, margin: "0 auto 32px" }}>
              Gemini AI, yüklediğiniz görseli ve analiz sonuçlarını kullanarak gerçekçi kalıp parçaları oluşturacak (Beden M / 42 EU).
            </p>

            {patternError && (
              <div style={{ background: "rgba(255,77,46,0.1)", color: "#ff4d2e", padding: "12px 20px", borderRadius: 12, marginBottom: 20, maxWidth: 500, margin: "0 auto 20px", fontSize: 14 }}>
                ⚠️ {patternError}
              </div>
            )}

            {!patternResult && (
              <button
                className="btn btn-accent btn-lg"
                onClick={generatePattern}
                disabled={generating}
                style={{ opacity: generating ? 0.7 : 1, cursor: generating ? "wait" : "pointer" }}
              >
                {generating ? "⏳ Kalıp Oluşturuluyor... (15-30 sn)" : "✂️ Kalıp Oluştur"}
              </button>
            )}
          </div>

          {/* Kalıp Sonuçları */}
          {patternResult && (
            <div>
              <div style={{ padding: 24, background: "#fff", border: "2px solid rgba(26,86,255,0.3)", borderRadius: 16, marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h4 style={{ fontWeight: 700, margin: 0 }}>
                    {patternResult.ai_generated ? "✅ AI ile Oluşturuldu" : "📐 Şablon Kalıp"}
                  </h4>
                  {patternResult.garment_type && (
                    <span style={{ background: "rgba(26,86,255,0.08)", color: "var(--accent2)", padding: "4px 12px", borderRadius: 20, fontWeight: 600, fontSize: 13 }}>
                      {patternResult.garment_type}
                    </span>
                  )}
                </div>

                {patternResult.total_piece_count && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                    <div style={{ padding: 12, background: "var(--surface)", borderRadius: 10, textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Syne', sans-serif" }}>{patternResult.total_piece_count}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>Parça Sayısı</div>
                    </div>
                    <div style={{ padding: 12, background: "var(--surface)", borderRadius: 10, textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Syne', sans-serif" }}>{patternResult.base_size || "M"}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>Baz Beden</div>
                    </div>
                    <div style={{ padding: 12, background: "var(--surface)", borderRadius: 10, textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Syne', sans-serif", color: patternResult.ai_generated ? "#00c896" : "#ffb800" }}>
                        {patternResult.ai_generated ? "AI" : "TPL"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>Tür</div>
                    </div>
                  </div>
                )}

                {/* SVG kalıp görseli */}
                <div style={{ background: "#fafaf8", borderRadius: 12, padding: 20, minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  {renderPatternSVG() || (
                    <p style={{ color: "var(--muted)" }}>Kalıp verisi SVG olarak görüntülenemiyor.</p>
                  )}
                </div>

                {/* Parça listesi */}
                {patternResult.pieces && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>Parçalar:</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {Object.entries(patternResult.pieces).map(([name, piece]: [string, any]) => (
                        <div key={name} style={{ padding: "10px 14px", background: "var(--surface)", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{name.replace(/_/g, " ")}</span>
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>
                            {piece.quantity && `x${piece.quantity}`}
                            {piece.grain_direction && ` · ${piece.grain_direction}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Montaj sırası */}
                {patternResult.assembly_order && patternResult.assembly_order.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Montaj Sırası:</div>
                    <div style={{ padding: "12px 14px", background: "rgba(0,200,150,0.04)", borderRadius: 10, fontSize: 13, lineHeight: 1.8 }}>
                      {patternResult.assembly_order.map((line: string, i: number) => (
                        <div key={i}>{line}</div>
                      ))}
                    </div>
                  </div>
                )}

                {!patternResult.ai_generated && patternResult.fallback_reason && (
                  <div style={{ marginTop: 16, padding: "12px 14px", background: "rgba(255,184,0,0.08)", borderRadius: 10, fontSize: 13, color: "#b38600" }}>
                    ⚠️ {patternResult.fallback_reason}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <button className="btn btn-outline" onClick={() => { setPatternResult(null); generatePattern(); }}>🔄 Tekrar Oluştur</button>
                <button className="btn btn-accent" onClick={() => setCurrentStep(3)}>Kalıp Editör →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === STEP 3: KALIP EDİTÖR === */}
      {currentStep === 3 && (
        <div className={styles.editorLayout}>
          <div className={styles.canvasArea}>
            <div className={styles.canvasToolbar2}>
              {["✦ Seç", "⊕ Ekle", "📏 Ölçü", "↩ Geri"].map((t, i) => (
                <button key={i} className="btn btn-sm btn-ghost">{t}</button>
              ))}
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>2D Pattern Editör</span>
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 500, background: "#fafaf8", position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, #d4d4d4 1px, transparent 1px)", backgroundSize: "24px 24px", opacity: 0.5 }} />
              <div style={{ position: "relative", zIndex: 1, width: "90%", height: "90%" }}>
                {patternResult ? renderPatternSVG() : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted)" }}>
                    <p>Önce kalıp oluşturun (Step 2)</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className={styles.sidePanel}>
            <div className={styles.panelSection}>
              <div className={styles.panelTitle}>Parçalar</div>
              {patternResult?.pieces ? (
                Object.entries(patternResult.pieces).map(([name, piece]: [string, any], i: number) => (
                  <div key={i} style={{ padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, background: "var(--surface)" }}>
                    <span>{name.replace(/_/g, " ")}</span>
                    <span style={{ fontSize: 10, color: "#00c896" }}>✓ {piece.quantity && `x${piece.quantity}`}</span>
                  </div>
                ))
              ) : (
                ["Ön Beden", "Arka Beden", "Kol (x2)", "Yaka"].map((p, i) => (
                  <div key={i} style={{ padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 4, background: "var(--surface)", color: "var(--muted)" }}>
                    {p}
                  </div>
                ))
              )}
            </div>
            <div style={{ padding: 20 }}>
              <button className="btn btn-accent" style={{ width: "100%" }} onClick={() => setCurrentStep(4)}>Dikiş Payı →</button>
            </div>
          </div>
        </div>
      )}

      {/* === STEP 4-7: Diğer adımlar (mevcut UI korunuyor) === */}
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
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button className="btn btn-outline" onClick={() => setCurrentStep(4)}>← Geri</button>
            <button className="btn btn-accent" onClick={() => setCurrentStep(6)}>Seriyi Oluştur & Pastal →</button>
          </div>
        </div>
      )}

      {currentStep === 6 && (
        <div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Pastal / Marker Yerleşimi</h3>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button className="btn btn-outline" onClick={() => setCurrentStep(5)}>← Geri</button>
            <button className="btn btn-accent" onClick={() => setCurrentStep(7)}>QA & Export →</button>
          </div>
        </div>
      )}

      {currentStep === 7 && (
        <div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 20 }}>QA Validation & Export</h3>
          <h4 style={{ fontWeight: 700, marginBottom: 16 }}>Export Formatları</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              { format: "DXF", icon: "📐", desc: "Lectra, Gerber uyumlu kalıp dosyası" },
              { format: "PDF", icon: "📄", desc: "A4 tiled, gerçek ölçekli çıktı" },
              { format: "CSV", icon: "📊", desc: "Parça raporu ve ölçü tablosu" },
            ].map((e, i) => (
              <div key={i} style={{ padding: 20, background: "#fff", border: "1px solid var(--border)", borderRadius: 12, textAlign: "center" }}>
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
