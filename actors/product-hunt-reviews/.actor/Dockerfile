FROM apify/actor-node:20

WORKDIR /home/myuser

COPY --chown=myuser:myuser package*.json ./
RUN npm install --include=dev

COPY --chown=myuser:myuser tsconfig.json ./
COPY --chown=myuser:myuser src ./src

RUN npm run build && npm prune --omit=dev

CMD ["node", "dist/main.js"]
