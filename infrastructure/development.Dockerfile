# Stage: install dependencies:
FROM node:24-alpine AS deps

RUN apk add --no-cache git
WORKDIR /app
COPY package.json package-lock.json ./
COPY .npmrc /app/.npmrc
RUN npm ci

# Stage development:
FROM node:24-alpine AS development

ENV NODE_ENV=development
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "run", "dev"]
