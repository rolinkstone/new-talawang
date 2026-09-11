FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# ⚠️ JANGAN COPY file .env ke dalam image — rahasia akan ikut ter-bake dan
# bisa terbaca dari layer image. Semua env dikirim saat runtime oleh
# docker-compose (lihat `environment:` di docker-compose.yml).

# ============================================================
#  SEED UPLOADS
#  Salin folder uploads ke /seed/uploads — path yang TIDAK di-mount oleh
#  docker-compose. Kalau tetap disimpan di public/uploads, bind mount
#  ./data/backend/uploads akan MENUTUPI isinya sehingga tidak terbaca.
#  entrypoint.sh menyalin seed ini ke volume, hanya bila volume kosong.
#
#  Supaya ikut ter-build, backend/.dockerignore TIDAK boleh meng-ignore
#  public/uploads.
# ============================================================
RUN mkdir -p /seed/uploads \
 && if [ -d public/uploads ]; then cp -a public/uploads/. /seed/uploads/; fi \
 && echo "Seed uploads siap: $(find /seed/uploads -type f | wc -l) file"

# Normalisasi line-ending (file bisa ter-checkout CRLF di Windows sehingga
# gagal dieksekusi dengan "/bin/sh^M: bad interpreter") lalu beri izin eksekusi.
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
CMD ["node", "server.js"]
