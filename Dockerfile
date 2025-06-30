FROM node:24-alpine

# Install required system packages
RUN apk add --no-cache \
    wget \
    curl \
    git

# Verify installations
RUN node --version && \
    npm --version && \
    git --version && \
    curl --version && \
    wget --version
# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Expose the API port
EXPOSE 4445

# Start the application
CMD ["node", "server.js"]
