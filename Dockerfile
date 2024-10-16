FROM node:20

WORKDIR /app

COPY package.json /app

RUN npm install --legacy-peer-deps

COPY . /app

EXPOSE 3000

CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--port", "3000"]