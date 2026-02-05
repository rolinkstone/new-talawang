FROM node:18-alpine
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build aplikasi Next.js
RUN npm run build

# Set environment variable untuk port
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# Expose port
EXPOSE 3001

# Start aplikasi
CMD ["npm", "start"]