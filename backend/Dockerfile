FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# ⚠️ JANGAN COPY file .env ke dalam image — rahasia akan ikut ter-bake dan
# bisa terbaca dari layer image. Semua env dikirim saat runtime oleh
# docker-compose (lihat `environment:` di docker-compose.yml).

EXPOSE 5000

CMD ["node", "server.js"]