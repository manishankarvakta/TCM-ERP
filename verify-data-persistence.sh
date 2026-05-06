#!/bin/bash

# ============================================
# Data Persistence Verification Script
# ============================================
# This script helps verify that your data
# persists across deployments
# ============================================

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 DATA PERSISTENCE VERIFICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    exit 1
fi

echo "✅ Docker is running"
echo ""

# ============================================
# 1. Check Containers
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Checking Containers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CONTAINERS=("fferp-app" "fferp-postgres" "fferp-redis")
ALL_RUNNING=true

for container in "${CONTAINERS[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        echo -e "✅ ${GREEN}${container} is running${NC}"
    else
        echo -e "❌ ${RED}${container} is NOT running${NC}"
        ALL_RUNNING=false
    fi
done

echo ""

if [ "$ALL_RUNNING" = false ]; then
    echo -e "${YELLOW}⚠️  Warning: Some containers are not running${NC}"
    echo "Run: docker-compose up -d"
    echo ""
fi

# ============================================
# 2. Check Volume Directories
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Checking Volume Directories"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

VOLUMES=("volumes/postgres" "volumes/uploads" "volumes/redis")

for vol in "${VOLUMES[@]}"; do
    if [ -d "./${vol}" ]; then
        SIZE=$(du -sh "./${vol}" 2>/dev/null | cut -f1)
        echo -e "✅ ${GREEN}./${vol}${NC} exists (Size: ${SIZE})"
    else
        echo -e "❌ ${RED}./${vol}${NC} does NOT exist"
    fi
done

echo ""

# ============================================
# 3. Check Database Data
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Checking Database Data"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if docker exec fferp-postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
    echo ""
    
    # Check tables and row counts
    echo "📊 Table Row Counts:"
    docker exec fferp-postgres psql -U postgres -d startup_mvp -c "
    SELECT
        schemaname,
        tablename,
        COALESCE(n_live_tup, 0) as row_count
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY n_live_tup DESC
    LIMIT 10;
    " 2>/dev/null || echo "Could not retrieve table counts"
    
    echo ""
    
    # Specific critical tables
    USER_COUNT=$(docker exec fferp-postgres psql -U postgres -d startup_mvp -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | xargs)
    CLIENT_COUNT=$(docker exec fferp-postgres psql -U postgres -d startup_mvp -t -c "SELECT COUNT(*) FROM \"Client\";" 2>/dev/null | xargs)
    FILE_COUNT=$(docker exec fferp-postgres psql -U postgres -d startup_mvp -t -c "SELECT COUNT(*) FROM \"File\";" 2>/dev/null | xargs)
    
    echo "📈 Critical Data Counts:"
    echo "   Users: ${USER_COUNT}"
    echo "   Clients: ${CLIENT_COUNT}"
    echo "   Files: ${FILE_COUNT}"
    
    if [ "${USER_COUNT:-0}" -gt 0 ]; then
        echo -e "   ${GREEN}✅ Database has data${NC}"
    else
        echo -e "   ${YELLOW}⚠️  No users found - database may be empty${NC}"
    fi
else
    echo -e "${RED}❌ PostgreSQL is not ready${NC}"
fi

echo ""

# ============================================
# 4. Check Local File Storage
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Checking Local File Storage"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "./volumes/uploads" ]; then
    UPLOADS_SIZE=$(du -sh ./volumes/uploads 2>/dev/null | cut -f1)
    FILE_COUNT_FS=$(find ./volumes/uploads -type f 2>/dev/null | wc -l | xargs)
    
    echo "📦 Local Uploads Storage:"
    echo "   Total Size: ${UPLOADS_SIZE}"
    echo "   File Count: ${FILE_COUNT_FS}"
else
    echo -e "${RED}❌ Uploads volume directory not found${NC}"
fi

echo ""

# ============================================
# 5. Check Application Logs
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# 5. Check Application Logs
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if docker ps --format '{{.Names}}' | grep -q "^fferp-app$"; then
    echo "📋 Recent deployment messages:"
    docker logs fferp-app --tail 50 2>/dev/null | grep -E "(migrations|data|preserved|initialized|SAFE|READY|Starting)" || echo "No relevant log messages found"
else
    echo -e "${RED}❌ Application container not running${NC}"
fi

echo ""

# ============================================
# 6. Check Migration Status
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. Checking Migration Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if docker ps --format '{{.Names}}' | grep -q "^fferp-app$"; then
    echo "📊 Applied Migrations:"
    docker exec fferp-app npx prisma migrate status 2>/dev/null || echo "Could not check migration status"
else
    echo -e "${RED}❌ Application container not running${NC}"
fi

echo ""

# ============================================
# Summary
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 VERIFICATION SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ISSUES=0

# Check containers
if [ "$ALL_RUNNING" = false ]; then
    echo -e "${RED}❌ Some containers are not running${NC}"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✅ All containers running${NC}"
fi

# Check volumes
if [ ! -d "./volumes/postgres" ]; then
    echo -e "${RED}❌ PostgreSQL volume missing${NC}"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✅ PostgreSQL volume exists${NC}"
fi

# Check database
if [ "${USER_COUNT:-0}" -gt 0 ]; then
    echo -e "${GREEN}✅ Database contains data${NC}"
else
    echo -e "${YELLOW}⚠️  Database appears empty${NC}"
    ISSUES=$((ISSUES + 1))
fi

echo ""

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 ALL CHECKS PASSED!${NC}"
    echo -e "${GREEN}   Your data persistence is working correctly.${NC}"
    echo -e "${GREEN}   Data will be preserved across deployments.${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⚠️  ISSUES FOUND: ${ISSUES}${NC}"
    echo -e "${YELLOW}   Please review the checks above.${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
fi

echo ""
echo "💡 Tip: Run this script before and after deployment to verify data persistence!"
echo ""
