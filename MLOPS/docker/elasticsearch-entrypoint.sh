#!/bin/sh
set -eu

KEYSTORE_PATH="/usr/share/elasticsearch/config/elasticsearch.keystore"
CURRENT_HOSTNAME="$(hostname)"

if ! grep -q "[[:space:]]$CURRENT_HOSTNAME\$" /etc/hosts 2>/dev/null; then
    echo "127.0.0.1 $CURRENT_HOSTNAME" >> /etc/hosts
fi

if [ -f "$KEYSTORE_PATH" ]; then
    if ! bin/elasticsearch-keystore list >/dev/null 2>&1; then
        echo "Corrupted Elasticsearch keystore detected; recreating it."
        rm -f "$KEYSTORE_PATH"
        bin/elasticsearch-keystore create
    fi
fi

exec /usr/local/bin/docker-entrypoint.sh eswrapper
