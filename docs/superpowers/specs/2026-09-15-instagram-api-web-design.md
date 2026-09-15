# Spesifikasi Desain: Web Integrasi Instagram API & Two-Way Sync (InstaBridge)

**Tanggal**: 2026-09-15  
**Tujuan**: Aplikasi web berbasis HTML/CSS murni terintegrasi backend Node.js + Express + SQLite untuk tugas kuliah integrasi API Instagram dengan autentikasi, feed/story, komentar dua arah (web <-> IG), dan simulator drawer untuk kemudahan demo.  
**Desain Standard**: Mengadopsi prinsip `/design-taste-frontend` (Anti-Slop, tipografi modern, micro-interactions taktil, palet kohesif, WCAG AA contrast).

---

## 1. Design Read & Frontend Dials (`/design-taste-frontend`)

* **Design Read**:  
  *Reading this as: Web Application & Social Media Management for academic evaluation, with a modern clean Instagram-inspired interface (editorial dark/light mode, high-contrast typography, tactile micro-interactions), leaning toward native HTML5 + Vanilla CSS tokens + expressive simulator drawer.*
* **Dials**:
  - `DESIGN_VARIANCE: 7` (Asimetri terukur, card visual dinamis, tidak monoton)
  - `MOTION_INTENSITY: 5` (Transisi halus pada hover, active button tactile click, fade/slide drawer)
  - `VISUAL_DENSITY: 4` (Feed bernapas dengan margin proporsional, layout tidak sempit)
* **Tipografi**:
  - Headings & Body: `Plus Jakarta Sans` (Google Fonts)
  - Log & Code Snippets: `JetBrains Mono`
* **Palet Warna**:
  - Neutral Base (Dark Theme): Background `#0b0f17`, Card Surface `#131b26`, Card Border `rgba(255, 255, 255, 0.08)`.
  - Neutral Base (Light Theme): Background `#f8fafc`, Card Surface `#ffffff`, Card Border `rgba(0, 0, 0, 0.08)`.
  - Accent Color: Instagram Signature Sunset Gradient (`linear-gradient(45deg, #f09433, #dc2743, #bc1888)`) dikunci khusus untuk Story Active Rings, Lencana Status, dan Tombol Aksi Utama.
  - Text: High contrast (Pure White `#ffffff` di dark mode / Ink Black `#0f172a` di light mode), lolos uji WCAG AA min 4.5:1.

---

## 2. Arsitektur Sistem

```
+-------------------------------------------------------------------+
|                        FRONTEND BROWSER                           |
|  (public/index.html + style.css + app.js - Native HTML5/CSS/JS)   |
|                                                                   |
|  [Navbar & Auth]  [Stories Bar]  [Create Post + Preview]  [Feed]  |
|                                                                   |
|                  [Floating Simulator Panel & Log]                 |
+---------------------------------+---------------------------------+
                                  | HTTP REST Calls & Polling
                                  v
+-------------------------------------------------------------------+
|                        BACKEND (server.js)                        |
|                     Node.js + Express REST API                    |
|                                                                   |
|  - Auth Controller (/api/auth)                                    |
|  - Post & Story Controller (/api/posts, /api/stories)             |
|  - Comments Controller (/api/posts/:id/comments)                  |
|  - Webhook & Simulator Controller (/api/webhook, /api/simulator)  |
|  - Upload Handler (Multer - penyimpanan lokal uploads/)          |
+-------------------+-------------------------------+---------------+
                    |                               |
                    v                               v
    +-------------------------------+   +---------------------------+
    |      DATABASE PERSISTEN       |   |    DUAL-ENGINE SERVICE    |
    |      (database.sqlite)        |   | (services/instagramService)
    |  - users, posts, stories,     |   +-------------+-------------+
    |    comments, activity_logs    |                 |
    +-------------------------------+      Mode Real  |  Mode Demo
                                            +---------+---------+
                                            v                   v
                                     [Meta Graph API]   [Mock Simulator]
                                      (Facebook Graph)    (Simulasi Cepat)
```

---

## 3. Skema Database SQLite (`database.sqlite`)

### Tabel `users`
- `id` TEXT PRIMARY KEY (ID profil akun IG)
- `username` TEXT NOT NULL (contoh `@arief_dev`)
- `full_name` TEXT
- `avatar_url` TEXT
- `access_token` TEXT
- `is_demo` INTEGER DEFAULT 1 (1 = demo account, 0 = real Meta token)
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP

### Tabel `posts`
- `id` TEXT PRIMARY KEY (ID post lokal / IG media id)
- `user_id` TEXT NOT NULL, FOREIGN KEY(`user_id`) REFERENCES `users`(`id`)
- `caption` TEXT
- `media_type` TEXT DEFAULT 'IMAGE' ('IMAGE', 'VIDEO', 'TEXT_STATUS')
- `media_url` TEXT NOT NULL
- `permalink` TEXT
- `like_count` INTEGER DEFAULT 0
- `source` TEXT DEFAULT 'WEB' ('WEB' atau 'INSTAGRAM')
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP

