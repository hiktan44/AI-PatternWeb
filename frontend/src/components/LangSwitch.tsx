"use client";

import { useLang } from "@/lib/use-lang";
import { useT } from "@/lib/i18n";
import { useEffect } from "react";

/**
 * LangDocumentSync — Dinamik olarak document lang attribute günceller
 * IP bazlı tespit veya kullanıcı tercihi değiştiğinde HTML lang attribute güncellenir
 */
function LangDocumentSync() {
  const [lang] = useLang();

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  return null;
}

/**
 * LangSwitch — TR/EN dil değiştirme bileşeni
 * Kullanıcı manuel dil değiştirdiğinde localStorage + cookie güncellenir
 * IP bazlı otomatik tespit sonrası kullanıcı tercihi her zaman öncelikli olur
 */
export function LangSwitch() {
  const [lang, setLang] = useLang();
  const t = useT();

  const handleLanguageChange = (newLang: "tr" | "en") => {
    setLang(newLang);
  };

  return (
    <>
      <LangDocumentSync />
      <div className="flex items-center text-xs border rounded-md overflow-hidden">
        <button
          onClick={() => handleLanguageChange("tr")}
          className={`px-2 py-1 transition-colors ${
            lang === "tr"
              ? "bg-primary text-primary-foreground"
              : "bg-background hover:bg-accent"
          }`}
          aria-label={t("lang.switch")}
          title="Türkçe"
        >
          🇹🇷 TR
        </button>
        <button
          onClick={() => handleLanguageChange("en")}
          className={`px-2 py-1 transition-colors ${
            lang === "en"
              ? "bg-primary text-primary-foreground"
              : "bg-background hover:bg-accent"
          }`}
          aria-label="English"
          title="English"
        >
          🇬🇧 EN
        </button>
      </div>
    </>
  );
}
