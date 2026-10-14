# Multi-stage production build for Node.js
# Stage 1: Build & Install dependencies
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Clean install all dependencies (including dev for any build steps if needed)
RUN npm ci

# Copy the rest of the application code
COPY src ./src
COPY scripts ./scripts

# Stage 2: Production runtime
FROM node:20-alpine

WORKDIR /usr/src/app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy only necessary files from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/scripts ./scripts

# Run as non-root user for better security
USER node

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
