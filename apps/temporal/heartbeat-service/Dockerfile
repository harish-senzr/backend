# 👷 Build stage
FROM node:18-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# 🚀 Final stage with glibc support (important for Temporal core-bridge)
FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

# 👇 Correct reference to builder stage
COPY --from=builder /app/dist ./dist

CMD ["node", "dist/temporal/worker.js"]
