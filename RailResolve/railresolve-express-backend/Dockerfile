FROM node:24-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev


FROM node:24-alpine

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY source ./source

EXPOSE 5000

CMD ["node", "source/server.js"]