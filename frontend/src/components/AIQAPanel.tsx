"use client";

import { useState, useEffect, useCallback } from "react";

interface AIQAPanelProps {
  projectId: string;
  token: string | null;
  currentPattern: any;
  onPatternUpdated: (newPattern: any) => void;
  onQAComplete?: (data: any) => void;
}

interface QAResult {
  id: string;
  name: string;
  category: string;
  critical: boolean;
  passed: boolean;
  detail: string | null;
  severity?: "critical" | "warning" | "info" | "passed";
}

interface QAData {
  status: "PASSED" | "FAILED";
  score: number;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  critical_failures: number;
  results: QAResult[];
  export_allowed: boolean;
  severity_summary?: {
    critical: number;
    warning: number;
    info: number;
  };
}

const API = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function AIQAPanel({ projectId, token, currentPattern, onPatternUpdated, onQAComplete }: AIQAPanelProps) {
  const [qaData, setQaData] = useState<QAData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "critical" | "warning" | "info">("all");
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

  // QA Doğrulamasını backend'den çek
  const fetchQA = useCallback(async () => {
    if (!token || !projectId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/projects/${projectId}/qa-validate`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "QA Analizi yüklenemedi");
      }
      const data = await res.json();
      setQaData(data);
      if (onQAComplete) {
        onQAComplete(data);
      }
    } catch (err: any) {
      setError(err.message || "Kalite kontrolü sırasında bir sorun oluştu.");
    } finally {
      setLoading(false);
    }
  }, [token, projectId, onQAComplete]);

  // Kalıp değiştiğinde QA'yi tekrar çalıştır
  useEffect(() => {
    if (currentPattern) {
      fetchQA();
    }
  }, [currentPattern, fetchQA]);

  // Otonom Hata Düzeltme API'sini tetikle
  const handleAutoFix = async () => {
    if (!token || !projectId || fixing) return;
    setFixing(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/projects/${projectId}/qa-autofix`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Otomatik düzeltme başarısız oldu");
      }
      const data = await res.json();
      
      const updatedQA = {
        status: data.status,
        score: data.score,
        total_checks: data.total_checks,
        passed_checks: data.passed_checks,
        failed_checks: data.failed_checks,
        critical_failures: data.critical_failures,
        results: data.results || [],
        export_allowed: data.status === "PASSED",
        severity_summary: data.severity_summary,
      };

      // QA datasını güncelle
      setQaData(updatedQA);
      if (onQAComplete) {
        onQAComplete(updatedQA);
      }

      // Ebeveyn bileşendeki kalıp koordinatlarını güncelle
      if (data.pieces) {
        onPatternUpdated({
          ...currentPattern,
          pieces: data.pieces,
        });
      }
    } catch (err: any) {
      setError(err.message || "Hata düzeltme işlemi sırasında bir sorun oluştu.");
    } finally {
      setFixing(false);
    }
  };

  const toggleAccordion = (id: string) => {
    setOpenAccordions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading && !qaData) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 40, gap: 12 }}>
        <span className="loading-spinner-qa" />
        <p style={{ color: "var(--muted)", fontSize: 13, fontWeight: 500 }}>AI Kalite Güvence Analizi Çalıştırılıyor...</p>
      </div>
    );
  }

  if (error && !qaData) {
    return (
      <div style={{ padding: 20, background: "rgba(255,77,46,0.06)", border: "1px solid rgba(255,77,46,0.15)", borderRadius: 16, color: "#ff4d2e", fontSize: 13 }}>
        <p style={{ fontWeight: 700, margin: "0 0 8px 0" }}>⚠️ Kalite Kontrol Hatası</p>
        <p style={{ margin: 0 }}>{error}</p>
        <button onClick={fetchQA} className="btn btn-sm btn-outline" style={{ marginTop: 12, color: "#ff4d2e", borderColor: "#ff4d2e" }}>Yeniden Dene</button>
      </div>
    );
  }

  if (!qaData) return null;

  const severitySummary = qaData.severity_summary || {
    critical: qaData.results.filter(r => !r.passed && r.critical).length,
    warning: qaData.results.filter(r => !r.passed && r.severity === "warning").length,
    info: qaData.results.filter(r => !r.passed && r.severity === "info").length,
  };

  // Filtrelenmiş Hatalar
  const filteredResults = qaData.results.filter((r) => {
    if (r.passed) return false; // Sadece hataları listele
    const severity = r.critical ? "critical" : (r.severity || "info");
    if (activeFilter === "all") return true;
    return severity === activeFilter;
  });

  const hasFixableErrors = qaData.results.some((r) => !r.passed && r.passed !== undefined); // closed_contour vb düzeltilebilir
  const scoreColor = qaData.score >= 90 ? "#00c896" : qaData.score >= 60 ? "#ffb800" : "#ff4d2e";

  return (
    <div style={{
      background: "rgba(255, 255, 255, 0.4)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(255, 255, 255, 0.5)",
      boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.04)",
      borderRadius: 24,
      padding: 24,
      display: "flex",
      flexDirection: "column",
      gap: 20,
      width: "100%",
      transition: "all 0.3s ease",
    }}>
      {/* Üst Kısım: Başlık & Durum */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h4 style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
            🛡️ AI Kalite Güvence Analizi
          </h4>
          <p style={{ margin: "4px 0 0 0", fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>
            20 Geometrik & Teknik Standart Denetimi
          </p>
        </div>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1,
          padding: "4px 10px",
          borderRadius: 20,
          background: qaData.status === "PASSED" ? "rgba(0, 200, 150, 0.1)" : "rgba(255, 77, 46, 0.1)",
          color: qaData.status === "PASSED" ? "#00c896" : "#ff4d2e",
        }}>
          {qaData.status === "PASSED" ? "KUSURSUZ (PASSED)" : "İNCELEME GEREKLİ"}
        </span>
      </div>

      {/* Skor ve Özet Alanı */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: 20,
        background: "rgba(255, 255, 255, 0.6)",
        borderRadius: 20,
        border: "1px solid rgba(255, 255, 255, 0.8)",
      }}>
        {/* Dairesel HSL İlerleme Halkası */}
        <div style={{ position: "relative", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" stroke="rgba(0,0,0,0.03)" strokeWidth="6" fill="transparent" />
            <circle
              cx="40"
              cy="40"
              r="34"
              stroke={scoreColor}
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 34}
              strokeDashoffset={2 * Math.PI * 34 * (1 - qaData.score / 100)}
              strokeLinecap="round"
              transform="rotate(-90 40 40)"
              style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.3s ease" }}
            />
          </svg>
          <div style={{
            position: "absolute",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", fontFamily: "'Syne', sans-serif" }}>
              {Math.round(qaData.score)}
            </span>
            <span style={{ fontSize: 8, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>SKOR</span>
          </div>
        </div>

        {/* Hata Özet Sayacı */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Kalıp Geometri Durumu</div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff4d2e" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#ff4d2e" }}>{severitySummary.critical} Kritik</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffb800" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#b38600" }}>{severitySummary.warning} Uyarı</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3498db" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#3498db" }}>{severitySummary.info} Bilgi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Fix Otonom Butonu */}
      {qaData.status === "FAILED" && (
        <div style={{ position: "relative" }}>
          <button
            onClick={handleAutoFix}
            disabled={fixing}
            style={{
              width: "100%",
              padding: "14px 20px",
              borderRadius: 16,
              border: "none",
              background: "linear-gradient(135deg, #7b2cbf 0%, #3a0ca3 100%)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: fixing ? "wait" : "pointer",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 4px 15px rgba(58, 12, 163, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset",
              position: "relative",
              overflow: "hidden",
            }}
            className="autofix-btn"
          >
            {fixing ? (
              <>
                <span className="loading-spinner-qa-small" />
                <span>Otonom AI Tamir Modu Aktif...</span>
              </>
            ) : (
              <>
                <span>✨ Otonom AI Kalıp Düzeltici</span>
              </>
            )}
          </button>
          
          <style jsx global>{`
            .autofix-btn::before {
              content: '';
              position: absolute;
              top: 0; left: -150%;
              width: 50%; height: 100%;
              background: linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent);
              transform: skewX(-25deg);
              transition: 0.75s;
            }
            .autofix-btn:hover:not(:disabled)::before {
              left: 150%;
              transition: 0.75s;
            }
            .autofix-btn:hover:not(:disabled) {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(58, 12, 163, 0.6), 0 0 10px rgba(123, 44, 191, 0.5);
            }
            .loading-spinner-qa {
              width: 32px;
              height: 32px;
              border: 3.5px solid rgba(26, 86, 255, 0.1);
              border-top-color: #1a56ff;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
            }
            .loading-spinner-qa-small {
              width: 16px;
              height: 16px;
              border: 2px solid rgba(255, 255, 255, 0.2);
              border-top-color: #fff;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Hata Filtresi Sekmesi */}
      {qaData.status === "FAILED" && (
        <div style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.03)", padding: 4, borderRadius: 12 }}>
          {[
            { id: "all", name: "Tümü" },
            { id: "critical", name: "Kritik", color: "#ff4d2e" },
            { id: "warning", name: "Uyarı", color: "#b38600" },
            { id: "info", name: "Bilgi", color: "#3498db" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              style={{
                flex: 1,
                padding: "6px 8px",
                borderRadius: 8,
                border: "none",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                background: activeFilter === tab.id ? "#fff" : "transparent",
                color: activeFilter === tab.id ? (tab.color || "var(--text)") : "var(--muted)",
                boxShadow: activeFilter === tab.id ? "0 2px 8px rgba(0,0,0,0.04)" : "none",
                transition: "all 0.2s",
              }}
            >
              {tab.name}
            </button>
          ))}
        </div>
      )}

      {/* Hata Listesi Akordeon */}
      {qaData.status === "FAILED" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto", paddingRight: 4 }}>
          {filteredResults.length > 0 ? (
            filteredResults.map((err) => {
              const severity = err.critical ? "critical" : (err.severity || "info");
              const isOpen = !!openAccordions[err.id];
              const theme = {
                critical: { bg: "rgba(255, 77, 46, 0.04)", border: "rgba(255, 77, 46, 0.15)", text: "#ff4d2e", icon: "🔴" },
                warning: { bg: "rgba(255, 184, 0, 0.04)", border: "rgba(255, 184, 0, 0.15)", text: "#b38600", icon: "🟡" },
                info: { bg: "rgba(52, 152, 219, 0.04)", border: "rgba(52, 152, 219, 0.15)", text: "#3498db", icon: "🔵" },
              }[severity];

              return (
                <div
                  key={err.id}
                  style={{
                    background: theme.bg,
                    border: `1px solid ${theme.border}`,
                    borderRadius: 14,
                    overflow: "hidden",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    onClick={() => toggleAccordion(err.id)}
                    style={{
                      padding: "12px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14 }}>{theme.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{err.name}</span>
                    </div>
                    <span style={{ fontSize: 10, color: "var(--muted)", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                      ▼
                    </span>
                  </div>

                  {isOpen && (
                    <div style={{
                      padding: "0 16px 14px 16px",
                      fontSize: 11.5,
                      lineHeight: 1.5,
                      color: "var(--text)",
                      borderTop: "1px solid rgba(0,0,0,0.02)",
                      paddingTop: 10,
                    }}>
                      <div style={{ fontWeight: 500, opacity: 0.8 }}>
                        {err.detail || "Detaylı açıklama bulunmuyor. AI otomatik tamir özelliğini kullanarak bu hatayı düzeltebilirsiniz."}
                      </div>
                      <div style={{
                        marginTop: 10,
                        padding: "6px 10px",
                        background: "rgba(0,0,0,0.02)",
                        borderRadius: 8,
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: "var(--muted)",
                        display: "flex",
                        justifyContent: "space-between"
                      }}>
                        <span>Otomatik Düzeltilebilir:</span>
                        <span style={{ color: "#00c896" }}>Evet (AI Desteğiyle)</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: 12, fontWeight: 500 }}>
              Filtreye uygun hata bulunamadı.
            </div>
          )}
        </div>
      )}

      {/* Başarılı Durumda Tebrik Mesajı */}
      {qaData.status === "PASSED" && (
        <div style={{
          padding: 20,
          background: "rgba(0, 200, 150, 0.05)",
          border: "1px solid rgba(0, 200, 150, 0.15)",
          borderRadius: 20,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{ fontSize: 32 }}>🎉</span>
          <div style={{ fontWeight: 800, color: "#00c896", fontSize: 14 }}>Tebrikler! Kalıp Standartlara Uygun</div>
          <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5 }}>
            Bu kalıp üretilebilirlik ve standart kalifikasyon denetimlerinin tamamını (20/20) başarıyla geçti. Güvenle üretime ve export aşamasına geçebilirsiniz.
          </p>
        </div>
      )}
    </div>
  );
}
