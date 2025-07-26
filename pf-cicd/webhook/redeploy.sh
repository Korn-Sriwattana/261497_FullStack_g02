#!/bin/bash

# Check if there are exactly 3 parameters and none are empty
if [ $# -ne 3 ] || [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
  echo "Error: Exactly 3 non-empty parameters are required."
  echo "Usage: $0 param1 param2 param3"
  exit 1
fi


# Check if the third parameter equals 'fs68'
if [ "$3" != "fs68" ]; then
  echo "Error: The secret parameter is incorrect."
  exit 1
fi


# Check if /home/$1 exists
USER_HOME="/home/$1"
if [ ! -d "$USER_HOME" ]; then
  echo "Error: User home directory '$USER_HOME' does not exist."
  exit 1
fi

# Retry function
retry() {
    local max_attempts=$1
    shift
    local attempt_num=1
    until "$@"; do
        if (( attempt_num == max_attempts )); then
            echo "Attempt $attempt_num failed and there are no more attempts left!"
            return 1
        else
            echo "Attempt $attempt_num failed! Trying again in $attempt_num seconds..."
            sleep $(( attempt_num++ ))
        fi
    done
}

# Sending discord message
DISCORD_WEBHOOK_URL=$2
AVATAR_URL="https://i.imgur.com/oBPXx0D.png"
send_discord_notification() {
    local content="$1"
    local username="${2:-ScriptBot}"
    local avatar_url="${3:-}"
    
    # Build JSON payload
    local json_payload="{\"content\": \"$content\", \"username\": \"$username\""
    
    # Add avatar URL if provided
    if [[ -n "$avatar_url" ]]; then
        json_payload="${json_payload}, \"avatar_url\": \"$avatar_url\""
    fi
    
    json_payload="${json_payload}}"
    
    # Send the webhook
    curl -H "Content-Type: application/json" \
         -X POST \
         -d "$json_payload" \
         "$DISCORD_WEBHOOK_URL"
}


# Check if /home/$1/pf-deploy exists
USER_HOME="/home/$1"
if [ ! -d "$USER_HOME/pf-deploy" ]; then
  echo "Error: User home directory '$USER_HOME' does not exist."
  send_discord_notification "No pf-deploy folder" cpe_server $AVATAR_URL
  exit 1
fi


echo "Starting redeployment process..."
cd $USER_HOME/pf-deploy
sleep 2

echo "Step 1: Stopping containers..."
send_discord_notification "Stopping Service" cpe_server $AVATAR_URL
retry 5 docker compose down || exit 1
sleep 3

echo "Step 2: Pulling latest images..."
send_discord_notification "Starting Pulling Update" cpe_server $AVATAR_URL
retry 5 docker compose pull || exit 1

echo "Step 3: Starting containers..."
send_discord_notification "Starting Service" cpe_server $AVATAR_URL
retry 5 docker compose up -d || exit 1

echo "Redeployment completed successfully!"

docker image prune -a -f
