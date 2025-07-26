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

# Debugging
# echo "You passed $# parameter(s):"
# for param in "$@"
# do
  # echo "$param"
# done

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
send_discord_notification "Webhook received with group $1" cpe_server $AVATAR_URL
