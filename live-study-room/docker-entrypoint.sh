#!/bin/sh
set -e
# Railway injects PORT; nginx must listen on it.
PORT="${PORT:-8080}"
sed "s/LISTEN_PORT/${PORT}/" /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g "daemon off;"
