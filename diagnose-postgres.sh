#!/bin/bash

# Diagnostic script for PostgreSQL issues in Dokploy deployment
# Run this on your Dokploy server after SSH

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║       PostgreSQL Diagnostic Script for Dokploy                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "⚠️  This script should be run as root"
  echo "   Run: sudo bash diagnose-postgres.sh"
  exit 1
fi

echo "🔍 Step 1: Checking if PostgreSQL container exists..."
if docker ps -a | grep -q startup-mvp-postgres; then
  echo "✅ Container exists"
  
  # Check if running
  if docker ps | grep -q startup-mvp-postgres; then
    echo "✅ Container is running"
    
    # Check health status
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' startup-mvp-postgres 2>/dev/null)
    if [ "$HEALTH" = "healthy" ]; then
      echo "✅ Container is healthy"
    else
      echo "⚠️  Container health status: $HEALTH"
    fi
  else
    echo "❌ Container is NOT running"
    echo "   This is the problem!"
  fi
else
  echo "❌ Container does not exist"
  echo "   Deployment may not have started properly"
fi

echo ""
echo "🔍 Step 2: Checking PostgreSQL logs..."
echo "   Last 20 lines of logs:"
echo "   ─────────────────────────────────────────────────────────────"
docker logs --tail 20 startup-mvp-postgres 2>&1
echo "   ─────────────────────────────────────────────────────────────"
echo ""

# Check for corruption indicators
if docker logs --tail 50 startup-mvp-postgres 2>&1 | grep -q "could not open file"; then
  echo "🔴 CORRUPTION DETECTED: 'could not open file' error found"
  CORRUPTED=true
elif docker logs --tail 50 startup-mvp-postgres 2>&1 | grep -q "database system was interrupted"; then
  echo "🔴 CORRUPTION DETECTED: Database was interrupted"
  CORRUPTED=true
elif docker logs --tail 50 startup-mvp-postgres 2>&1 | grep -q "invalid data"; then
  echo "🔴 CORRUPTION DETECTED: Invalid data found"
  CORRUPTED=true
else
  CORRUPTED=false
fi

echo ""
echo "🔍 Step 3: Finding project directory..."
PROJECT_DIR=$(docker inspect startup-mvp-postgres 2>/dev/null | grep -A 1 '"Source"' | grep '/volumes/postgres' | sed 's/.*"\(.*\)\/volumes\/postgres.*/\1/' | head -1)

if [ -n "$PROJECT_DIR" ]; then
  echo "✅ Project directory: $PROJECT_DIR"
  
  echo ""
  echo "🔍 Step 4: Checking volume..."
  if [ -d "$PROJECT_DIR/volumes/postgres" ]; then
    VOLUME_SIZE=$(du -sh "$PROJECT_DIR/volumes/postgres" 2>/dev/null | cut -f1)
    echo "   Volume exists: $PROJECT_DIR/volumes/postgres"
    echo "   Size: $VOLUME_SIZE"
    
    # Check if volume is empty
    FILE_COUNT=$(find "$PROJECT_DIR/volumes/postgres" -type f 2>/dev/null | wc -l)
    if [ "$FILE_COUNT" -lt 10 ]; then
      echo "   ⚠️  Very few files ($FILE_COUNT) - may be incomplete initialization"
    fi
  else
    echo "   ℹ️  Volume does not exist yet (first run)"
  fi
else
  echo "⚠️  Could not find project directory"
  echo "   Try: docker inspect startup-mvp-postgres | grep Source"
fi

echo ""
echo "🔍 Step 5: Testing database connection..."
if docker exec startup-mvp-postgres pg_isready -U postgres >/dev/null 2>&1; then
  echo "✅ Database is accepting connections!"
  
  # Try to connect
  if docker exec startup-mvp-postgres psql -U postgres -d startup_mvp -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Can connect to database"
  else
    echo "⚠️  Database exists but cannot connect"
  fi
else
  echo "❌ Database is NOT accepting connections"
fi

