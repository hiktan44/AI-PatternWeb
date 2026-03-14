"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, apiGetMe } from "@/stores/authStore";
import styles from "./dashboard.module.css";

const NAV_ITEMS = [
  { href: "/dashboard", icon: "📊", label: "Dashboard" },
  { href: "/projects", icon: "📁", label: "Projeler" },
  { href: "/patterns", icon: "✂️", label: "Kalıplar" },
  { href: "/templates", icon: "📐", label: "Şablonlar" },
  { href: "/billing", icon: "💳", label: "Plan & Kredi" },
  { href: "/settings", icon: "⚙️", label: "Ayarlar" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, token, setAuth, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    apiGetMe(token)
      .then((u) => {
        useAuthStore.getState().setAuth(u, token);
        setLoading(false);
      })
      .catch(() => {
        logout();
        router.push("/login");
      });
  }, [token, router, logout]);

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingSpinner} />
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashLayout}>
      {/* SIDEBAR */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logoMini}>
            <span className={styles.logoDot} />
            {sidebarOpen && <span>AI-PatternWeb</span>}
          </div>
          <button className={styles.toggleBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? "◁" : "▷"}
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} className={styles.navItem}>
              <span className={styles.navIcon}>{item.icon}</span>
              {sidebarOpen && <span className={styles.navLabel}>{item.label}</span>}
            </a>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          {sidebarOpen && (
            <div className={styles.creditBadge}>
              <span>🪙</span>
              <span>{user?.credits || 0} Kredi</span>
            </div>
          )}
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>{user?.name?.charAt(0) || "U"}</div>
            {sidebarOpen && (
              <div className={styles.userMeta}>
                <div className={styles.userName}>{user?.name}</div>
                <div className={styles.userPlan}>{user?.plan?.toUpperCase()}</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className={styles.mainContent}>
        <header className={styles.topBar}>
          <div className={styles.searchBar}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#999" strokeWidth="1.5"/><path d="M11 11l3.5 3.5" stroke="#999" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <input type="text" placeholder="Proje ara..." className={styles.searchInput} />
          </div>
          <div className={styles.topBarRight}>
            <button className={styles.notifBtn}>🔔</button>
            <button className={styles.logoutBtn} onClick={logout}>Çıkış</button>
          </div>
        </header>
        <div className={styles.pageContent}>{children}</div>
      </main>
    </div>
  );
}
