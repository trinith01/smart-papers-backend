# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install && npm install pm2 -g

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Install PM2 globally
RUN npm install pm2 -g

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application files
COPY . .

# Create logs directory
RUN mkdir -p logs

EXPOSE 5000

CMD ["pm2-runtime", "start", "ecosystem.config.cjs"]
