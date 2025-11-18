FROM node:18-alpine
WORKDIR /app

# Install dependencies for server
COPY server/package*.json ./server/
RUN npm ci --omit=dev --prefix server

# Copy application source
COPY server ./server
COPY web ./web

# Environment and port
ENV NODE_ENV=production
# Optional: ensure static dir resolves to /app/web
ENV STATIC_DIR=web
EXPOSE 3000

# Start server
CMD ["node", "server/server.js"]