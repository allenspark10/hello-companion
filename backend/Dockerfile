# ---------- Backend Runtime ----------
FROM node:18-alpine
WORKDIR /app

# Copy backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --only=production || npm install --production

COPY backend/ ./

# Copy frontend build from previous stage
COPY --from=frontend-build /app/frontend/build ./frontend/build

ENV NODE_ENV=production
ENV PORT=80

EXPOSE 80

CMD ["npm", "start"]
