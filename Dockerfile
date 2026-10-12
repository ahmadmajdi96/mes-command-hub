# Cortanex RMS — container
# NOTE: keep Bun on 1.2+ (Vite 7 needs util.parseEnv).
FROM oven/bun:1.2-alpine
WORKDIR /app
COPY package.json bun.lock* bunfig.toml* ./
RUN bun install --frozen-lockfile || bun install
COPY . .
EXPOSE 8121
CMD ["bun", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8121"]
