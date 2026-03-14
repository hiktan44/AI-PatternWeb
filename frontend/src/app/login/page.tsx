"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, apiLogin, apiRegister } from "@/stores/authStore";

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = isRegister ? await apiRegister(email, name, password) : await apiLogin(email, password);
      setAuth(res.user, res.access_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface)", padding: 20 }}>
      <div style={{ maxWidth: 420, width: "100%", background: "#fff", borderRadius: 24, padding: 40, border: "1px solid var(--border)", boxShadow: "0 16px 48px rgba(0,0,0,0.08)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 10, height: 10, background: "var(--accent1)", borderRadius: "50%", display: "inline-block" }} />
            AI-PatternWeb
          </div>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>
            {isRegister ? "Ücretsiz hesap oluşturun" : "Hesabınıza giriş yapın"}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Ad Soyad</label>
              <input className="input-field" style={{ width: "100%" }} placeholder="Adınız Soyadınız" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Email</label>
            <input className="input-field" style={{ width: "100%" }} type="email" placeholder="ornek@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Şifre</label>
            <input className="input-field" style={{ width: "100%" }} type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>

          {error && <div style={{ background: "rgba(255,77,46,0.08)", color: "var(--accent1)", padding: "10px 16px", borderRadius: 10, fontSize: 13, marginBottom: 16, fontWeight: 500 }}>{error}</div>}

          <button className="btn btn-accent" style={{ width: "100%", justifyContent: "center", padding: "14px 24px" }} disabled={loading}>
            {loading ? "Yükleniyor..." : isRegister ? "Kayıt Ol" : "Giriş Yap"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "var(--muted)" }}>
          {isRegister ? "Zaten hesabınız var mı?" : "Hesabınız yok mu?"}{" "}
          <button onClick={() => { setIsRegister(!isRegister); setError(""); }} style={{ background: "none", color: "var(--accent2)", fontWeight: 600, cursor: "pointer", border: "none", fontSize: 14 }}>
            {isRegister ? "Giriş Yap" : "Ücretsiz Kayıt Ol"}
          </button>
        </div>

        {isRegister && <p style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "var(--muted)" }}>14 gün ücretsiz deneme · Kredi kartı gerekmez</p>}
      </div>
    </div>
  );
}
