# Single-process container for Railway, Fly.io, Cloud Run or any VPS.
#
# Deliberately not a `next build --standalone` image: pdf.js resolves its
# worker by path at runtime and is declared in `serverExternalPackages`, so
# the real node_modules tree has to be present.
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV STORAGE_DIR=/tmp/caselens-storage

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs

EXPOSE 3000
CMD ["npm", "start"]
