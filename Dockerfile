# Multi-stage build for Tokenizin Next.js Application
FROM oven/bun:1-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./
COPY packages/reown-appkit-module/package.json ./packages/reown-appkit-module/

# Install dependencies with Bun
RUN bun install --frozen-lockfile --production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy package files first
COPY package.json bun.lock* ./
COPY packages/reown-appkit-module/package.json ./packages/reown-appkit-module/

# Install all dependencies (including dev) for building
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Set build environment
ENV NODE_OPTIONS="--max-old-space-size=3584 --max-semi-space-size=1024 --expose-gc"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Generate ZenStack schema and Prisma client
RUN bunx zen generate --schema zenstack/schema.zmodel || echo "ZenStack generation skipped"
RUN bun run db:push || echo "Prisma db push skipped if not available"
# Build Next.js application
RUN NODE_OPTIONS="--max-old-space-size=3584" bunx next build --webpack

# Production image, copy all the files and run next
# Use Node.js for runtime (Bun base image includes Node.js)
FROM node:22-alpine AS runner
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the built application from standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose the port the app runs on
EXPOSE 3000

# Set the correct environment variable for standalone mode
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]