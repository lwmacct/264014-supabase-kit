#!/bin/sh
set -eu

envsubst '${VITE_SUPABASE_URL} ${VITE_SUPABASE_ANON_KEY}' \
  < /opt/nginx/env.js.template \
  > /usr/share/nginx/html/env.js
