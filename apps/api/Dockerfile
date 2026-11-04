# Build from the repository root:  docker build -f apps/api/Dockerfile -t courtside-api .
FROM node:22-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci --workspace @courtside/api --include-workspace-root=false
COPY apps/api apps/api
RUN npx prisma generate --schema apps/api/prisma/schema.prisma \
 && npm run build -w @courtside/api \
 && npm prune --omit=dev --workspace @courtside/api

FROM node:22-alpine
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/package.json ./
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/prisma ./prisma
USER node
EXPOSE 4000
# Apply pending migrations, then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
