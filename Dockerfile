FROM node:20-alpine AS base

# Stage 1: Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm install --legacy-peer-deps

# Stage 2: Build the application
FROM base AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js inlines NEXT_PUBLIC_* at build time — hardcoded here so Dokploy builds work
ENV NEXT_PUBLIC_SUPABASE_URL=https://khyqttsglmpuiexpfpfu.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoeXF0dHNnbG1wdWlleHBmcGZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTI4NDYsImV4cCI6MjA4NjEyODg0Nn0.pDYZxUP9tiT_c-yOaYOE3jYWk-lDIN0vwM8VqHusB-M
ENV NEXT_PUBLIC_TMDB_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyNGRiZWYzOTRmOTAzNGMwM2ViNmM5M2E4ZjA0M2MwNSIsIm5iZiI6MTc1MjkzMTUwOS44MzMsInN1YiI6IjY4N2I5Y2I1ZGZmMDA4MWRhYzcyYzI1YiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.RmEVeq7ssiU0LSkUj9ihGMySUeS3y3CbeKs_00BCsi4

RUN npx prisma generate
RUN npm run build

# Stage 3: Production runner
FROM base AS runner
RUN apk add --no-cache openssl bash
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output + static assets + public
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy prisma for runtime db push
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy startup script
COPY --from=builder --chown=nextjs:nodejs /app/scripts/startup.sh ./scripts/startup.sh
RUN chmod +x ./scripts/startup.sh

USER nextjs
EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss --skip-generate 2>&1 || echo 'DB push failed, continuing...'; node server.js"]
