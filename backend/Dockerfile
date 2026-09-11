FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# ⚠️ JANGAN COPY file .env ke dalam image — rahasia akan ikut ter-bake dan
# bisa terbaca dari layer image. Semua env dikirim saat runtime oleh
# docker-compose (lihat `environment:` di docker-compose.yml).

# Catatan: folder public/uploads TIDAK ikut masuk ke image
# (lihat backend/.dockerignore). Folder itu di-mount oleh docker-compose dari
# ./backend/public/uploads, sehingga:
#   - image tetap kecil dan `docker compose build` lebih cepat
#   - file upload bisa langsung diakses tanpa build ulang

EXPOSE 5000

CMD ["node", "server.js"]
