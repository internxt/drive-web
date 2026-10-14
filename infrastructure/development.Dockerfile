# Stage: install dependencies:
FROM node:24-alpine AS deps

RUN apk add --no-cache git
WORKDIR /app
COPY package.json yarn.lock ./
COPY .npmrc /app/.npmrc
COPY /scripts /app/scripts/
RUN yarn 

# Stage development:
FROM node:24-alpine AS development

ENV NODE_ENV=development
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000
CMD ["yarn", "dev"]
