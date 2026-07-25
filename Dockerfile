FROM node:22-bookworm-slim AS base

WORKDIR /app

ENV npm_config_update_notifier=false

COPY package*.json ./


FROM base AS development

ENV NODE_ENV=development \
    APP_HOST=0.0.0.0 \
    APP_PORT=4500

RUN apt-get update \
  && apt-get install -y --no-install-recommends default-mysql-client \
  && rm -rf /var/lib/apt/lists/*

RUN npm ci

COPY . .

EXPOSE 4500

CMD ["npm", "run", "dev"]


FROM base AS production

ENV NODE_ENV=production \
    APP_HOST=0.0.0.0 \
    APP_PORT=4500

RUN apt-get update \
  && apt-get install -y --no-install-recommends dumb-init default-mysql-client \
  && rm -rf /var/lib/apt/lists/*

RUN npm ci --omit=dev \
  && npm cache clean --force

COPY --chown=node:node . .

RUN mkdir -p uploads backups tmp temp \
  && chown -R node:node uploads backups tmp temp

USER node

EXPOSE 4500

ENTRYPOINT ["dumb-init", "--"]

CMD ["npm", "start"]
