FROM apify/actor-node-playwright-chrome:22-1.52.0

WORKDIR /home/myuser

COPY --chown=myuser:myuser package*.json ./
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm install --include=dev

COPY --chown=myuser:myuser tsconfig.json ./
COPY --chown=myuser:myuser src ./src

RUN npm run build && npm prune --omit=dev

CMD ["node", "dist/main.js"]
