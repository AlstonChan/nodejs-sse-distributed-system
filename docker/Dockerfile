# syntax=docker/dockerfile:1.0

FROM node:22 AS base
WORKDIR /app
COPY package*.json .
RUN npm install 

# Development stage
FROM base AS development
ENV NODE_ENV=development
RUN npm install
COPY --chown=node:node . .
EXPOSE 3000
CMD [ "npm", "run", "docker:dev"]

# Builder stage for production
FROM node:22 as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
COPY tsconfig.json ./
COPY ./public ./public
RUN npm install --only=production
ENV NODE_ENV=production
CMD [ "npm", "start"]