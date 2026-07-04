# Rancangan Aplikasi Kasir (POS) — Restoran & Kafe

## 1. Ringkasan

Aplikasi kasir untuk restoran/kafe, berjalan di **web** (untuk kasir di meja/counter dan dashboard owner) dan **mobile** (untuk staf keliling ambil pesanan/waiter, dan dashboard owner saat mobile). Fokus desain: UI modern, minim klik, dan mudah dipelajari staf baru dalam hitungan menit.

## 2. Pengguna & Peran

| Peran | Kebutuhan Utama |
|---|---|
| Kasir | Input pesanan cepat, proses pembayaran, cetak/kirim struk |
| Waiter (mobile) | Ambil pesanan di meja, kirim ke dapur, lihat status |
| Dapur (Kitchen Display) | Lihat antrian pesanan masuk, tandai selesai |
| Owner/Manager | Lihat laporan penjualan, kelola menu & stok, kelola staf |

## 3. Alur Pengguna Utama (User Flow)

```
Buka meja/pesanan baru
   -> Pilih kategori menu -> Tambah item ke keranjang
   -> Atur catatan/varian (level pedas, tanpa es, dll)
   -> Kirim ke dapur (opsional, untuk dine-in)
   -> Kasir proses pembayaran (tunai/QRIS/kartu/e-wallet)
   -> Cetak/kirim struk digital
   -> Meja/pesanan ditutup, status kembali "tersedia"
```

Alur ini sengaja dibuat linear dan sedikit tahap supaya staf baru tidak butuh training lama — prinsip **"3 tap rule"**: aksi paling sering (tambah item, bayar, cetak struk) idealnya bisa dilakukan dalam maksimal 3 sentuhan.

## 4. Struktur Informasi (Information Architecture)

**Web App (kasir & admin):**
- Dashboard (ringkasan penjualan hari ini)
- Kasir / Order (layar utama, seperti mockup di atas)
- Manajemen Meja (denah meja, status: kosong/terisi/reserved)
- Menu & Kategori (CRUD item, harga, foto, stok)
- Laporan (penjualan, item terlaris, laba kotor, per shift)
- Manajemen Staf & Hak Akses
- Pengaturan (pajak, service charge, metode pembayaran, printer)

**Mobile App (waiter/owner):**
- Ambil pesanan per meja (versi ringkas dari layar kasir)
- Notifikasi status pesanan (siap disajikan)
- Dashboard ringkas (khusus owner: omzet hari ini, notifikasi stok habis)

## 5. Fitur

### MVP (wajib ada di rilis pertama)
- Manajemen menu (kategori, harga, foto, varian/topping)
- Order & keranjang dengan kalkulasi otomatis (subtotal, pajak, service charge)
- Split bill & merge/pindah meja
- Multi metode pembayaran (tunai, QRIS, kartu debit/kredit)
- Cetak struk (printer thermal) & struk digital (WhatsApp/email)
- Manajemen meja visual (denah restoran)
- Laporan penjualan harian/mingguan sederhana
- Login staf dengan PIN cepat (bukan password panjang, demi kecepatan shift)

### Fase 2 (setelah MVP stabil)
- Kitchen Display System (KDS) — pesanan otomatis muncul di layar dapur
- Manajemen stok/inventori otomatis berkurang saat terjual
- Program loyalitas & diskon member
- Integrasi ojek online (GoFood/GrabFood order masuk otomatis)
- Multi-cabang (laporan gabungan owner yang punya beberapa outlet)
- Mode offline (tetap bisa transaksi saat internet mati, sync otomatis saat online)

## 6. Prinsip UI/UX "Modern & Kekinian"

