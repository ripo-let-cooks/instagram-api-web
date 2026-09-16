# 📸 InstaBridge - Web Integrasi Instagram API & Two-Way Synchronization

Proyek aplikasi web untuk tugas kuliah integrasi API sosial media (Instagram) dengan arsitektur RESTful API, database persisten SQLite, antarmuka murni HTML5 & Vanilla CSS berstandar modern (`/design-taste-frontend`), serta integrasi dua arah (Web <-> Instagram).

---

## 🌟 Fitur Utama

1. **Autentikasi Akun**:
   - Fitur Login & Logout akun Instagram.
   - Dual-mode: Dapat dihubungkan ke **Meta Graph API asli** menggunakan token developer, atau **Interactive Demo Mode** (satu klik langsung login sebagai akun pengembang tanpa kendala token kedaluwarsa saat presentasi).
2. **Posting Status / Feed**:
   - Unggah status/caption beserta media gambar/video.
   - **Live Media Upload Preview**: Pratinjau langsung gambar sebelum tombol posting ditekan.
   - Tersimpan secara persisten di database lokal SQLite dan otomatis ter-publish ke Instagram.
3. **Instagram Stories**:
   - Baris Story di bagian atas dengan ring gradien aktif khas Instagram.
   - Unggah story baru dan tonton story dengan *Story Viewer* berdurasi otomatis 5 detik.
4. **Integrasi Komentar Dua Arah (Two-Way Sync)**:
   - **Arah 1 (Web $\rightarrow$ Instagram)**: Ketik komentar di web $\rightarrow$ otomatis tersimpan di database dan dikirimkan ke endpoint komentar Instagram. Ditandai dengan badge `[🌐 Via Web]`.
   - **Arah 2 (Instagram $\rightarrow$ Web)**: Menerima webhook Meta asli (`/api/webhook`) atau dipicu melalui **Simulator Panel** $\rightarrow$ komentar langsung muncul di timeline web secara real-time tanpa me-refresh browser. Ditandai dengan badge `[📸 Via Instagram]`.
5. **Interactive Simulator Panel & Terminal Log Console**:
   - Panel mengambang di pojok kanan bawah khusus untuk demonstrasi di depan dosen:
     - ⚡ *Simulasi: @dosen_tester berkomentar dari aplikasi HP Instagram*.
     - ⚡ *Simulasi: Postingan baru masuk dari Instagram*.
     - ⚡ *Simulasi: Story baru masuk dari Instagram*.
   - **Terminal Log Console**: Menampilkan transmisi data HTTP REST API secara transparan untuk membuktikan arsitektur sistem kepada dosen penguji.
6. **Desain Sistem Modern (`/design-taste-frontend`)**:
   - Antarmuka responsif tanpa framework (HTML5 murni + Vanilla CSS).
   - Tipografi modern Google Fonts: *Plus Jakarta Sans* & *JetBrains Mono*.
   - Dark Mode default & Clean Light Mode toggle.
   - Micro-interactions taktil (efek klik fisik pada tombol, skeleton loading shimmer).

---

## 🛠️ Arsitektur & Teknologi

* **Frontend**: HTML5 Semantik, Vanilla CSS (CSS Variables, Grid/Flexbox), Vanilla JavaScript (Fetch API, Polling Engine).
* **Backend**: Node.js & Express.js (RESTful API, Multer upload handler, CORS).
* **Database**: SQLite lokal (`database.sqlite`) via `node:sqlite` bawaan Node.js (Zero C++ dependency, 100% portable).
* **Instagram Engine**: `src/services/instagramService.js` (Dual-Engine: Meta Graph API + Realistic Mock Simulator).

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Prasyarat
- Pastikan Node.js sudah terinstal di komputer Anda (Node.js v20+ atau v22+ disarankan).

### 2. Instalasi Dependensi
Buka terminal pada direktori proyek:
```bash
npm install
```

### 3. Konfigurasi Environment (Opsional)
Duplikasi file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
*Catatan: Jika Anda tidak mengisi token Meta, aplikasi secara otomatis dan aman beralih ke mode **Interactive Demo Simulator**.*

### 4. Menjalankan Server
```bash
npm start
```
Buka browser dan akses alamat:
👉 **`http://localhost:3000`**

### 5. Menjalankan Pengujian Otomatis (Testing)
Untuk memastikan seluruh modul database, service, dan REST API lulus pengujian:
```bash
npm test
```

---

## 📋 Panduan Demonstrasi Langkah-demi-Langkah di Depan Dosen

Berikut adalah skenario urutan demo yang direkomendasikan saat presentasi tugas kuliah:

