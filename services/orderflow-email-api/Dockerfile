FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:24-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip python3-venv \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY requirements-python-runner.txt ./
RUN python3 -m venv /app/.venv \
  && /app/.venv/bin/pip install --no-cache-dir -r requirements-python-runner.txt

COPY --from=build /app/dist ./dist
COPY extract.py desktop_runner.py python_extraction_bridge.py ./
COPY rules ./rules

ENV ORDER_ORGANIZER_PYTHON=/app/.venv/bin/python
ENV EMAIL_API_HOST=0.0.0.0
ENV EMAIL_API_PORT=8787

EXPOSE 8787

CMD ["node", "dist/server/main.js"]
