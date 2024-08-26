FROM node:20-alpine AS build
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.19.0-alpine
COPY --from=build /app/build /var/www/pong_spa
COPY nginx/nginx.conf.d/production.conf /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf.d/ssl.conf /etc/nginx/conf.d/
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY ssl/pong42.com /etc/nginx/ssl/pong

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]