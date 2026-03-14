"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, apiLogin, apiRegister, apiGoogleLogin } from "@/stores/authStore";
import Script from "next/script";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement | null, config: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const handleGoogleCallback = useCallback(async (response: { credential: string }) => {
    setGoogleLoading(true);
    setError("");
    try {
      const res = await apiGoogleLogin(response.credential, false);
      setAuth(res.user, res.access_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google ile giriş başarısız");
    }
    setGoogleLoading(false);
  }, [setAuth, router]);

  const initializeGoogle = useCallback(() => {
    if (window.google && GOOGLE_CLIENT_ID) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
        auto_select: false,
        ux_mode: "popup",
      });
      const btnEl = document.getElementById("google-signin-btn");
      if (btnEl) {
        window.google.accounts.id.renderButton(btnEl, {
          type: "standard",
          shape: "pill",
          theme: "outline",
          text: "signin_with",
          size: "large",
          width: 340,
          logo_alignment: "center",
        });
      }
    }
  }, [handleGoogleCallback]);

  useEffect(() => {
    if (window.google) {
      initializeGoogle();
    }
  }, [initializeGoogle]);

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
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initializeGoogle}
      />
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)",
        padding: 20,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background blobs */}
        <div style={{
          position: "absolute", width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(26,86,255,0.12) 0%, transparent 70%)",
          top: -100, right: -100, pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", width: 350, height: 350, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,77,46,0.08) 0%, transparent 70%)",
          bottom: -80, left: -80, pointerEvents: "none",
        }} />

        <div style={{
          maxWidth: 440,
          width: "100%",
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: 24,
          padding: "40px 36px",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
          position: "relative",
          zIndex: 1,
        }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <a href="/" style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: 22,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "#fff",
              textDecoration: "none",
              marginBottom: 12,
            }}>
              <span style={{
                width: 10, height: 10,
                background: "linear-gradient(135deg, #ff4d2e, #ff7a5c)",
                borderRadius: "50%",
                display: "inline-block",
                boxShadow: "0 0 12px rgba(255,77,46,0.5)",
              }} />
              AI-PatternWeb
            </a>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginTop: 8 }}>
              {isRegister ? "Ücretsiz hesap oluşturun" : "Hesabınıza giriş yapın"}
            </p>
          </div>

          {/* Google Login */}
          {GOOGLE_CLIENT_ID ? (
            <div style={{ marginBottom: 24 }}>
              <div id="google-signin-btn" style={{
                display: "flex",
                justifyContent: "center",
                minHeight: 44,
              }} />
              {googleLoading && (
                <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 8 }}>
                  Google ile giriş yapılıyor...
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                // Google Client ID yoksa popup ile bilgilendirme
                setError("Google ile giriş yakında aktif olacak. Lütfen email ile devam edin.");
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "12px 20px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                marginBottom: 24,
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.2)";
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google ile Giriş Yap
            </button>
          )}

          {/* Divider */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
          }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>
              veya
            </span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit}>
            {isRegister && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "rgba(255,255,255,0.7)" }}>Ad Soyad</label>
                <input
                  style={inputStyle}
                  placeholder="Adınız Soyadınız"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "rgba(255,255,255,0.7)" }}>Email</label>
              <input
                style={inputStyle}
                type="email"
                placeholder="ornek@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "rgba(255,255,255,0.7)" }}>Şifre</label>
              <input
                style={inputStyle}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {error && (
              <div style={{
                background: "rgba(255,77,46,0.1)",
                color: "#ff6b4a",
                padding: "10px 16px",
                borderRadius: 10,
                fontSize: 13,
                marginBottom: 16,
                fontWeight: 500,
                border: "1px solid rgba(255,77,46,0.2)",
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px 24px",
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg, #ff4d2e, #ff6b4a)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                transition: "all 0.2s ease",
                boxShadow: "0 4px 16px rgba(255,77,46,0.3)",
              }}
            >
              {loading ? "Yükleniyor..." : isRegister ? "Kayıt Ol" : "Giriş Yap"}
            </button>
          </form>

          {/* Switch */}
          <div style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
            {isRegister ? "Zaten hesabınız var mı?" : "Hesabınız yok mu?"}{" "}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
              style={{
                background: "none",
                color: "#4d9aff",
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
                fontSize: 14,
              }}
            >
              {isRegister ? "Giriş Yap" : "Ücretsiz Kayıt Ol"}
            </button>
          </div>

          {isRegister && (
            <p style={{
              textAlign: "center",
              marginTop: 16,
              fontSize: 12,
              color: "rgba(255,255,255,0.3)",
            }}>
              14 gün ücretsiz deneme · Kredi kartı gerekmez
            </p>
          )}
        </div>
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.2s ease",
  boxSizing: "border-box",
};
