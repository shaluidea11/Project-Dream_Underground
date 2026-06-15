FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npx tsc
RUN npm prune --production

ENV NODE_ENV=production

EXPOSE ${PORT:-3002}

CMD ["node", "dist/server.js"]
