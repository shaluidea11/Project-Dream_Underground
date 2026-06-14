FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .
RUN npx tsc

ENV NODE_ENV=production

EXPOSE ${PORT:-3002}

CMD ["node", "dist/server.js"]
