FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Set environment variables (will be overridden by K8s)
ENV NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=""

# Expose port
EXPOSE 3000

# Start the application
CMD ["pnpm", "dev"]
