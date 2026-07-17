FROM ghcr.io/puppeteer/puppeteer:24.38.0
USER root
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && chown -R pptruser:pptruser /app
# Patch getChats gegen aktuelle WhatsApp-Web-Version (upstream #201845/#201841, offen):
#  (1) window.WWebJS.getChats nutzt Promise.all über alle Chat-Models — EIN kaputtes
#      Model rejected alles → minifiziertes "r" → /groups 500. allSettled überspringt.
#  (2) getChatModel ruft groupMetadata.update(), aber die GroupMetadata-Collection ist
#      in aktueller WA-Web-Version undefined → JEDER Gruppen-Chat wirft → mit (1) dann
#      leere Gruppenliste ("keine Gruppen verfügbar"). Guard überspringt den Update-Call
#      (id+name+groupMetadata kommen trotzdem aus chat.serialize()).
# Build bricht laut ab, falls ein Ziel bei künftigem Version-Bump nicht mehr passt.
RUN node -e "const f='node_modules/whatsapp-web.js/src/util/Injected/Utils.js',fs=require('fs');let s=fs.readFileSync(f,'utf8');const P=[['return await Promise.all(chatPromises);','return (await Promise.allSettled(chatPromises)).filter(r=>r.status===\"fulfilled\").map(r=>r.value);'],['await groupMetadata.update(chatWid);','if (groupMetadata && groupMetadata.update) await groupMetadata.update(chatWid);']];for(const x of P){if(!s.includes(x[0])){console.error('PATCH TARGET NOT FOUND: '+x[0]);process.exit(1);}s=s.replace(x[0],x[1]);}fs.writeFileSync(f,s);console.log('[build] getChats patched: allSettled + groupMetadata guard');"
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
