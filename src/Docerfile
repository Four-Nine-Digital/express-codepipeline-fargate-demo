FROM node:14

# install curl for healthcheck
RUN apt-get update
RUN apt-get -y install curl

# Create app directory
RUN mkdir -p app
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./


RUN npm install

COPY . .

EXPOSE 3000
CMD [ "npm", "start" ]