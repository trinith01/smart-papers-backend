# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# Production stage
FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app /app
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