echo ""
echo "══════════════════════════════════════════════════════════════════"
echo "                         DIAGNOSIS SUMMARY                        "
echo "══════════════════════════════════════════════════════════════════"

if [ "$CORRUPTED" = true ]; then
  echo ""
  echo "🔴 DIAGNOSIS: DATABASE VOLUME IS CORRUPTED"
  echo ""
  echo "📋 SOLUTION: Remove the corrupted volume"
  echo ""
  if [ -n "$PROJECT_DIR" ]; then
    echo "Execute these commands:"
    echo ""
    echo "   # Stop containers"
    echo "   cd $PROJECT_DIR"
    echo "   docker-compose -f docker-compose-dokploy.yml down"
    echo ""
    echo "   # Backup (optional)"
    echo "   mv ./volumes/postgres ./volumes/postgres.backup.\$(date +%Y%m%d)"
    echo ""
    echo "   # Remove corrupted volume"
    echo "   rm -rf ./volumes/postgres"
    echo ""
    echo "   # Redeploy in Dokploy dashboard"
    echo ""
    echo "🤖 AUTOMATED FIX: Want me to do this automatically?"
    echo "   Run: bash diagnose-postgres.sh --fix"
  fi
elif docker ps | grep -q startup-mvp-postgres && docker exec startup-mvp-postgres pg_isready -U postgres >/dev/null 2>&1; then
  echo ""
  echo "✅ DIAGNOSIS: DATABASE IS HEALTHY"
  echo ""
  echo "   Database is running and accepting connections."
  echo "   The issue may be with:"
  echo "   - Network connectivity from app container"
  echo "   - Incorrect DATABASE_URL"
  echo "   - Prisma configuration"
  echo ""
  echo "   Check app container environment:"
  echo "   docker exec startup-mvp-app env | grep DATABASE_URL"
else
  echo ""
  echo "⚠️  DIAGNOSIS: DATABASE IS NOT STARTING PROPERLY"
  echo ""
  echo "   Possible causes:"
  echo "   - Insufficient resources (RAM/CPU)"
  echo "   - Port 5432 already in use"
  echo "   - Permission issues"
  echo "   - Corrupted volume"
  echo ""
  echo "   Try removing the volume:"
  if [ -n "$PROJECT_DIR" ]; then
    echo "   cd $PROJECT_DIR && rm -rf ./volumes/postgres"
  else
    echo "   Find project dir and: rm -rf ./volumes/postgres"
  fi
fi

echo ""
echo "══════════════════════════════════════════════════════════════════"

# Check if --fix flag is passed
if [ "$1" = "--fix" ] && [ "$CORRUPTED" = true ] && [ -n "$PROJECT_DIR" ]; then
  echo ""
  echo "🔧 AUTOMATED FIX STARTING..."
  echo ""
  
  read -p "This will delete the database volume. Continue? (yes/no): " CONFIRM
  if [ "$CONFIRM" = "yes" ]; then
    echo "1. Stopping containers..."
    cd "$PROJECT_DIR"
    docker-compose -f docker-compose-dokploy.yml down 2>/dev/null || docker stop startup-mvp-postgres startup-mvp-app startup-mvp-minio
    
    echo "2. Backing up volume..."
    if [ -d "./volumes/postgres" ]; then
      mv ./volumes/postgres ./volumes/postgres.backup.$(date +%Y%m%d_%H%M%S)
      echo "   ✅ Backup created"
    fi
    
    echo "3. Removing corrupted volume..."
    rm -rf ./volumes/postgres
    echo "   ✅ Volume removed"
    
    echo ""
    echo "✅ FIX COMPLETE!"
    echo ""
    echo "Next steps:"
    echo "   1. Go to Dokploy dashboard"
    echo "   2. Click 'Redeploy' button"
    echo "   3. Wait for deployment to complete"
    echo "   4. Check logs for success"
    echo ""
  else
    echo "Fix cancelled."
  fi
fi

echo ""
echo "💡 For more help, see: POSTGRES_TROUBLESHOOTING.md"
echo ""