| Langkah | Aksi Demo | Yang Terjadi & Yang Diperlihatkan ke Dosen |
|---|---|---|
| **1. Buka Web** | Akses `http://localhost:3000` | Tunjukkan tampilan modern dengan font *Plus Jakarta Sans*, lencana mode `[🟡 Interactive Demo Simulator]`, dan tombol toggle tema Dark/Light. |
| **2. Login Akun** | Klik *"Logout"* lalu klik *"Login"* $\rightarrow$ *"Masuk Akun Demo"* | Sesi login aktif sebagai `@arief_developer`, avatar dan username tampil di navbar atas. |
| **3. Buat Postingan** | Pilih file foto dari komputer $\rightarrow$ Ketik caption $\rightarrow$ Klik *"Posting"* | Tunjukkan **Live Image Preview** sebelum upload. Setelah klik posting, data tersimpan di database dan muncul di timeline dengan badge `[🌐 Via Web]`. |
| **4. Komentar Web $\rightarrow$ IG** | Ketik komentar di postingan pada web $\rightarrow$ Klik *"Kirim"* | Komentar langsung muncul dengan label `[🌐 dari Web]` dan log transmisi tercatat di terminal log. |
| **5. Komentar IG $\rightarrow$ Web** | Buka **Simulator Panel** di pojok kanan bawah $\rightarrow$ Klik *"Simulasi Komentar dari IG (@dosen_tester)"* | Dalam beberapa detik, komentar dari `@dosen_tester` dengan label `[📸 dari Instagram]` langsung muncul otomatis di web tanpa harus reload halaman browser (F5). |
| **6. Upload Story** | Klik lingkaran `+ Cerita Anda` $\rightarrow$ Upload foto story $\rightarrow$ Klik lingkaran story yang muncul | Story Viewer modal terbuka dengan indikator progress bar berdurasi 5 detik. |
| **7. Persistensi Data** | Matikan server (`Ctrl + C`) di terminal $\rightarrow$ Jalankan kembali `npm start` $\rightarrow$ Refresh browser | Tunjukkan kepada dosen bahwa semua postingan dan komentar sebelumnya tetap tersimpan utuh di file `database.sqlite`. |

---

## ⚖️ Analisis Kelebihan & Kekurangan Web (Pros & Cons)

Sebagai bahan evaluasi atau presentasi, berikut adalah kelebihan dan kekurangan dari arsitektur aplikasi web ini:

### ✅ Kelebihan (Plus)
1. **Terhubung ke Real Meta Graph API (Two-Way Sync)**: Bukan sekadar web replika statis, web ini benar-benar "berkomunikasi" dengan server raksasa Meta. Anda bisa mengunggah Story/Foto dari web ini dan melihatnya terbit di aplikasi Instagram asli Anda. Begitu juga sebaliknya.
2. **Arsitektur Super Ringan & Portable (Zero-Config)**: Tidak memerlukan instalasi database berat seperti MySQL/PostgreSQL atau XAMPP. Menggunakan SQLite bawaan Node.js yang tersimpan dalam satu file (`database.sqlite`). Sangat mudah dipindah-pindah antar laptop untuk presentasi.
3. **UI/UX Premium (Anti-Slop Design)**: Menghindari desain framework kaku seperti Bootstrap. Menggunakan murni Vanilla CSS modern dengan implementasi *Dark Mode*, tipografi eksklusif, efek transisi (*skeleton shimmer*), animasi mikro, dan UI yang bersih ala aplikasi *high-end*.
4. **Interactive Simulator Mode**: Fitur penyelamat presentasi! Jika di hari-H presentasi jaringan internet kampus mati atau Token Meta kedaluwarsa, web bisa langsung beralih ke Mode Simulator tanpa hambatan, seolah-olah API berjalan normal.
5. **Transparansi Log di Layar (Terminal Log Console)**: Menampilkan aliran data JSON (REST API) secara *real-time* di sudut layar. Sangat krusial untuk membuktikan kepada dosen bahwa integrasi API benar-benar terjadi, bukan sekadar manipulasi JavaScript biasa.

### ❌ Kekurangan (Minus)
1. **Dibatasi oleh Kebijakan Ketat Keamanan Meta**: Fitur "Hapus Postingan" dan "Tekan Tombol Like" hanya berfungsi secara lokal di web kita, dan tidak berefek ke Instagram asli. Ini **bukan kelemahan kode**, melainkan batasan keamanan mutlak dari Meta yang melarang aplikasi pihak ketiga menghapus konten atau memanipulasi tombol Like demi mencegah Bot/Spam.
2. **Sangat Bergantung pada Kestabilan *Tunneling***: Karena dijalankan dari komputer lokal (`localhost`), server Instagram tidak bisa mengirim data balik (Webhook) jika kita tidak menggunakan Terowongan Internet (seperti *localhost.run* atau *localtunnel*). Jika koneksi terowongan ini goyah, sinkronisasi dua arah akan tersendat.
3. **Kecepatan Proses Asinkron Meta**: Saat menekan tombol *Upload Story*, Instagram butuh waktu 3-7 detik untuk mengunduh gambar dari komputer kita sebelum mempublikasikannya. Hal ini membutuhkan sistem "Antre & Tunggu" (Delay Retry) di kode backend agar tidak ditolak oleh server Meta.
4. **Fitur Media Sosial Terbatas**: Web ini difokuskan penuh pada studi kasus inti integrasi API (Upload Gambar, Story, Fetch Feed, dan Komentar). Fitur tingkat lanjut seperti Reels, Filter Kamera AR, atau Direct Message (DM) tidak diimplementasikan karena keterbatasan izin (Permissions) Graph API untuk akun kelas Developer biasa.
