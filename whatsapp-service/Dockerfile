# Baileys spricht das WhatsApp-Web-Protokoll direkt über WebSocket — KEIN Chromium/Puppeteer
# mehr nötig. Damit entfallen die getChats-Patches, Chrome-Installs und Volume-Permission-
# Workarounds des alten whatsapp-web.js-Setups.
FROM node:20-bookworm-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
# Session-Verzeichnis fürs Named-Volume (Baileys useMultiFileAuthState + poll-store.json)
RUN mkdir -p /data/session
ENV SESSION_PATH=/data/session
COPY server.js ./
EXPOSE 3000
CMD ["node", "server.js"]
