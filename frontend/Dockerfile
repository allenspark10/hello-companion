# ---------- Build Frontend ----------
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend

# Copy frontend files
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install

COPY frontend/ ./

# Build arguments for React
ARG REACT_APP_API_URL
ARG REACT_APP_TELEGRAM_URL
ARG REACT_APP_INSTAGRAM_URL
ARG REACT_APP_TELEGRAM_POST_URL

ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV REACT_APP_TELEGRAM_URL=${REACT_APP_TELEGRAM_URL}
ENV REACT_APP_INSTAGRAM_URL=${REACT_APP_INSTAGRAM_URL}
ENV REACT_APP_TELEGRAM_POST_URL=${REACT_APP_TELEGRAM_POST_URL}

RUN npm run build
