FROM node:24-alpine

RUN apk update
RUN apk add nginx git

WORKDIR /app
COPY package.json package-lock.json ./
COPY .npmrc /app/.npmrc

RUN npm ci
COPY . /app
COPY ./infrastructure/share/share.env /app/.env
RUN npm run build

RUN mkdir -p /run/nginx
COPY ./infrastructure/share/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx","-g","daemon off;"]