### Tabel `stories`
- `id` TEXT PRIMARY KEY
- `user_id` TEXT NOT NULL, FOREIGN KEY(`user_id`) REFERENCES `users`(`id`)
- `media_url` TEXT NOT NULL
- `caption` TEXT
- `expires_at` DATETIME
- `source` TEXT DEFAULT 'WEB' ('WEB' atau 'INSTAGRAM')
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP

### Tabel `comments`
- `id` TEXT PRIMARY KEY
- `post_id` TEXT NOT NULL, FOREIGN KEY(`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE
- `author_name` TEXT NOT NULL
- `author_avatar` TEXT
- `content` TEXT NOT NULL
- `source` TEXT DEFAULT 'WEB' ('WEB' atau 'INSTAGRAM')
- `synced_to_ig` INTEGER DEFAULT 1
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP

### Tabel `activity_logs`
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `event_type` TEXT NOT NULL ('AUTH', 'POST_CREATE', 'COMMENT_TWO_WAY', 'WEBHOOK_RECEIVE', 'SIMULATOR')
- `description` TEXT NOT NULL
- `payload_preview` TEXT
- `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP

---

## 4. Rincian API Endpoints

| Method | Endpoint | Fungsi | Payload / Query |
|---|---|---|---|
| `POST` | `/api/auth/login` | Login sesi akun (Mode Real / Demo) | `{ mode: 'demo' \| 'real', token?: string, username?: string }` |
| `POST` | `/api/auth/logout` | Logout sesi | None |
| `GET` | `/api/auth/me` | Cek status sesi akun saat ini | None |
| `GET` | `/api/posts` | Ambil semua feed postingan beserta komentar | None |
| `POST` | `/api/posts` | Buat status/post baru | `multipart/form-data`: `caption`, `media` (file), `target` |
| `POST` | `/api/posts/:id/like` | Toggle like pada postingan | None |
| `GET` | `/api/stories` | Ambil daftar story aktif | None |
| `POST` | `/api/stories` | Upload story baru | `multipart/form-data`: `media` (file), `caption` |
| `GET` | `/api/posts/:id/comments` | Ambil daftar komentar postingan | None |
| `POST` | `/api/posts/:id/comments` | [Sync Arah 1] Kirim komentar dari Web | `{ content: string }` |
| `GET` | `/api/webhook` | Verifikasi Meta webhook challenge | `hub.mode`, `hub.verify_token`, `hub.challenge` |
| `POST` | `/api/webhook` | [Sync Arah 2] Terima webhook event asli Meta | Format payload Meta Graph API Webhook |
| `POST` | `/api/simulator/trigger` | [Sync Arah 2 Demo] Trigger event dari sisi IG | `{ action: 'incoming_comment' \| 'incoming_post' \| 'incoming_story', postId?: string, text?: string, sender?: string }` |
| `GET` | `/api/logs` | Ambil riwayat aktivitas API untuk panel log | Limit 50 |

---

## 5. Alur Integrasi Komentar Dua Arah (Two-Way Sync)

1. **Arah 1: Dari Web ke Instagram**
   - Pengguna mengetik komentar di postingan pada antarmuka web.
   - Frontend mengirim `POST /api/posts/:id/comments`.
   - Backend memvalidasi teks (1-500 karakter), menyimpannya ke tabel `comments` dengan `source: 'WEB'`.
   - `instagramService.sendCommentToInstagram(postId, content)` dipanggil:
     - Jika token real ada: panggil endpoint Meta Graph API `POST https://graph.facebook.com/v21.0/{media-id}/comments`.
     - Jika mode demo: simulasikan delay jaringan 300ms dan catat `synced_to_ig = 1`.
   - Catat log ke tabel `activity_logs`.
   - Frontend menerima respon status 201 dan langsung menyisipkan komentar di feed dengan lencana `[🌐 Web]`.

2. **Arah 2: Dari Instagram ke Web**
   - **Jalur Asli (Meta Webhook)**: Saat komentar masuk di postingan IG, Meta mengirim HTTP POST ke `/api/webhook`. Backend mem-parse payload, menyimpan komentar ke tabel `comments` dengan `source: 'INSTAGRAM'`, dan mencatat log.
   - **Jalur Simulator (Demo ke Dosen)**: Pengguna mengklik tombol *"Simulasikan Komentar Masuk dari IG"* pada Simulator Panel. Request dikirim ke `/api/simulator/trigger`. Handler menjalankan logika parsing webhook yang persis sama, menyisipkan data ke database SQLite dengan `source: 'INSTAGRAM'`.
   - Melalui sinkronisasi berkala (polling interval), frontend langsung mendeteksi komentar baru dan merendernya di bawah postingan dengan badge visual `[📸 dari Instagram]` tanpa perlu refresh browser.

---

## 6. Antarmuka Pengguna & Interaktivitas (Frontend)

* **Komponen 1: Header Bar**
  - Brand identity: Logo IG gradien + Nama "InstaBridge".
  - Status koneksi: Pill badge dinamis (`🟢 Connected to Meta Graph API` atau `🟡 Interactive Demo Mode`).
  - Account pill: Avatar, username, dan tombol Logout / Login Modal.
  - Theme Switcher: Tombol toggle Dark/Light mode.
* **Komponen 2: Stories Rail**
  - Baris horizontal avatar berbentuk lingkaran dengan ring gradien aktif Instagram.
  - Slot pertama: Tombol `+ Story` untuk membuka dialog upload.
  - Saat lingkaran story diklik, Story Viewer Modal terbuka dengan progress bar berdurasi 5 detik.
* **Komponen 3: Form Buat Postingan Baru + Media Preview (Pilihan Fitur #5)**
  - Input teks caption dengan character counter.
  - Drag-and-drop / file selector untuk memilih foto/gambar.
  - **Live Image Preview**: Kotak preview interaktif dengan tombol hapus gambar sebelum di-posting.
  - Tombol submit *"Posting ke Feed & IG"* dengan efek tactile active press (`scale-[0.98]`).
* **Komponen 4: Feed & Comment List**
  - Card postingan bergaris tepi halus (subtle border) dengan badge penanda asal konten (`[🌐 Web]` vs `[📸 Instagram]`).
  - Tombol aksi Like (dengan animasi pop mikro), Komentar, dan Share.
  - Daftar komentar dengan pembeda jelas antara komentar asal web dan komentar asal IG.
  - Input box komentar langsung di bawah postingan dengan tombol kirim instan.
* **Komponen 5: Floating Simulator Drawer & API Log Console (Pilihan Fitur #1)**
  - Tombol mengambang di kanan bawah yang dapat di-expand/collapse.
  - Tombol aksi cepat pemicu simulasi IG:
    - ⚡ *"Simulasikan Komentar dari IG (@dosen_tester)"*
    - ⚡ *"Simulasikan Postingan Masuk dari IG"*
    - ⚡ *"Simulasikan Story Masuk dari IG"*
  - **Terminal Log Console**: Menampilkan streaming log HTTP REST API transparan (Timestamp, Method, Endpoint, Status Code, Payload JSON).

---

## 7. Penanganan Error & Keamanan

- **Graceful Fallback**: Jika request ke Meta Graph API gagal (misal kuota habis / token invalid), sistem tidak melempar error 500 fatal ke browser, melainkan mencatat peringatan di log dan memberikan fallback data demo.
- **Input Sanitization**: Semua caption dan komentar di-sanitize untuk mencegah XSS (Cross-Site Scripting).
- **File Upload Filter**: Hanya menerima file dengan ekstensi `.jpg`, `.jpeg`, `.png`, `.webp`, `.mp4` dengan batasan ukuran 5MB.
- **Database Safety**: Prepared statements via SQLite driver untuk mencegah SQL Injection.

---

## 8. Rencana Verifikasi Pengujian (Lecturer Demo Checklist)

1. **Jalankan Aplikasi**: Menjalankan `npm install` lalu `npm start`, buka `http://localhost:3000` di browser.
2. **Uji Autentikasi**:
   - Klik "Login Demo Account" $\rightarrow$ Sesi aktif sebagai `@arief_developer`.
3. **Uji Upload Postingan & Media Preview**:
   - Pilih gambar $\rightarrow$ Pastikan gambar langsung tampil di preview box.
   - Ketik caption $\rightarrow$ Klik "Posting" $\rightarrow$ Postingan muncul di feed web dengan badge `[🌐 Via Web]` dan data tersimpan di SQLite.
4. **Uji Komentar Arah 1 (Web ke IG)**:
   - Ketik komentar di bawah postingan $\rightarrow$ Klik kirim $\rightarrow$ Komentar tampil di web dengan label `[🌐 Web]` dan tercatat di Log Console.
5. **Uji Komentar Arah 2 (IG ke Web via Simulator)**:
   - Buka Simulator Drawer $\rightarrow$ Klik "Simulasi Komentar dari IG" $\rightarrow$ Komentar baru dengan username `@dosen_penguji` dan badge `[📸 Instagram]` langsung muncul di feed tanpa me-refresh halaman.
6. **Uji Upload Story**:
   - Klik "+ Story" $\rightarrow$ Unggah foto story $\rightarrow$ Lingkaran story baru muncul di Stories Bar $\rightarrow$ Klik untuk memutar story.
7. **Uji Persistensi Database**:
   - Tutup browser dan restart server backend $\rightarrow$ Buka kembali web $\rightarrow$ Semua postingan dan komentar sebelumnya tetap ada dan tersimpan utuh di `database.sqlite`.
