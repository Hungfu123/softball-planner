FROM ghcr.io/puppeteer/puppeteer:22.15.0
USER root
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && chown -R pptruser:pptruser /app
# Session-Verzeichnis pptruser-beschreibbar anlegen — sonst mountet das
# Named-Volume root-owned und whatsapp-web.js kann die Session nicht schreiben (EACCES).
RUN mkdir -p /data/session && chown -R pptruser:pptruser /data
USER pptruser
ENV SESSION_PATH=/data/session
COPY server.js ./
EXPOSE 3000
CMD ["node", "server.js"]
