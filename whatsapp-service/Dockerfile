FROM ghcr.io/puppeteer/puppeteer:24.38.0
USER root
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && chown -R pptruser:pptruser /app
# Patch getChats: upstream (auch main-Commit 1780711) crasht bei aktueller
# WhatsApp-Web-Version, weil Promise.all in window.WWebJS.getChats an EINEM
# kaputten Chat-Model komplett rejected → minifiziertes "r" → /groups 500.
# allSettled überspringt kaputte Chats statt alles zu killen (upstream #201845/#201841).
# Build bricht laut ab, falls das Ziel bei künftigem Version-Bump nicht mehr passt.
RUN node -e "const f='node_modules/whatsapp-web.js/src/util/Injected/Utils.js',fs=require('fs');let s=fs.readFileSync(f,'utf8');const t='return await Promise.all(chatPromises);';if(!s.includes(t)){console.error('PATCH TARGET NOT FOUND in '+f);process.exit(1);}fs.writeFileSync(f,s.replace(t,'return (await Promise.allSettled(chatPromises)).filter(r=>r.status===\"fulfilled\").map(r=>r.value);'));console.log('[build] getChats patched: Promise.all -> allSettled');"
# Session-Verzeichnis pptruser-beschreibbar anlegen — sonst mountet das
# Named-Volume root-owned und whatsapp-web.js kann die Session nicht schreiben (EACCES).
RUN mkdir -p /data/session && chown -R pptruser:pptruser /data
USER pptruser
ENV SESSION_PATH=/data/session
COPY server.js ./
# whatsapp-web.js bringt eine eigene Puppeteer-Version, deren Chrome-Build vom
# Base-Image abweicht → passendes Chrome explizit in den pptruser-Cache laden.
RUN npx puppeteer browsers install chrome
EXPOSE 3000
CMD ["node", "server.js"]
