#!/bin/bash

# Script to update SMTP password in docker-compose.yml
# Usage: ./update-smtp-password.sh "your-gmail-app-password"

if [ -z "$1" ]; then
    echo "Usage: $0 <gmail-app-password>"
    echo "Example: $0 'abcd efgh ijkl mnop'"
    exit 1
fi

GMAIL_APP_PASSWORD="$1"

# Update docker-compose.yml
sed -i "s/SMTP_PASSWORD=your-gmail-app-password-here/SMTP_PASSWORD=$GMAIL_APP_PASSWORD/g" docker-compose.yml

echo "✅ SMTP password updated in docker-compose.yml"
echo "🔄 Please restart auth-service: docker-compose up auth-service -d"
