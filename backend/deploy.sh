#!/bin/bash
# 🚀 ONE-COMMAND DEPLOYMENT SCRIPT
# Run this and AppWhistler goes live in 5 minutes

set -e  # Exit on any error

echo "🎺 AppWhistler Deployment Script"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo -e "${RED}❌ Fly CLI not installed${NC}"
    echo "Install it with:"
    echo "  curl -L https://fly.io/install.sh | sh"
    echo "  export FLYCTL_INSTALL=\"\$HOME/.fly\""
    echo "  export PATH=\"\$FLYCTL_INSTALL/bin:\$PATH\""
    exit 1
fi

echo -e "${GREEN}✓ Fly CLI installed${NC}"

# Check if logged in
if ! flyctl auth whoami &> /dev/null; then
    echo -e "${YELLOW}→ Logging in to Fly.io...${NC}"
    flyctl auth login
fi

echo -e "${GREEN}✓ Logged in to Fly.io${NC}"

# Navigate to backend
cd "$(dirname "$0")"

# Generate secrets if not exists
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}→ Generating production secrets...${NC}"
    JWT_SECRET=$(openssl rand -hex 32)
    REFRESH_SECRET=$(openssl rand -hex 32)

    cat > .env.production << EOF
JWT_SECRET=${JWT_SECRET}
REFRESH_TOKEN_SECRET=${REFRESH_SECRET}
NODE_ENV=production
ALLOWED_ORIGINS=https://twitter.com,https://x.com,chrome-extension://,https://appwhistler.org
EOF

    echo -e "${GREEN}✓ Secrets generated${NC}"
fi

# Check if app exists
APP_EXISTS=$(flyctl apps list | grep "appwhistler-api" || echo "")

if [ -z "$APP_EXISTS" ]; then
    echo -e "${YELLOW}→ Creating new Fly app...${NC}"
    flyctl launch --no-deploy --name appwhistler-api --region ord --org personal

    echo -e "${YELLOW}→ Creating PostgreSQL database...${NC}"
    flyctl postgres create --name appwhistler-db --region ord --vm-size shared-cpu-1x --volume-size 1
    flyctl postgres attach appwhistler-db --app appwhistler-api

    echo -e "${GREEN}✓ App and database created${NC}"
else
    echo -e "${GREEN}✓ App already exists${NC}"
fi

# Set secrets
echo -e "${YELLOW}→ Setting secrets...${NC}"
source .env.production
flyctl secrets set \
  JWT_SECRET="$JWT_SECRET" \
  REFRESH_TOKEN_SECRET="$REFRESH_SECRET" \
  NODE_ENV="production" \
  ALLOWED_ORIGINS="https://twitter.com,https://x.com,chrome-extension://,https://appwhistler.org" \
  --app appwhistler-api

echo -e "${GREEN}✓ Secrets set${NC}"

# Deploy
echo -e "${YELLOW}→ Deploying to Fly.io...${NC}"
flyctl deploy --app appwhistler-api

echo -e "${GREEN}✓ Deployed!${NC}"

# Get URL
URL=$(flyctl info --app appwhistler-api | grep "Hostname" | awk '{print $3}')

echo ""
echo "================================"
echo -e "${GREEN}🎺 DEPLOYMENT SUCCESSFUL!${NC}"
echo "================================"
echo ""
echo "Your API is live at:"
echo -e "${GREEN}https://${URL}${NC}"
echo ""
echo "Health check:"
echo "  curl https://${URL}/health"
echo ""
echo "GraphQL endpoint:"
echo "  https://${URL}/graphql"
echo ""
echo "Next steps:"
echo "  1. Initialize database schema"
echo "  2. Update extension API URL to: https://${URL}/graphql"
echo "  3. Test the extension"
echo "  4. Submit to Chrome Web Store"
echo ""
echo -e "${YELLOW}Initialize database with:${NC}"
echo "  flyctl postgres connect -a appwhistler-db"
echo "  Then paste schema from database/schema.sql"
echo ""
echo "🚀 Ready to ship!"
