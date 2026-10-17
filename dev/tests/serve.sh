#!/bin/bash
# start the local test broker (Mosquitto + WS bridge, port 9001) and a static server for dist/ (port 8765) if not running
cd "$(dirname "$0")/.."
if [ ! -x /tmp/claude-0/mosq/src/mosquitto ]; then
  mkdir -p /tmp/claude-0 && (cd /tmp/claude-0 && git clone -q --depth 1 -b v2.0.20 https://github.com/eclipse/mosquitto mosq && cd mosq && make -s -j8 WITH_TLS=no WITH_CJSON=no WITH_WEBSOCKETS=no WITH_DOCS=no WITH_SRV=no WITH_SHARED_LIBRARIES=no WITH_STATIC_LIBRARIES=yes binary >/dev/null 2>&1)
fi
nc -z 127.0.0.1 9001 2>/dev/null || (NODE_PATH=/opt/npm-tools/node_modules nohup node tests/broker.js 9001 18830 > /tmp/claude-0/broker.log 2>&1 &)
nc -z 127.0.0.1 8765 2>/dev/null || (cd dist && nohup python3 -m http.server 8765 --bind 127.0.0.1 > /tmp/claude-0/http.log 2>&1 &)
for i in $(seq 1 30); do nc -z 127.0.0.1 9001 2>/dev/null && nc -z 127.0.0.1 8765 2>/dev/null && echo "servers up" && exit 0; sleep 0.3; done
echo "servers failed"; exit 1
