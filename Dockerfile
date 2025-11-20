FROM node:18-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Environment and port
ENV NODE_ENV=production
ENV STATIC_DIR=web
EXPOSE 3000

# Start server
CMD ["node", "server.js"]