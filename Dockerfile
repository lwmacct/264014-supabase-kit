FROM node:22-alpine AS builder

WORKDIR /app

ARG VITE_APP_VERSION

ENV VITE_APP_VERSION=${VITE_APP_VERSION}

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.node.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src

RUN npm run build

FROM nginx:1.29-alpine

ENV PORT=80
ENV SUPABASE_UPSTREAM=http://127.0.0.1:8000
ENV VITE_SUPABASE_URL=./supabase
ENV VITE_SUPABASE_ANON_KEY=

COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY docker/nginx/env.js.template /opt/nginx/env.js.template
COPY docker/nginx/40-write-env-js.sh /docker-entrypoint.d/40-write-env-js.sh
RUN chmod +x /docker-entrypoint.d/40-write-env-js.sh
COPY --from=builder /app/dist/ /usr/share/nginx/html/
