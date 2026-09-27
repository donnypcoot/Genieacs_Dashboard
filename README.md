# GENIACS - FTTH Network Operations & Customer Management Platform

Panduan instalasi dan deployment aplikasi **GENIACS** pada mesin server **Ubuntu Linux** (Ubuntu 20.04 LTS / 22.04 LTS / 24.04 LTS).

---

## Daftar Isi
1. [Prasyarat Sistem](#1-prasyarat-sistem)
2. [Instalasi Dependensi Server](#2-instalasi-dependensi-server)
3. [Clone & Setup Repositori](#3-clone--setup-repositori)
4. [Konfigurasi Environment (.env)](#4-konfigurasi-environment-env)
5. [Build Aplikasi](#5-build-aplikasi)
6. [Menjalankan Aplikasi dengan PM2 (Production Process Manager)](#6-menjalankan-aplikasi-dengan-pm2-production-process-manager)
7. [Konfigurasi Nginx Reverse Proxy & Port](#7-konfigurasi-nginx-reverse-proxy--port)
8. [Setup SSL HTTPS Gratis dengan Let's Encrypt Certbot](#8-setup-ssl-https-gratis-dengan-lets-encrypt-certbot)
9. [Konfigurasi Firewall (UFW)](#9-konfigurasi-firewall-ufw)
10. [Pemeliharaan & Update Aplikasi](#10-pemeliharaan--update-aplikasi)

---

## 1. Prasyarat Sistem

- **OS**: Ubuntu 20.04 / 22.04 / 24.04 LTS (64-bit)
- **RAM**: Minimal 1 GB (Direkomendasikan 2 GB atau lebih)
- **CPU**: Minimal 1 Core (Direkomendasikan 2 Core)
- **Akses**: User dengan hak `sudo` atau `root`
- **Domain**: Nama domain (contoh: `geniacs.perusahaan.net`) yang sudah diarahkan (A record) ke IP Public server Ubuntu Anda.

---

## 2. Instalasi Dependensi Server

Perbarui repositori sistem dan pasang paket esensial, Node.js (v20+ LTS), Git, Nginx, dan PM2:

```bash
# Update paket Ubuntu
sudo apt update && sudo apt upgrade -y

# Pasang curl, git, build-essential, dan nginx
sudo apt install -y curl git build-essential nginx ufw

# Pasang Node.js LTS (v20.x atau v22.x) melalui NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi versi Node.js dan NPM
node -v   # Minimal v20.x.x
npm -v    # Minimal v10.x.x

# Pasang PM2 secara global untuk process manager di latar belakang
sudo npm install -g pm2
```

---

## 3. Clone & Setup Repositori

Letakkan aplikasi pada direktori standar `/var/www/geniacs`:

```bash
# Buat direktori aplikasi dan beri izin ke user Anda (ganti $USER dengan username Anda jika non-root)
sudo mkdir -p /var/www/geniacs
sudo chown -R $USER:$USER /var/www/geniacs

# Masuk ke direktori
cd /var/www/geniacs

# Clone repositori proyek Anda (atau salin file proyek ke direktori ini)
git clone <URL_REPOSITORY_ANDA> .

# Pasang seluruh dependensi NPM
npm install
```

---

## 4. Konfigurasi Environment (.env)

Salin berkas template environment:

```bash
cp .env.example .env
```

Buka dan sesuaikan nilainya:
```bash
nano .env
```

Isi konfigurasi berikut:
```env
# URL tempat aplikasi diakses publik (Ganti dengan domain atau IP Server Anda)
APP_URL="https://geniacs.perusahaan.net"

# Port server internal (default 3000)
PORT=3000

# Opsional: Jika menggunakan Gemini AI
GEMINI_API_KEY="AIzaSy..."
```
Simpan dengan menekan `Ctrl + O`, lalu `Enter`, kemudian keluar dengan `Ctrl + X`.

---

## 5. Build Aplikasi

Jalankan proses kompilasi TypeScript dan bundler Vite:

```bash
npm run build
```
Hasil kompilasi file static akan berada pada folder `dist/`.

---

## 6. Menjalankan Aplikasi dengan PM2 (Production Process Manager)

Gunakan **PM2** agar aplikasi tetap berjalan terus menerus di latar belakang (*background service*), restart otomatis saat crash, dan booting otomatis saat server restart.

### Opsi A: Menjalankan Server Express (Full-Stack / Preview Server)
```bash
# Jalankan menggunakan PM2
pm2 start "npm run preview -- --port 3000 --host 0.0.0.0" --name "geniacs-app"

# Simpan konfigurasi PM2
pm2 save

# Daftarkan PM2 agar otomatis hidup saat server reboot
pm2 startup systemd
# (Jalankan perintah sudo env PATH=... yang dimunculkan oleh terminal jika ada)
```

Perintah monitoring PM2 yang berguna:
```bash
pm2 status               # Melihat status aplikasi
pm2 logs geniacs-app     # Melihat log aplikasi secara live
pm2 restart geniacs-app  # Me-restart aplikasi
pm2 stop geniacs-app     # Menghentikan aplikasi
```

---

## 7. Konfigurasi Nginx Reverse Proxy & Port

Nginx berfungsi sebagai web server garis depan yang menerima traffic HTTP/HTTPS pada port 80/443 lalu meneruskannya ke port internal aplikasi (port 3000).

Buat file konfigurasi Nginx baru:
```bash
sudo nano /etc/nginx/sites-available/geniacs
```

Salin konfigurasi berikut (ganti `geniacs.perusahaan.net` dengan domain atau IP Public server Anda):

```nginx
server {
    listen 80;
    server_name geniacs.perusahaan.net; # Atau gunakan IP server jika belum ada domain

    # Opsi A: Reverse Proxy ke PM2 (Port 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Optimasi kompresi gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Log file
    access_log /var/log/nginx/geniacs_access.log;
    error_log /var/log/nginx/geniacs_error.log;
}
```

Aktifkan konfigurasi dan restart Nginx:
```bash
# Buat symlink ke sites-enabled
sudo ln -s /etc/nginx/sites-available/geniacs /etc/nginx/sites-enabled/

# Hapus default site jika perlu
sudo rm -f /etc/nginx/sites-enabled/default

# Tes konfigurasi Nginx
sudo nginx -t

# Muat ulang Nginx
sudo systemctl reload nginx
sudo systemctl enable nginx
```

---

## 8. Setup SSL HTTPS Gratis dengan Let's Encrypt Certbot

Sangat direkomendasikan mengaktifkan HTTPS agar enkripsi data pelanggan dan komunikasi jaringan aman:

```bash
# Pasang Certbot dan plugin Nginx
sudo apt install -y certbot python3-certbot-nginx

# Request dan install sertifikat SSL otomatis
sudo certbot --nginx -d geniacs.perusahaan.net

# Uji perpanjangan otomatis sertifikat (auto-renewal)
sudo certbot renew --dry-run
```

Certbot akan otomatis memperbarui konfigurasi Nginx Anda untuk redirect HTTP ke HTTPS.

---

## 9. Konfigurasi Firewall (UFW)

Pastikan firewall mengizinkan traffic SSH, HTTP, dan HTTPS:

```bash
# Izinkan akses OpenSSH agar remote server tidak terputus
sudo ufw allow OpenSSH

# Izinkan Nginx Full (HTTP port 80 & HTTPS port 443)
sudo ufw allow 'Nginx Full'

# Aktifkan UFW
sudo ufw enable

# Cek status firewall
sudo ufw status
```

---

## 10. Integrasi dengan Server GenieACS (TR-069 CWMP)

Aplikasi GENIACS terintegrasi langsung dengan daemon **GenieACS NBI (Northbound Interface)** pada port **7557** untuk pembacaan data ONT, optical power Rx/Tx (dBm), status koneksi real-time, dan eksekusi perintah remote reboot.

### Dimana Kolom untuk Memasukkan Alamat GenieACS?
Di dalam antarmuka aplikasi, Anda dapat memasukkan alamat server GenieACS melalui 2 tempat:
1. **Header / Navbar Atas**: Klik tombol **`GenieACS`** yang berada di samping kanan atas (memiliki indikator status hijau/merah).
2. **Menu Data Pelanggan**: Klik tombol **`GenieACS TR-069`** di sebelah kanan atas tabel data pelanggan.

Di dalam jendela popup yang terbuka:
- Masukkan URL endpoint NBI pada kolom **"GenieACS NBI API URL"**, contoh:
  - Jika pada satu server yang sama: `http://localhost:7557` atau `http://127.0.0.1:7557`
  - Jika pada server terpisah: `http://192.168.1.50:7557` atau `https://acs.domainanda.com:7557`
- Pilih metode autentikasi (Tanpa Autentikasi / Basic Auth / Bearer Token).
- Klik tombol **"Uji Koneksi NBI"** untuk menguji apakah port 7557 merespon.
- Klik **"Simpan & Terapkan Konfigurasi"**.

### Konfigurasi di Sisi Server GenieACS (Ubuntu):
Pastikan service `genieacs-nbi` diizinkan menerima koneksi dari dashboard:

1. Buka file konfigurasi environment GenieACS di server:
   ```bash
   sudo nano /opt/genieacs/genieacs.env
   # Atau jika menggunakan systemd environment:
   # /etc/genieacs/genieacs.env
   ```
2. Pastikan bind IP mengarah ke `0.0.0.0` agar bisa diakses:
   ```env
   GENIEACS_NBI_IP=0.0.0.0
   GENIEACS_NBI_PORT=7557
   ```
3. Restart service GenieACS NBI:
   ```bash
   sudo systemctl restart genieacs-nbi
   ```
4. Pastikan port 7557 tidak diblokir firewall:
   ```bash
   sudo ufw allow 7557/tcp
   ```

---

## 11. Pemeliharaan & Update Aplikasi

Jika ada perubahan source code atau rilis versi baru di kemudian hari:

```bash
cd /var/www/geniacs

# Tarik perubahan terbaru dari Git
git pull origin main

# Pasang dependensi baru jika ada
npm install

# Build ulang kode
npm run build

# Restart service di PM2 tanpa downtime
pm2 restart geniacs-app
```

---

## Troubleshooting Cepat

1. **Aplikasi 502 Bad Gateway di Browser?**
   - Cek apakah service aplikasi di PM2 sedang berjalan: `pm2 status`
   - Cek log error aplikasi: `pm2 logs geniacs-app --lines 50`
   - Pastikan port aplikasi sesuai dengan yang ditargetkan di konfigurasi Nginx (`http://127.0.0.1:3000`).

2. **Memeriksa Log Nginx:**
   ```bash
   sudo tail -f /var/log/nginx/geniacs_error.log
   ```

3. **Status Service Nginx:**
   ```bash
   sudo systemctl status nginx
   ```
