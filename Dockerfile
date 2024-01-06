
# ---- Build Stage ----
FROM node:18-slim AS builder
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./
# Install both production and development dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# ---- Production Stage ----
FROM node:18-alpine AS production
WORKDIR /app
# Copy package.json and package-lock.json
COPY package*.json ./
# Install Prisma globally
# RUN npm install -g prisma
# Install only production dependencies
RUN npm install

# Copy Prisma
# COPY --from=builder /app/schema.prisma .

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

# Generate Prisma client
# RUN npx prisma generate

# Debugging: Print MONGO_URL
# RUN echo "MONGO_URL=$MONGO_URL"

CMD ["sh", "-c", "node dist/main"]