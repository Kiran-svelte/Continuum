FROM node:20-alpine AS base

WORKDIR /app

# Used by docker-compose healthchecks
RUN apk add --no-cache curl wget

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build
RUN npm run build

# Development (used by docker-compose bind mounts)
FROM node:20-alpine AS dev

WORKDIR /app

RUN apk add --no-cache curl wget

ENV NODE_ENV=development

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["sh", "-lc", "if [ ! -d node_modules ] || [ -z \"$(ls -A node_modules 2>/dev/null)\" ]; then npm ci; fi && npx prisma generate && npx prisma db push && npm run dev -- -H 0.0.0.0 -p 3000"]

# Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache curl wget

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=base /app/public ./public
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
