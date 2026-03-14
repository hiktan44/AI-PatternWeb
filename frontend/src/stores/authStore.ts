"use client";

import { create } from "zustand";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  credits: number;
  email_verified: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
}

const API = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  loading: false,
  error: null,
  setAuth: (user, token) => {
    localStorage.setItem("token", token);
    set({ user, token, error: null });
  },
  logout: () => {
    localStorage.removeItem("token");
    set({ user: null, token: null });
  },
  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e, loading: false }),
}));

export async function apiRegister(email: string, name: string, password: string) {
  const res = await fetch(`${API}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Kayıt başarısız");
  }
  return res.json();
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Giriş başarısız");
  }
  return res.json();
}

export async function apiGetMe(token: string) {
  const res = await fetch(`${API}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Oturum geçersiz");
  return res.json();
}
