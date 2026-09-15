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
