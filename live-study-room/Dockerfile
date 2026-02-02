FROM node:20-alpine AS build
WORKDIR /app

# Build-time API URL (Railway: set API_URL and HUB_URL to your backend URL)
ARG API_URL=/api/v1
ARG HUB_URL=/hubs/room
ENV API_URL=$API_URL
ENV HUB_URL=$HUB_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:railway

FROM nginx:alpine AS final
COPY --from=build /app/dist/live-study-room/browser /usr/share/nginx/html
COPY nginx.railway.conf.template /etc/nginx/conf.d/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 8080
CMD ["/docker-entrypoint.sh"]
