FROM ghcr.io/puppeteer/puppeteer:22.15.0
USER root
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && chown -R pptruser:pptruser /app
USER pptruser
ENV SESSION_PATH=/data/session
COPY server.js ./
EXPOSE 3000
CMD ["node", "server.js"]
