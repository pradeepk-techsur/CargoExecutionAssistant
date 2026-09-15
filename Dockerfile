# The build pipeline (TechArch §6.4) as two stages. Stage 1 carries the full
# toolchain and builds the contract, the web bundle and the server; stage 2 is a
# slim runtime with no build toolchain (§6.2), holding only the compiled output,
# the production node_modules, and the migrations/scripts the boot command runs.
#
# Both stages pin `node:22.11-bookworm-slim` (§6.2): the demonstration and every
# later phase's UAT must run the Node the code was built and tested against.

# ---- stage 1: build contract, web and server -------------------------------
FROM node:22.11-bookworm-slim AS build
WORKDIR /app
# argon2 is a native binding; the build stage carries the compiler toolchain so
# a prebuild miss compiles from source rather than failing the image (§6.2).
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY contract/package.json contract/
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci
COPY . .
# build:server (tsc -b contract server) + build:web (sass + assets + vite build)
RUN npm run build

# ---- stage 2: runtime -------------------------------------------------------
FROM node:22.11-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY contract/package.json contract/
COPY server/package.json server/
COPY web/package.json web/
# --omit=dev re-resolves argon2's prebuild for the runtime image. No build
# toolchain is installed in this stage (§6.2: "slim base with no build toolchain
# in the runtime stage").
RUN npm ci --omit=dev
# Compiled output from the build stage. The runtime never rebuilds.
COPY --from=build /app/contract/dist  contract/dist
COPY --from=build /app/server/dist    server/dist
COPY --from=build /app/web/dist       web/dist
# The boot command runs the migration set (§8.7 step 3) and the account
# bootstrap, so the migrations and the scripts that drive them must ship.
COPY server/migrations                server/migrations
COPY server/scripts                   server/scripts
EXPOSE 3000
# The demonstration serves the production path (§6.5). The compose `command`
# overrides this to run migrate -> bootstrap -> serve; the bare image runs the
# server so `docker run` reaches loadConfig() and refuses a bad environment.
CMD ["node", "server/dist/index.js"]
