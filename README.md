# Yol Arkadaşım

## Yerelde çalıştırma

1. Bilgisayarında Node.js 20 veya üzeri kurulu olmalı.
2. `start.bat` dosyasına çift tıkla.
3. Uygulama tarayıcıda `http://127.0.0.1:4173` adresinde otomatik açılır. Hesap işlemleri için sayfayı dosya olarak (`index.html`) açma.
4. Sunucuyu kapatmak için açılan konsol penceresinde `Ctrl+C` kullan.

Uygulama HTML/CSS/JavaScript arayüzü ve Node.js yerel backend'i kullanır; dışarıdan paket veya veritabanı kurulumuna ihtiyaç duymaz.

## Bu sürümde

- Aydınlık, karanlık ve sistem temasına ek olarak krem, okyanus, lavanta ve orman renk paletleri
- Dil tercihi alanı (şu anda Türkçe arayüz; İngilizce çeviri henüz tamamlanmadı)
- Yerel hesap oluşturma ve giriş (kullanıcı adı: 3-24 İngilizce harf/sayı/alt çizgi; parola: en az 10 karakter)
- Yerel puan tablosu, dersler, haber/duyuru alanı
- Gizlilik/yasal bilgi taslağı, indirilebilir özgün çalışma verisi
- Engellenen kullanıcı listesi ve destek bildirimi
- Paylaşım ve mağaza değerlendirme alanları
- Mikrofon izni ve düello ses kontrolleri için arayüz

## Yerel veri deposu ve sınırlar

İlk çalıştırmada backend `data/app.json` dosyasını oluşturur. Hesap adı, parola özeti, tercihler, puanlar, engelleme listesi ve destek mesajları bu bilgisayarda saklanır. Parolalar scrypt ile tuzlanmış özet olarak tutulur; düz metin parola dosyaya yazılmaz. Oturumlar bellek içinde tutulur ve sunucu yeniden başlayınca kullanıcı tekrar giriş yapar.

Bu backend sadece `127.0.0.1` adresinde dinleyen öğrenme/prototip altyapısıdır. Çevrimiçi mağaza sürümü, uzaktaki kullanıcılar, bulut veritabanı, e-posta doğrulama/parola kurtarma, moderasyon ve veri yedekleme sağlamaz. Gerçek düello eşleşmesi ve karşılıklı ses aktarımı henüz yoktur; mikrofon izni verilse bile ses başka bir kullanıcıya gönderilmez. Mağaza değerlendirme bağlantısı da yayınlanınca eklenecektir.

Bu örnek kişisel hesabını sohbet içinde paylaşmanı istemez. Hesabını sadece kendi bilgisayarında `Hesap oluştur` ekranından kur. `data/app.json` dosyasını herkese açık depoya ya da başka biriyle paylaşma.

## İçerik kaynakları ve doğruluk

Konu başlıkları, kullanıcının gönderdiği Temmuz 2026 baskısının içindekiler fotoğrafından uygulamaya aktarıldı. Fotoğrafta görünen trafik ve çevre üniteleri, araç tekniği başlıkları ve ilk yardım üniteleri esas alındı; tüm kitap metni/alt başlıkları henüz eklenmedi. `sources/` klasöründe trafik levhaları PDF'si ve içindekiler fotoğrafı referans olarak durur. Önceden klasöre eklenmiş `surucuegitimkitabi.pdf` dosyasının dosya adı aynı olsa da eski baskı olduğu not edilmelidir; 2026 baskısının tam PDF'si klasörde bulunmuyor. Mevzuat ve ilk yardım uygulamalarında güncel yetkili kaynaklar ayrıca kontrol edilmelidir.

Nisan 2026 çevrimiçi test sayfasındaki sorular ufak değişikliklerle kopyalanmayacaktır. Bu sürümdeki beş soru bağımsız olarak yazılmış örnek alıştırmalardır; resmî MEB sorusu veya sınav tahmini değildir.
