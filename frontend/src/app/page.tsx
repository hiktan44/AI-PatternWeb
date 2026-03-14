"use client";

import { useEffect } from "react";
import s from "./page.module.css";

const LOGOS = ["KOTON", "AVVA", "LCW", "MAVİ", "BOYNER", "KIĞILI", "HUMMEL", "SARAR"];

export default function LandingPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e, i) => {
          if (e.isIntersecting) {
            setTimeout(() => e.target.classList.add("visible"), i * 80);
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* NAV */}
      <nav className={s.nav}>
        <div className={s.logo}>
          <span className={s.logoDot} />
          AI-PatternWeb
        </div>
        <div className={s.navLinks}>
          <a href="#features">Özellikler</a>
          <a href="#how">Nasıl Çalışır</a>
          <a href="#pricing">Fiyatlar</a>
          <a href="#demo">Demo</a>
        </div>
        <a href="#pricing" className={s.navCta}>Ücretsiz Başla</a>
      </nav>

      {/* HERO */}
      <section className={s.hero}>
        <div className={`${s.heroBgBlob} ${s.blob1}`} />
        <div className={`${s.heroBgBlob} ${s.blob2}`} />
        <div className={s.heroLeft}>
          <div className={s.heroBadge}>
            <span className={s.badgeDot} />
            Yeni: Stripe Eşleşmeli Otomatik Marker
          </div>
          <h1 className={s.headline}>
            Fotoğraftan<br />
            <span className={s.hi}>üretime hazır</span><br />
            <span className={s.hb}>kalıba.</span>
          </h1>
          <p className={s.heroSub}>
            Görsel, eskiz veya ölçü tablosu yükleyin. Yapay zeka destekli, kural tabanlı sistemimiz sizi DXF export&apos;a kadar güvenle taşısın.
          </p>
          <div className={s.heroActions}>
            <a href="#pricing" className={s.btnPrimary}>
              14 Gün Ücretsiz Dene
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
            <a href="#demo" className={s.btnSecondary}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/><path d="M6.5 5.5l4 2.5-4 2.5V5.5z" fill="currentColor"/></svg>
              Demo İzle
            </a>
          </div>
          <div className={s.heroStats}>
            <div><div className={s.statNum}>94%</div><div className={s.statLabel}>Ölçü doğruluk oranı</div></div>
            <div><div className={s.statNum}>12x</div><div className={s.statLabel}>Manuel kalıba kıyasla hız</div></div>
            <div><div className={s.statNum}>%8</div><div className={s.statLabel}>Ortalama fire düşüşü</div></div>
          </div>
        </div>

        <div className={s.heroRight}>
          <div style={{ position: "relative" }}>
            <div className={s.heroCanvas}>
              <div className={s.canvasHeader}>
                <div className={`${s.winDot} ${s.w1}`} />
                <div className={`${s.winDot} ${s.w2}`} />
                <div className={`${s.winDot} ${s.w3}`} />
                <span style={{ marginLeft: 10, fontSize: 13, color: "#888" }}>gömlek_v3.dxf — AI-PatternWeb</span>
              </div>
              <div className={s.canvasToolbar}>
                <button className={`${s.toolBtn} ${s.toolBtnActive}`}>✦</button>
                <button className={s.toolBtn}>⊕</button>
                <button className={s.toolBtn}>⊖</button>
                <button className={s.toolBtn}>↩</button>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: "#888" }}>Erkek Basic Gömlek — M</span>
              </div>
              <div className={s.canvasBody}>
                <div className={s.canvasGrid} />
                <div className={s.aiScan} />
                <svg width="320" height="280" viewBox="0 0 320 280">
                  <g>
                    <path d="M80,40 L100,30 L140,26 L180,26 L220,30 L240,40 L240,46 L220,52 L210,220 L110,220 L100,52 L80,46 Z" fill="rgba(26,86,255,0.06)" stroke="#1a56ff" strokeWidth="1.5" strokeLinejoin="round"/>
                    <text x="160" y="130" textAnchor="middle" className={s.partLabel}>ÖN BEDEN</text>
                    <path d="M140,26 Q160,38 180,26" fill="none" stroke="#1a56ff" strokeWidth="1.2"/>
                    <line x1="130" y1="100" x2="145" y2="130" stroke="#ff4d2e" strokeWidth="1" strokeDasharray="3 2"/>
                    <line x1="145" y1="130" x2="135" y2="160" stroke="#ff4d2e" strokeWidth="1" strokeDasharray="3 2"/>
                    <path d="M74,38 L95,27 L140,22 L180,22 L225,27 L246,38 L246,48 L225,55 L215,226 L105,226 L95,55 L74,48 Z" fill="none" stroke="#ff4d2e" strokeWidth="0.8" strokeDasharray="5 3" opacity="0.5" className={s.seamLine}/>
                  </g>
                  <g>
                    <path d="M28,60 L72,56 L80,130 L36,138 Z" fill="rgba(0,200,150,0.08)" stroke="#00c896" strokeWidth="1.5" strokeLinejoin="round"/>
                    <text x="52" y="100" textAnchor="middle" className={s.partLabel} style={{ fontSize: 9 }}>KOL</text>
                    <path d="M22,58 L74,53 L83,133 L30,142 Z" fill="none" stroke="#00c896" strokeWidth="0.7" strokeDasharray="4 3" opacity="0.5" className={s.seamLine}/>
                  </g>
                  <g>
                    <path d="M248,40 L266,30 L280,26 L300,26 L318,30 L320,50 L300,58 L294,220 L260,220 L254,58 Z" fill="rgba(255,184,0,0.07)" stroke="#ffb800" strokeWidth="1.5" strokeLinejoin="round"/>
                    <text x="285" y="130" textAnchor="middle" className={s.partLabel} style={{ fontSize: 9 }}>ARKA</text>
                  </g>
                  <rect x="109" y="219" width="2" height="6" fill="#1a56ff" rx="1"/>
                  <rect x="209" y="219" width="2" height="6" fill="#1a56ff" rx="1"/>
                  <rect x="79" y="98" width="6" height="2" fill="#00c896" rx="1"/>
                  <line x1="160" y1="165" x2="160" y2="205" stroke="#888" strokeWidth="1"/>
                  <polygon points="160,162 157,168 163,168" fill="#888"/>
                  <polygon points="160,208 157,202 163,202" fill="#888"/>
                </svg>
                <div className={s.confidenceBadge}>✓ QA Passed</div>
              </div>
            </div>

            <div className={`${s.floatCard} ${s.fc1}`}>
              <div className={s.fcRow}>
                <div className={s.fcIcon} style={{ background: "#edfdf7" }}>📐</div>
                <div>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>Ölçü uyumu</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span className={`${s.fcVal} ${s.fcGreen}`}>94.2%</span>
                    <span style={{ fontSize: 11, color: "var(--accent3)" }}>↑</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${s.floatCard} ${s.fc2}`}>
              <div className={s.fcRow}>
                <div className={s.fcIcon} style={{ background: "#fff0ee" }}>🔥</div>
                <div>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>Pastal fire</div>
                  <span className={s.fcVal} style={{ color: "var(--accent1)" }}>%7.4</span>
                </div>
              </div>
            </div>

            <div className={`${s.floatCard} ${s.fc3}`}>
              <div className={s.fcRow}>
                <div className={s.fcIcon} style={{ background: "#eef2ff" }}>⚡</div>
                <div>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>İşlem süresi</div>
                  <span className={`${s.fcVal} ${s.fcBlue}`}>42 sn</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LOGOS */}
      <div className={s.logosSection}>
        <div className={s.logosLabel}>Güvenen markalar</div>
        <div className={s.logosTrack}>
          {[...LOGOS, ...LOGOS].map((l, i) => (
            <div key={i} className={s.logoItem}>{l}</div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section className={s.features} id="features">
        <div className="reveal">
          <div className={s.sectionLabel}>Özellikler</div>
          <h2 className={s.sectionTitle}>Üretim zincirinin her adımı için</h2>
          <p className={s.sectionSub}>Fotoğraftan export&apos;a kadar her aşamada doğrulama katmanlı, kural tabanlı mühendislik.</p>
        </div>
        <div className={`${s.featuresGrid} reveal`}>
          {[
            { icon: "📸", cls: s.fi1, title: "Görselden Kalıp Çıkarımı", desc: "Ürün fotoğrafı, eskiz veya teknik çizim yükleyin. AI otomatik kategori tespit ederek ön kalıp taslağını oluşturur. Düşük güven skorunda sistem size soru sorar." },
            { icon: "📏", cls: s.fi2, title: "Ölçü Kalibrasyon Motoru", desc: "Kütüphane + ölçü tablosu + kullanıcı onayı üçlüsüyle çalışır. Tolerans dışı her bölge işaretlenir. Sistem emin olmadığını asla gizlemez." },
            { icon: "⚡", cls: s.fi3, title: "Otomatik Serileme", desc: "Baz bedenden hedef beden setini saniyeler içinde türetin. TSE, EU ve ABD standartları dahili. Nokta bazlı grading özelleştirme desteği." },
            { icon: "🧵", cls: s.fi4, title: "Dikiş Payı Yönetimi", desc: "Segment bazlı dikiş payı tanımlaması. Notch, drill, grainline, fold mark ve annotation otomatik. Üretim kuralı kütüphanesi kaydedilebilir." },
            { icon: "📦", cls: s.fi5, title: "Minimum Fireli Pastal", desc: "Kumaş eni, nap yönü, desen eşleşmesi ve serim tipine göre optimum marker. Fire raporunu indirin, alternatif yerleşimleri karşılaştırın." },
            { icon: "✅", cls: s.fi6, title: "QA Validation ve Export", desc: "Export öncesi 40+ otomatik kontrol. Açık contour, eksik grainline veya isimsiz parça varsa export kilitlenir. DXF, PDF ve üretim raporu." },
          ].map((f, i) => (
            <div key={i} className={s.featureCard}>
              <div className={`${s.featureIcon} ${f.cls}`}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className={s.how} id="how">
        <div className="reveal">
          <div className={s.sectionLabel}>Süreç</div>
          <h2 className={s.sectionTitle}>4 adımda üretime hazır kalıp</h2>
          <p className={s.sectionSub}>Her adımda sistem ya sizi yönlendirir ya da onayınızı alır. Hata üretime gitmez.</p>
        </div>
        <div className={`${s.steps} reveal`} style={{ marginTop: 56 }}>
          {[
            { num: "01", cls: s.sa1, title: "Görsel veya Çizim Yükle", desc: "Fotoğraf, eskiz, teknik çizim veya DXF. Sistem kalite kontrolü yapar, ürün kategorisini tespit eder ve ön kalıp yapısını çıkarır." },
            { num: "02", cls: s.sa2, title: "Ölçü ve Onay", desc: "Belirsiz alanlar için yapılandırılmış sorular sorulur. Ölçü tablosu verilir, sistem parametrik oturtma yapar ve kalıbı kilitler." },
            { num: "03", cls: s.sa3, title: "Seri ve Pastal", desc: "Beden serisi otomatik oluşur. Kumaş eni ve serim tipi girilir, minimum fireli marker hesaplanır. Fire raporu hazır." },
            { num: "04", cls: s.sa4, title: "QA ve Export", desc: "40+ otomatik kontrol. Passed statüsünde DXF, PDF ve üretim raporu export edilir. Lectra, Gerber ve benzeri CAD sistemleriyle uyumlu." },
          ].map((step, i) => (
            <div key={i} className={s.step}>
              <span className={s.stepNum}>{step.num}</span>
              <div className={`${s.stepAccent} ${step.cls}`} />
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* VIDEO DEMO */}
      <section className={s.videoSection} id="demo">
        <div className="reveal" style={{ textAlign: "center", marginBottom: 40 }}>
          <div className={s.sectionLabel} style={{ justifyContent: "center", display: "flex" }}>Demo</div>
          <h2 className={s.sectionTitle} style={{ margin: "0 auto", textAlign: "center" }}>Görmek inanmaktır</h2>
        </div>
        <div className={`${s.videoWrap} reveal`}>
          <div className={s.videoOverlay}>
            <div className={s.videoPattern} />
            <div className={s.demoElements}>
              <div className={`${s.demoEl} ${s.de1}`}>
                <div className={s.demoText}>Kalıp parçası</div>
                <div className={s.demoVal}>Ön Beden</div>
                <div className={s.demoText} style={{ color: "var(--accent3)", marginTop: 4 }}>✓ Doğrulandı</div>
              </div>
              <div className={`${s.demoEl} ${s.de2}`}>
                <div className={s.demoText}>Confidence</div>
                <div className={s.demoVal}>96.4%</div>
                <div className={s.demoText} style={{ color: "var(--accent4)", marginTop: 4 }}>▲ Yüksek</div>
              </div>
              <div className={`${s.demoEl} ${s.de3}`}>
                <div className={s.demoText}>Süre</div>
                <div className={s.demoVal}>38 sn</div>
                <div className={s.demoText} style={{ color: "var(--accent3)", marginTop: 4 }}>Analiz tamam</div>
              </div>
            </div>
            <div className={s.playBtn}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M8 5l11 7-11 7V5z" fill="#0d0d0d"/></svg>
            </div>
            <div className={s.videoTitle}>Fotoğraftan DXF&apos;e: Canlı Demo</div>
            <div className={s.videoSub}>Basic gömlek — 45 saniye — Gerber uyumlu çıktı</div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className={s.pricing} id="pricing">
        <div className="reveal" style={{ textAlign: "center" }}>
          <div className={s.sectionLabel} style={{ display: "flex", justifyContent: "center" }}>Fiyatlar</div>
          <h2 className={s.sectionTitle} style={{ margin: "0 auto", textAlign: "center" }}>Her ölçeğe uygun plan</h2>
          <p className={s.sectionSub} style={{ margin: "16px auto", textAlign: "center" }}>14 gün ücretsiz deneyin. Kredi kartı gerekmez.</p>
        </div>
        <div className={`${s.pricingGrid} reveal`}>
          <div className={s.priceCard}>
            <div className={s.planName}>Starter</div>
            <div className={s.priceAmount}>Ücretsiz</div>
            <div className={s.pricePeriod}>Sonsuza kadar</div>
            <div className={s.priceDesc}>Öğrenciler ve freelancer&apos;lar için temel özellikler.</div>
            <ul className={s.priceFeatures}>
              {["3 proje/ay", "Temel kategoriler", "Watermark'lı PDF export", "Basic serileme"].map((f, i) => (
                <li key={i}><div className={`${s.pfCheck} ${s.pfcGreen}`}>✓</div>{f}</li>
              ))}
            </ul>
            <a href="#" className={s.btnPlan}>Başla</a>
          </div>

          <div className={s.priceCard}>
            <div className={s.planName}>Professional</div>
            <div className={s.priceAmount}>₺1.490</div>
            <div className={s.pricePeriod}>/ay · yıllıkta %20 indirim</div>
            <div className={s.priceDesc}>Atölyeler, KOBİ markalar ve freelance modelistler için.</div>
            <ul className={s.priceFeatures}>
              {["30 proje/ay", "Tüm kategoriler", "DXF export (watermark'sız)", "Gelişmiş serileme", "Marker optimizasyonu", "Email destek (48 saat)"].map((f, i) => (
                <li key={i}><div className={`${s.pfCheck} ${s.pfcGreen}`}>✓</div>{f}</li>
              ))}
            </ul>
            <a href="#" className={s.btnPlan}>14 Gün Dene</a>
          </div>

          <div className={`${s.priceCard} ${s.priceCardFeatured}`}>
            <div className={s.featuredBadge}>En Popüler</div>
            <div className={s.planName}>Studio</div>
            <div className={s.priceAmount}>₺4.290</div>
            <div className={s.pricePeriod}>/ay · yıllıkta %20 indirim</div>
            <div className={s.priceDesc}>Üretim grupları, kalıp ofisleri ve ekip çalışması için.</div>
            <ul className={s.priceFeatures}>
              {["Sınırsız proje", "Ekip üyeleri (5 kişi)", "Stripe matching marker", "Tech pack modülü", "Review workflow", "Chat destek (24 saat)"].map((f, i) => (
                <li key={i}><div className={`${s.pfCheck} ${s.pfcBlue}`}>✓</div>{f}</li>
              ))}
            </ul>
            <a href="#" className={`${s.btnPlan} ${s.btnPlanAccent}`}>14 Gün Dene</a>
          </div>

          <div className={s.priceCard}>
            <div className={s.planName}>Enterprise</div>
            <div className={s.priceAmount}>Özel</div>
            <div className={s.pricePeriod}>Teklif alın</div>
            <div className={s.priceDesc}>Fason firmalar, çok markalı gruplar ve PLM entegrasyonu için.</div>
            <ul className={s.priceFeatures}>
              {["Sınırsız ekip", "SSO + özel domain", "API erişimi", "PLM/ERP entegrasyon", "Dedicated CSM", "4 saat SLA"].map((f, i) => (
                <li key={i}><div className={`${s.pfCheck} ${s.pfcGreen}`}>✓</div>{f}</li>
              ))}
            </ul>
            <a href="#" className={s.btnPlan}>İletişime Geç</a>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className={s.testimonials}>
        <div className="reveal" style={{ textAlign: "center" }}>
          <div className={s.sectionLabel} style={{ display: "flex", justifyContent: "center" }}>Kullanıcı Yorumları</div>
          <h2 className={s.sectionTitle} style={{ margin: "0 auto", textAlign: "center" }}>Üreticiler ne diyor?</h2>
        </div>
        <div className={`${s.testiGrid} reveal`}>
          {[
            { stars: "★★★★★", text: '"Eskiden bir modelistin 3-4 saatte hazırladığı kalıp taslağını AI-PatternWeb 40 saniyede çıkarıyor. Ölçü doğruluğu konusunda şüphecidim ama QA modülü gerçekten güven veriyor."', name: "Ayşe K.", role: "Kalıp Ofisi Müdürü, İstanbul", cls: s.ta1, initials: "AK" },
            { stars: "★★★★★", text: '"Fason işimizde beden serileme en çok zaman alan süreçti. Artık base bedenden 7 bedene saniyeler içinde geçiyoruz. Pastal fire oranımız %12\'den %7\'ye düştü."', name: "Mehmet T.", role: "Üretim Direktörü, Bursa", cls: s.ta2, initials: "MT" },
            { stars: "★★★★★", text: '"DXF export\'ların Lectra\'da sorunsuz açılması kritikti. Validation modülü sayesinde geçersiz dosya göndermiyoruz. Numune tekrar sayımız da azaldı."', name: "Selin Y.", role: "Teknik Tasarım Uzmanı, Ankara", cls: s.ta3, initials: "SY" },
          ].map((t, i) => (
            <div key={i} className={s.testiCard}>
              <div className={s.testiStars}>{t.stars}</div>
              <p className={s.testiText}>{t.text}</p>
              <div className={s.testiAuthor}>
                <div className={`${s.testiAvatar} ${t.cls}`}>{t.initials}</div>
                <div>
                  <div className={s.testiName}>{t.name}</div>
                  <div className={s.testiRole}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={s.ctaSection}>
        <div className={s.ctaBlob1} />
        <div className={s.ctaBlob2} />
        <div className={s.ctaContent}>
          <div className={s.ctaBadge}>
            <span style={{ color: "var(--accent3)" }}>●</span>
            14 gün ücretsiz · Kredi kartı yok
          </div>
          <h2 className={s.ctaTitle}>Üretim güvenli kalıba<br />bugün geçin.</h2>
          <p className={s.ctaSub}>Binlerce konfeksiyoncu ve modelistle birlikte — fotoğraftan DXF&apos;e, dakikalar içinde.</p>
          <div className={s.ctaActions}>
            <a href="#pricing" className={s.btnWhite}>
              Ücretsiz Başla
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
            <a href="#demo" className={s.btnGhost}>Demo İzle</a>
          </div>
          <div className={s.ctaNote}>Türkiye&apos;de barındırılır · KVKK uyumlu · TSE standartları destekli</div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={s.footer}>
        <div className={s.footerGrid}>
          <div>
            <div className={s.logo} style={{ marginBottom: 16 }}>
              <span className={s.logoDot} />
              AI-PatternWeb
            </div>
            <p className={s.footerDesc}>Fotoğraftan üretime hazır kalıba. Yapay zeka destekli, kural tabanlı, üretim güvenli pattern engineering platformu.</p>
          </div>
          <div className={s.footerCol}>
            <h4>Ürün</h4>
            <ul className={s.footerLinks}>
              {["Özellikler", "Fiyatlar", "Güvenlik", "Yol Haritası", "API"].map((l, i) => (
                <li key={i}><a href="#">{l}</a></li>
              ))}
            </ul>
          </div>
          <div className={s.footerCol}>
            <h4>Şirket</h4>
            <ul className={s.footerLinks}>
              {["Hakkımızda", "Blog", "Kariyer", "İletişim", "Basın"].map((l, i) => (
                <li key={i}><a href="#">{l}</a></li>
              ))}
            </ul>
          </div>
          <div className={s.footerCol}>
            <h4>Destek</h4>
            <ul className={s.footerLinks}>
              {["Dokümantasyon", "Eğitim Videoları", "Topluluk Forum", "KVKK", "Kullanım Şartları"].map((l, i) => (
                <li key={i}><a href="#">{l}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <div className={s.footerBottom}>
          <span>© 2026 AI-PatternWeb. Tüm hakları saklıdır.</span>
          <div className={s.footerTags}>
            <span className={s.tag}>KVKK Uyumlu</span>
            <span className={s.tag}>TSE Standartları</span>
            <span className={s.tag}>Türkiye&apos;de Barındırılır</span>
          </div>
        </div>
      </footer>
    </>
  );
}
