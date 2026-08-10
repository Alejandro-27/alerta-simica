# AlertaSísmica — Backend
# Build (desde la raíz del repositorio):
#   docker build -f backend/Dockerfile -t alertasimica-backend .
FROM node:22-alpine AS build
WORKDIR /app/backend
COPY backend/package.json backend/pnpm-lock.yaml backend/pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate \
  && pnpm install --frozen-lockfile
COPY backend/tsconfig.json ./
COPY backend/tsconfig.build.json ./
COPY backend/src ./src
COPY shared /app/shared
RUN pnpm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/backend
COPY backend/package.json backend/pnpm-lock.yaml backend/pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate \
  && pnpm install --prod --frozen-lockfile
COPY --from=build /app/backend/dist ./dist
EXPOSE 4000
CMD ["node", "dist/backend/src/server.js"]
