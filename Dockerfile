# The portfolio as a container image: the static site built by Nuxt, served by nginx with the
# same security headers as the live site. Published to GitHub Packages (ghcr.io) by
# .github/workflows/package.yml.
#
#   docker run -p 8080:8080 ghcr.io/aryansinghh07/aryan-version-2
#
# The contact form needs Netlify Forms, so it only sends from the Netlify site.

# ------------------------------------------------------------------ build the static site
FROM node:26-slim AS build
WORKDIR /app
COPY . .
# The address used for canonical links, social cards and the sitemap
ARG SITE_URL=https://aryansingh7.netlify.app
ENV NUXT_PUBLIC_SITE_URL=$SITE_URL
RUN npm ci && npm run generate \
  && node scripts/nginx-headers.mjs .output/public/_headers > /tmp/security-headers.conf

# ------------------------------------------------------------------ serve it
FROM nginx:1.29-alpine
LABEL org.opencontainers.image.title="Aryan Singh Portfolio" \
  org.opencontainers.image.description="Aryan Singh's portfolio: Nuxt 4, Vue 3 and a three.js 3D experience, served by nginx" \
  org.opencontainers.image.source="https://github.com/AryanSinghh07/Aryan-Version-2" \
  org.opencontainers.image.url="https://aryansingh7.netlify.app"
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /tmp/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/.output/public /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
