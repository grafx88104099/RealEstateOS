# Render/Fly Docker worker for the Listing Discovery agent.
# Image is the official Playwright base — Chromium pre-installed and warm.
#
# Build:   docker build -t realestate-scraper-worker .
# Run:     docker run --env-file ../.env.local -p 7777:7777 realestate-scraper-worker

FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /app

# Install Node deps
COPY package.json ./
RUN npm install --omit=dev

# Worker source
COPY worker.mjs ./

EXPOSE 7777

CMD ["node", "worker.mjs"]
