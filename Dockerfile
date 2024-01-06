
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
ENV SUPABASE_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5YmFkdnRhZ2Z3ZWllc3pvY2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDIzNjgzMTgsImV4cCI6MjAxNzk0NDMxOH0.CwVLCUWyVEfg69TxwJlbc-J6LAfVGL91wRCl8fXy2H4
ENV SUPABASE_URL_LC_CHATBOT=https://cybadvtagfweieszocgf.supabase.co
ENV OPENAI_API_KEY=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
ENV LLM_MODEL_NAME=gpt-3.5-turbo

# Generate Prisma client
# RUN npx prisma generate

# Debugging: Print MONGO_URL
# RUN echo "MONGO_URL=$MONGO_URL"

CMD ["sh", "-c", "node dist/main"]