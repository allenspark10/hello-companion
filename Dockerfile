# ---------- Build Frontend ----------
FROM node:18-slim AS frontend-build

# Set PATH explicitly to ensure node is found
ENV PATH="/usr/local/bin:$PATH"

# Verify node is working
RUN node --version && npm --version

WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install
COPY frontend/ ./
ARG REACT_APP_API_URL
ARG REACT_APP_TELEGRAM_URL
ARG REACT_APP_INSTAGRAM_URL
ARG REACT_APP_TELEGRAM_POST_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV REACT_APP_TELEGRAM_URL=${REACT_APP_TELEGRAM_URL}
ENV REACT_APP_INSTAGRAM_URL=${REACT_APP_INSTAGRAM_URL}
ENV REACT_APP_TELEGRAM_POST_URL=${REACT_APP_TELEGRAM_POST_URL}
RUN npm run build

# ---------- Backend Runtime ----------
FROM node:18-slim

# Set PATH explicitly
ENV PATH="/usr/local/bin:$PATH"

# Verify node is working
RUN node --version && npm --version

WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --only=production || npm install --production
COPY backend/ ./
COPY --from=frontend-build /frontend/build ./frontend/build
ENV NODE_ENV=production
ENV PORT=80
EXPOSE 80
CMD ["npm", "start"]

