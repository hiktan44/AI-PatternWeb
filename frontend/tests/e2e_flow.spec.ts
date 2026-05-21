import { test, expect } from '@playwright/test';

test.describe('AI-PatternWeb Uçtan Uca Kalıp Üretim ve Export Akışı', () => {
  let email: string;
  let projectName: string;

  test.beforeAll(() => {
    // Benzersiz email ve proje isimleri üreterek test izolasyonu sağlıyoruz
    const timestamp = Date.now();
    email = `e2e_test_${timestamp}@example.com`;
    projectName = `E2E Kalıp Projesi ${timestamp}`;
  });

  test.afterAll(() => {
    const path = require('path');
    const fs = require('fs');
    const testFilePath = path.join(__dirname, 'test_image.png');
    if (fs.existsSync(testFilePath)) {
      try { fs.unlinkSync(testFilePath); } catch (e) {}
    }
  });

  test('Kayıt, Proje Oluşturma, Step 1-7 Akışı ve CAD/CAM Export', async ({ page }) => {
    // Turbopack ilk derleme gecikmelerini tolere etmek için timeout'u 90 saniyeye yükseltiyoruz
    test.setTimeout(90000);

    // 1. Giriş/Kayıt Sayfasına Git
    await page.goto('/login');

    await expect(page).toHaveTitle(/AI-PatternWeb/);

    // Kayıt Moduna Geç
    const registerBtn = page.locator('button', { hasText: 'Ücretsiz Kayıt Ol' });
    if (await registerBtn.isVisible()) {
      await registerBtn.click();
    }

    // Kayıt Formunu Doldur
    await page.locator('input[placeholder="Adınız Soyadınız"]').fill('E2E Test Robotu');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill('P@ssword123');
    
    // Kayıt Formunu Gönder
    await page.locator('button[type="submit"]').click();

    // Dashboard'a Yönlenmeyi Bekle
    await page.waitForURL('**/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Kredi Sayacını Doğrula (Yeni üyeye 50 kredi veriliyor)
    await expect(page.locator('text=Kalan Kredi')).toBeVisible();

    // 2. Yeni Proje Oluşturma
    await page.goto('/projects');
    await page.click('button:has-text("+ Yeni Proje")');

    // Modal Formunu Doldur
    await page.locator('input[placeholder="örn: Yaz Koleksiyonu Gömlek"]').fill(projectName);
    
    // Ürün Kategorisi seç (Tişört)
    await page.click('text=Tişört');

    await page.locator('input[placeholder="örn: SS26"]').fill('SS26');
    await page.locator('input[placeholder="örn: AVVA"]').fill('AI-PatternWeb');

    // Projeyi Kaydet
    await page.locator('div[class*="modal"] button').filter({ hasText: /^Oluştur$/ }).click();

    // Modal overlay'inin kapanmasını bekle
    await page.locator('div[class*="modalOverlay"]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500); // Ekstra animasyon toleransı

    // Projenin Listede Göründüğünü Doğrula ve Tıkla
    const projectCard = page.locator(`text=${projectName}`).first();
    await expect(projectCard).toBeVisible();
    await projectCard.click({ force: true });


    // Proje Detay Sayfasına ve Adım 0'a Geçiş
    await page.waitForURL(/\/projects\/.+/);
    await expect(page.locator('text=Görsel Yükle')).toBeVisible({ timeout: 20000 });

    // 3. Adım 0 -> Adım 1: Görsel Yükleme Adımı (Gerçek Dosya Yükleme Simülasyonu)
    const path = require('path');
    const fs = require('fs');
    const testFilePath = path.join(__dirname, 'test_image.png');
    if (!fs.existsSync(testFilePath)) {
      fs.writeFileSync(testFilePath, 'fake image binary data');
    }

    // Dosyayı input'a set et (Gizli file input'a setInputFiles uygulanabilir)
    await page.setInputFiles('input[type="file"]', testFilePath);

    // Dosya yüklendikten sonra React otomatik olarak Step 1 (AI Analiz) adımına geçiş yapar.
    // Dolayısıyla "AI Analiz" başlığının görünmesini bekliyoruz.
    await expect(page.locator('text=AI Analiz')).toBeVisible({ timeout: 15000 });

    // 4. Adım 1 -> Adım 2: AI Analiz ve Analiz Sonuçlarını Bekleme
    const runAnalysisBtn = page.locator('button:has-text("Analizi Başlat")');
    await expect(runAnalysisBtn).toBeVisible({ timeout: 5000 });
    await runAnalysisBtn.click();

    // Analiz tamamlandığında "Kalıp Oluştur →" butonu aktif/görünür hale gelir.
    const toPatternBtn = page.locator('button:has-text("Kalıp Oluştur →")');
    await expect(toPatternBtn).toBeVisible({ timeout: 25000 });
    await toPatternBtn.click();

    // 5. Adım 2 -> Adım 3: Kalıp Oluşturma Adımı
    await expect(page.locator('text=Kalıp Oluştur')).toBeVisible();
    
    // Önce 'Kalıbı Üret (Canlı Takip)' butonuna tıklatarak asenkron üretimi tetikliyoruz
    const produceBtn = page.locator('button:has-text("Kalıbı Üret (Canlı Takip)")');
    await expect(produceBtn).toBeVisible({ timeout: 5000 });
    await produceBtn.click();

    // Üretimin tamamlanıp Kalıp Editör yönlendirme butonunun görünmesini bekliyoruz
    const toEditBtn = page.locator('button:has-text("Kalıp Editör →")');
    await expect(toEditBtn).toBeVisible({ timeout: 30000 });
    await toEditBtn.click();

    // 6. Adım 3 -> Adım 4: Kalıp Editörü Adımı
    await expect(page.locator('text=Kalıp Editör').first()).toBeVisible();
    const toSeamBtn = page.locator('button:has-text("Dikiş Payı →")');
    await expect(toSeamBtn).toBeVisible();
    await toSeamBtn.click();

    // 7. Adım 4 -> Adım 5: Dikiş Payı Adımı
    await expect(page.locator('text=Dikiş Payı').first()).toBeVisible();
    const toGradeBtn = page.locator('button:has-text("Serileme →")');
    await expect(toGradeBtn).toBeVisible();
    await toGradeBtn.click();

    // 8. Adım 5 -> Adım 6: Serileme Adımı
    await expect(page.locator('text=Serileme').first()).toBeVisible();
    const toMarkerBtn = page.locator('button:has-text("Seriyi Oluştur & Pastal →")');
    await expect(toMarkerBtn).toBeVisible();
    await toMarkerBtn.click();

    // 9. Adım 6 -> Adım 7: Pastal & Yerleşim Adımı
    await expect(page.locator('text=Pastal').first()).toBeVisible();
    const toQABtn = page.locator('button:has-text("QA & Export →")');
    await expect(toQABtn).toBeVisible();
    await toQABtn.click();

    // 10. Adım 7: QA & Export & CAD/CAM Çıktı İstasyonu
    await expect(page.locator('text=QA & Export').first()).toBeVisible();

    // QA Güvenlik Kilidi durumunu kontrol et
    // Eğer kalıp skoru düşükse bypass kilidi görünecektir. Görünürse bypass et.
    const bypassBtn = page.locator('button:has-text("🔓 Kilidi Bypass Et (Riskli)")');
    if (await bypassBtn.isVisible()) {
      await bypassBtn.click();
      // Bypass mesajını doğrula
      await expect(page.locator('text=Bypass Modu Etkin')).toBeVisible();
    }

    // DXF Export Butonunun Aktif Olduğunu ve İndirilebilirliğini Test Et
    const dxfBtn = page.locator('button:has-text("İndir 📥")').first();
    await expect(dxfBtn).toBeEnabled();

    // PDF Export Butonunun Aktif Olduğunu ve İndirilebilirliğini Test Et
    const pdfBtn = page.locator('button:has-text("İndir 📥")').nth(1);
    await expect(pdfBtn).toBeEnabled();
  });
});
