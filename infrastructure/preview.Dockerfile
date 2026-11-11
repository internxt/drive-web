FROM node:24-alpine

RUN apk update
RUN apk add nginx git

WORKDIR /app
COPY package.json package-lock.json ./
COPY .npmrc ./.npmrc

RUN npm ci
COPY . /app

EXPOSE 3000

CMD ["npm", "run", "dev"]