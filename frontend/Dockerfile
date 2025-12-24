# Development Dockerfile
FROM node:25-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source (optional, as we will mount volume in compose)
COPY . .

# Expose Vite port
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev", "--", "--host"]
