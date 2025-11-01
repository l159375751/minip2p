FROM node:22

WORKDIR /app

COPY package.json .
RUN npm install

COPY seed-multi.js .

CMD ["node", "seed-multi.js", "/data/torrents.txt"]