1. **Flat & bersih** — hindari gradient/shadow berlebihan, gunakan warna solid dan whitespace lega (tren desain POS 2025-2026 seperti Square, Toast, Moka).
2. **Card-based layout** — setiap item menu jadi kartu dengan foto besar, mudah dikenali secara visual tanpa perlu baca teks lama-lama.
3. **Warna semantik** — hijau untuk sukses/pembayaran selesai, merah untuk void/batal, kuning untuk pending — konsisten di seluruh app.
4. **Touch-friendly** — tombol minimal 44x44px, karena kebanyakan device kasir pakai layar sentuh/tablet.
5. **Feedback instan** — setiap aksi (tambah item, bayar) ada animasi/konfirmasi singkat, tidak butuh reload halaman.
6. **Dark mode** — berguna untuk kasir yang buka sampai malam, mengurangi silau.
7. **Aksesibilitas** — kontras warna cukup, ukuran font minimal 14px untuk teks penting seperti harga dan total.
8. **Konsistensi lintas platform** — komponen (tombol, kartu, ikon) yang sama persis di web dan mobile agar staf tidak bingung pindah device.

## 7. Rekomendasi Tech Stack

| Layer | Rekomendasi | Alasan |
|---|---|---|
| Frontend web | **Next.js (React) + Tailwind CSS** | Ekosistem besar, cepat untuk UI kompleks seperti dashboard & kasir |
| Mobile | **React Native (Expo)** atau **Flutter** | Satu codebase untuk iOS & Android; pilih React Native jika tim sudah kuat di React (share komponen/logic dengan web) |
| Backend | **Node.js (NestJS) atau Supabase/Firebase** | NestJS jika butuh kontrol penuh & skala besar; Supabase jika ingin cepat rilis MVP (auth, realtime, storage sudah tersedia) |
| Database | **PostgreSQL** | Relasional, cocok untuk data transaksi, laporan, dan relasi menu-order-pembayaran |
| Realtime (KDS, notifikasi) | **WebSocket (Socket.IO) atau Supabase Realtime** | Update status pesanan instan ke dapur/waiter |
| Pembayaran | **Midtrans / Xendit** | Payment gateway lokal Indonesia, dukung QRIS, e-wallet, kartu |
| Printer thermal | **ESC/POS via Bluetooth/USB (library: react-native-thermal-printer / node-thermal-printer)** | Standar printer struk di Indonesia |
| Hosting | **Vercel (frontend) + Railway/Supabase (backend & DB)** | Deploy cepat, cocok untuk tim kecil-menengah |
| Offline support | **IndexedDB (web) / SQLite (mobile) + sync queue** | Transaksi tetap jalan saat koneksi putus |

## 8. Skema Database (Garis Besar)

```
users (id, nama, role, pin_hash, outlet_id)
outlets (id, nama, alamat, pajak_persen)
tables (id, outlet_id, nama_meja, status, kapasitas)
categories (id, nama, urutan)
menu_items (id, category_id, nama, harga, foto_url, stok, is_available)
item_variants (id, menu_item_id, nama_varian, harga_tambahan)
orders (id, table_id, staff_id, status, dibuat_pada, ditutup_pada)
order_items (id, order_id, menu_item_id, qty, catatan, harga_saat_itu)
payments (id, order_id, metode, jumlah, status, referensi_gateway)
shifts (id, staff_id, mulai, selesai, total_penjualan)
```

## 9. Roadmap Pengembangan

| Fase | Durasi Estimasi | Output |
|---|---|---|
| 1. Desain UI/UX detail (wireframe -> hi-fi mockup) | 1-2 minggu | Prototype Figma-ready, semua layar utama |
| 2. Setup arsitektur & database | 1 minggu | Backend, auth, skema DB siap |
| 3. Bangun fitur MVP | 4-6 minggu | Order, pembayaran, menu, meja, laporan dasar |
| 4. Testing internal + pilot di 1 outlet | 2 minggu | Bug fix, penyesuaian UX dari feedback staf asli |
| 5. Rilis & fitur fase 2 | Berkelanjutan | KDS, stok, loyalitas, dst. |

## 10. Self-Order via QR Code Meja

Fitur tambahan: pelanggan scan QR di meja untuk lihat menu, isi keranjang sendiri, checkout, lalu pesanan otomatis masuk ke dapur dan tercatat di tagihan kasir.

### 10.1 Alur Pelanggan

```
Scan QR di meja (kode unik per meja, buka langsung di browser, tanpa install app)
   -> Lihat menu digital (foto, harga, stok real-time)
   -> Tambah ke keranjang (atur catatan & varian)
   -> Checkout pesanan (terhubung ke sesi meja aktif)
```

