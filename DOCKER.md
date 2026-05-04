# Docker Deployment

This project can run as one Docker container.

- Public frontend port: `3000`
- Internal backend API port: `3001`
- Browser API calls use `/api/...` on the same origin
- The frontend server proxies `/api/...` to the backend server inside the container

## Build

```sh
docker build -t sp500-stock-dashboard .
```

## Run

```sh
docker run -d \
  --name sp500-stock-dashboard \
  -p 3000:3000 \
  -e FMP_API_KEY=your_api_key_here \
  --restart unless-stopped \
  sp500-stock-dashboard
```

Open:

```text
http://localhost:3000
```

## Run With Docker Compose

Create a `.env` file from `.env.example` and set your API key:

```sh
cp .env.example .env
```

Then run:

```sh
docker compose up -d --build
```

Open:

```text
http://localhost:3000
```

## Deploy Notes

On a server, point your reverse proxy or load balancer to container port `3000`.
Only port `3000` needs to be public. The backend port `3001` stays internal.

Example environment variables:

```text
FMP_API_KEY=your_api_key_here
PORT=3000
BACKEND_PORT=3001
API_BASE_URL=
API_PROXY_URL=http://127.0.0.1:3001
```
