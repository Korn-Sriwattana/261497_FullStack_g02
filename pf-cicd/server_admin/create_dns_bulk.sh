#!/bin/bash

TUNNEL_ID="XXXX"

for i in $(seq -w 1 25)
do
  HOST="fs-g${i}.iecmu.com"
  echo "Configuring cloudflared tunnel route for ${HOST}..."
  cloudflared tunnel route dns "$TUNNEL_ID" "$HOST"
done