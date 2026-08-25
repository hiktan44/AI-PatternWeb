"use client";
import { useEffect, useState } from "react";

const KEY = "ui_lang";
const IP_CACHE_KEY = "ip_country_cache";
const IP_DETECTION_DONE_KEY = "ip_detection_done";

export type Lang = "tr" | "en";

/**
 * IP bazlı ülke tespiti ile otomatik dil seçimi
 * Türkiye'den gelen ziyaretçiler için TR, diğerleri için EN
 * Fallback chain: ipapi.co → ipwho.is → navigator.language → varsayılan TR
 */
async function detectCountryFromIP(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  // Önce cache kontrolü (24 saat)
  const cached = sessionStorage.getItem(IP_CACHE_KEY);
  if (cached) {
    const { country, timestamp } = JSON.parse(cached);
    const isRecent = Date.now() - timestamp < 24 * 60 * 60 * 1000; // 24 saat
    if (isRecent) return country;
  }

  // IP API sırası: ipapi.co → ipwho.is → fallback
  const apis = [
    {
      url: "https://ipapi.co/json/",
      timeout: 2500,
      getCountry: (data: any) => data.country_code
    },
    {
      url: "https://ipwho.is/",
      timeout: 2500,
      getCountry: (data: any) => data.country_code
    }
  ];

  for (const api of apis) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), api.timeout);

      const response = await fetch(api.url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const data = await response.json();
      const country = api.getCountry(data);

      if (country && typeof country === 'string') {
        // Cache'e kaydet
        sessionStorage.setItem(IP_CACHE_KEY, JSON.stringify({
          country,
          timestamp: Date.now()
        }));
        return country;
      }
    } catch (error) {
      // Hata olursa sonraki API'ye geç
      continue;
    }
  }

  // Tüm API'ler başarısız olursa navigator.language fallback
  try {
    const browserLang = navigator.language || navigator.languages?.[0];
    if (browserLang) {
      const isTurkish = browserLang.toLowerCase().startsWith('tr');
      const country = isTurkish ? 'TR' : null;

      if (country) {
        sessionStorage.setItem(IP_CACHE_KEY, JSON.stringify({
          country,
          timestamp: Date.now()
        }));
      }
      return country;
    }
  } catch (error) {
    // En son fallback olarak TR döndür (Türkiye proj için varsayılan)
    return 'TR';
  }

  return null;
}

/**
 * Geliştirilmiş dil state'i — IP tabanlı otomatik tespit + kullanıcı tercihi
 * Kullanıcı manuel dil değiştirdiğinde bu tercih her zaman öncelikli olur
 */
export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>("tr");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Önce manuel kullanıcı tercihine bak (localStorage)
    const userPreference = window.localStorage.getItem(KEY);
    if (userPreference === "tr" || userPreference === "en") {
      setLang(userPreference);
      return; // Kullanıcı tercihi varsa, IP tespiti yapma
    }

    // 2. Kullanıcı tercihi yoksa ve henüz IP tespiti yapılmadıysa
    const detectionDone = sessionStorage.getItem(IP_DETECTION_DONE_KEY);
    if (!detectionDone) {
      detectCountryFromIP().then(country => {
        if (country === 'TR') {
          setLang("tr");
        } else {
          setLang("en");
        }
        // Tekrar tespit yapmamak için işaretle
        sessionStorage.setItem(IP_DETECTION_DONE_KEY, "true");
      }).catch(() => {
        // Herhangi bir hata durumunda varsayılan TR
        setLang("tr");
        sessionStorage.setItem(IP_DETECTION_DONE_KEY, "true");
      });
    } else {
      // Daha önce tespit yapılmışsa, localStorage'daki tercihi kullan
      if (userPreference === "tr" || userPreference === "en") {
        setLang(userPreference);
      }
    }
  }, []);

  const updateLang = (newLang: Lang) => {
    setLang(newLang);
    if (typeof window !== "undefined") {
      // Manuel tercihi kaydet (her zaman IP tespitinden öncelikli)
      window.localStorage.setItem(KEY, newLang);

      // Server component'lerin de dili okuyabilmesi için cookie yaz (1 yıl)
      document.cookie = `${KEY}=${newLang}; path=/; max-age=31536000; SameSite=Lax`;

      // Diğer tab/component'leri tetikle
      window.dispatchEvent(new Event("ui_lang_change"));
    }
  };

  // İlk yüklemede localStorage ↔ cookie senkronizasyonu (server ile tutarlılık)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(KEY);
    if ((saved === "tr" || saved === "en") && !document.cookie.includes(`${KEY}=${saved}`)) {
      document.cookie = `${KEY}=${saved}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, []);

  // Diğer component'lerden dil değiştirildiğinde sync ol
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      const saved = window.localStorage.getItem(KEY);
      if (saved === "tr" || saved === "en") setLang(saved);
    };
    window.addEventListener("ui_lang_change", handler);
    return () => window.removeEventListener("ui_lang_change", handler);
  }, []);

  return [lang, updateLang];
}

/**
 * Dil tercihine göre başlık/özet seç.
 * tr → Türkçe varsa onu, yoksa İngilizce
 * en → İngilizce varsa onu, yoksa Türkçe
 */
export function pickByLang(
  lang: Lang,
  tr: string | null | undefined,
  en: string | null | undefined
): string {
  if (lang === "tr") return tr || en || "";
  return en || tr || "";
}