### 10.2 Alur Back-of-House

```
Pesanan dikirim dari HP pelanggan
   -> bercabang ke:
      a) Dapur -> muncul di Kitchen Display System -> siapkan & sajikan
      b) Kasir -> masuk ke tagihan meja yang sedang berjalan (running tab)
   -> Pelanggan bisa tambah pesanan lagi berkali-kali (checkout ulang, tetap 1 sesi meja)
   -> Pelanggan/staf tekan "Minta bill" -> kasir proses pembayaran -> cetak/kirim struk -> sesi meja ditutup
```

### 10.3 Prinsip Desain Alur Ini (Best Practice)

1. **QR unik per meja, encode `outlet_id` + `table_id`** — contoh URL: `https://order.namaresto.com/t/A4`. Sistem otomatis tahu ini pesanan Meja A4 tanpa pelanggan input manual.
2. **Tanpa install app, tanpa login** — dibuka sebagai web app (PWA) di browser HP. Nomor WhatsApp opsional saja, untuk notifikasi status pesanan.
3. **Keranjang adalah sesi per meja**, bukan per orang — kalau beberapa orang di meja yang sama scan QR yang sama, keranjang mereka idealnya real-time sync jadi satu, supaya dapur tidak menerima banyak tiket terpisah dari satu meja.
4. **Ada tahap konfirmasi sebelum masuk dapur** (opsional, bisa di-setting auto-approve) — mencegah pesanan iseng/salah kirim langsung diproses dapur.
5. **Tagihan berjalan (running tab)** — pelanggan bisa checkout berkali-kali dalam satu sesi meja, bayar satu kali di akhir saat "Minta bill" ditekan.
6. **Status pesanan real-time terlihat di HP pelanggan** — diterima -> diproses -> siap disajikan, supaya pelanggan tidak perlu bertanya ke staf.
7. **QR di-rotate berkala** — mencegah link lama dipakai orang dari luar restoran untuk pesan iseng ke meja yang sudah kosong.

### 10.4 Skema Data Tambahan

```
qr_sessions (id, table_id, session_token, dibuat_pada, kadaluarsa_pada, status)
```
`orders` yang sudah ada di bagian 8 dihubungkan ke `qr_sessions.id` (bukan langsung ke `table_id`) supaya satu sesi meja bisa menampung banyak checkout, dan sistem tahu kapan sesi itu "ditutup" (dibayar) vs "aktif".

### 10.5 Cara Generate QR Code (contoh kode)

Setiap meja butuh satu QR unik. Contoh pakai Python (library `qrcode`):

```python
import qrcode

# jalankan sekali per meja saat setup, atau otomatis saat meja baru ditambahkan
for table_id in ["A1", "A2", "A3", "A4"]:
    url = f"https://order.namaresto.com/t/{table_id}"
    img = qrcode.make(url, box_size=10, border=2)
    img.save(f"qr-meja-{table_id}.png")
```

QR ini lalu dicetak dan ditempel/berdiri di masing-masing meja (bisa pakai stand meja akrilik kecil). Untuk keamanan, `session_token` di URL sebaiknya di-generate ulang secara berkala (misal tiap hari) lewat cron job, supaya QR fisik yang sama tetap bisa dipakai tapi link di baliknya berubah.

## 11. Catatan Penting

- Untuk fitur QR order, uji dulu dengan 1-2 meja sebelum rollout ke semua meja — pastikan alur ke dapur dan kasir benar-benar sinkron sebelum dipakai penuh saat jam sibuk.
- Prioritaskan **kecepatan input pesanan** di atas fitur-fitur "canggih" — kasir yang sibuk saat jam ramai adalah ujian sebenarnya dari UX aplikasi ini.
- Uji coba langsung dengan kasir/staf asli sebelum rilis penuh; banyak asumsi desain baru ketahuan salah setelah dipakai orang yang bukan developer.
- Siapkan mode offline sejak awal arsitektur, bukan ditambahkan belakangan — koneksi internet di banyak lokasi restoran di Indonesia masih belum stabil.
