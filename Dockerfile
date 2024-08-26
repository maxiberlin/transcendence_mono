FROM node:20-alpine AS build-stage
WORKDIR /app
COPY transcendence_frontend/package.json .
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.19.0-alpine
RUN adduser -D static
COPY --from=builder /app/build /var/www/pong_spa
COPY nginx/prod/nginx.conf /etc/nginx/nginx.conf
COPY ssl/pong42.com /etc/nginx/ssl/pong

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]