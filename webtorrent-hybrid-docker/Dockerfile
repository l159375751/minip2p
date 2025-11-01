FROM node:22

# Pin version for stable caching
RUN npm install -g webtorrent-cli@5.1.3

WORKDIR /app

COPY seed-multi.js .

ENTRYPOINT ["webtorrent"]
CMD ["--help"]
