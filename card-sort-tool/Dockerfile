# Use an official Node runtime as the base image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Install necessary build tools and dependencies
RUN apk add --no-cache python3 py3-setuptools make g++ sqlite-dev certbot

# Copy package.json and package-lock.json for both client and server
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies for client
RUN cd client && npm install

# Install dependencies for server, using a pre-built SQLite3 binary
RUN cd server && \
    npm install sqlite3 --build-from-source --sqlite=/usr && \
    npm install

# Copy the rest of the application code
COPY . .

# Build the React app
RUN cd client && npm run build

# Set environment variables
ENV PORT=3000
ENV JWT_SECRET=your_jwt_secret_here
ENV FRONTEND_URL=http://localhost:3000
ENV REACT_APP_API_URL=http://localhost:3000/api
ENV REACT_APP_CLIENT_URL=http://localhost:3000

# Expose the port the app runs on
EXPOSE 3000

# Start the server
CMD ["node", "server/src/app.js"]