FROM node:22

WORKDIR /app

COPY package.json .
RUN npm install

COPY seed-multi.js .

# Args: [torrents.txt] [trackers.txt] [torrent-files-dir]
# Will read both torrents.txt (if exists) and .torrent files from /data

CMD ["node", "seed-multi.js", "/data/torrents.txt","/data/trackers.txt","/data"]

#CMD ["node", "seed-multi.js", "460b0b5d942af2de6e3d69333c782f391fcc1ee0","/data/torrents.txt", "/data"]
