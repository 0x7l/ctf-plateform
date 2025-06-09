# Use Node.js LTS as the base image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Expose the API port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
