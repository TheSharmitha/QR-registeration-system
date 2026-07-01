FROM node:20-alpine

# Install OpenSSL required by Prisma
RUN apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose port
EXPOSE 5000

# Start server
CMD ["npm", "start"]
