# SIAKAD PONPES

Sistem Informasi Akademik & Keuangan Pondok Pesantren Terpadu dengan modul Penagihan (Billing), Pembayaran Multi-Saluran (Tripay & Transfer Bank Manual), serta Autentikasi Mandiri berbasis SQLite dan SMTP/Gmail.

---

## Fitur Utama

- **Billing & Invoicing**: Penerbitan invoice santri dengan kalkulasi otomatis subtotal, diskon, dan pajak.
- **Invoice Publik Tanpa Login**: Wali santri dapat meninjau dan melunasi tagihan langsung via tautan `/i/:token` atau WhatsApp.
- **Dual-Channel Payment**:
  - **Otomatis (Tripay Gateway)**: QRIS Dinamis, Virtual Account Bank (BSI, Mandiri, BRI, BNI, BCA, dll), E-Wallet, dan Minimarket.
  - **Manual**: Rekening Bank Syariah Indonesia (BSI), Mandiri, BRI resmi pesantren.
- **Penyimpanan Lokal SQLite**: Database mandiri dan ringan (`./data/siakad.db`), performa tinggi dengan WAL mode.
- **Email OTP Mandiri (SMTP/Gmail)**: Pengiriman kode OTP masuk melalui server SMTP atau Gmail App Password yang dapat dikonfigurasi langsung dari Pengaturan Admin.
- **Ekspor Dokumen PDF & CSV**: Cetak invoice format resmi A4 2x DPI dan ekspor laporan kas ke CSV.
- **Docker Ready**: Dukungan penuh untuk deployment dengan `docker-compose`.

---

## Menjalankan dengan Docker (Rekomendasi)

### 1. Prasyarat
Pastikan Docker dan Docker Compose telah terpasang di server Anda.

### 2. Jalankan Container
```bash
docker compose up -d --build
```

Aplikasi akan otomatis berjalan di port `3000` (atau port yang ditentukan pada file `.env`).
Data database SQLite akan tersimpan secara persisten pada volume `./data/siakad.db`.

---

## Menjalankan Secara Lokal (Development)

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Jalankan Server Pengembangan
```bash
npm run dev
```

Buka peramban di `http://localhost:3000`.

---

## Konfigurasi Lingkungan (.env)

| Variabel | Deskripsi | Default |
| :--- | :--- | :--- |
| `PORT` | Port server aplikasi | `3000` |
| `DATABASE_PATH` | Lokasi file database SQLite | `./data/siakad.db` |
| `APP_URL` | Domain publik aplikasi untuk Webhook | `http://localhost:3000` |
| `TRIPAY_MODE` | Mode Tripay (`sandbox` / `production`) | `sandbox` |
| `TRIPAY_MERCHANT_CODE` | Kode merchant Tripay | `T10469` |
| `TRIPAY_API_KEY` | API Key merchant Tripay | - |
| `TRIPAY_PRIVATE_KEY` | Private Key merchant Tripay | - |
| `SMTP_HOST` | Host server SMTP | `smtp.gmail.com` |
| `SMTP_PORT` | Port server SMTP | `465` |
| `SMTP_USER` | Email akun pengirim SMTP | - |
| `SMTP_PASS` | Password atau App Password Gmail | - |

---

## Akun Default Awal
Saat pertama kali dijalankan, sistem otomatis membuat akun admin default:
- **Email Admin**: `wahidalimudin672@gmail.com`
- **Metode Masuk**: Kode OTP (jika SMTP belum dikonfigurasi, kode OTP akan otomatis ditampilkan di konsol server).
