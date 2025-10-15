FROM node:18-alpine3.19

ARG REACT_APP_NODE_ENV=staging
ARG MODE=staging

ENV REACT_APP_NODE_ENV=${REACT_APP_NODE_ENV}
ENV MODE=${MODE}

RUN apk update
RUN apk add nginx git yarn

WORKDIR /app
COPY package.json yarn.lock ./
COPY .npmrc ./.npmrc
COPY ./scripts ./scripts/

RUN yarn
COPY . /app

EXPOSE 3000

CMD ["yarn", "dev"]