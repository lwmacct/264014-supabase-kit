FROM nginx:1.29-alpine

ENV PORT=80

COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY dist/ /usr/share/nginx/html/
