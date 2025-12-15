#!/bin/bash

# MinIO Setup Verification Script
# This script verifies that MinIO is properly configured for file uploads

set -e

echo "=================================================="
echo "MinIO Setup Verification"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Docker container running
echo "1. Checking MinIO container status..."
if docker ps | grep -q startup-mvp-minio; then
    echo -e "${GREEN}✓${NC} MinIO container is running"
else
    echo -e "${RED}✗${NC} MinIO container is not running"
    echo "   Run: docker-compose up -d espacio-minio"
    exit 1
fi
echo ""

# Check 2: MinIO health
echo "2. Checking MinIO health endpoint..."
if curl -sf http://localhost:9000/minio/health/live > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} MinIO is healthy and accessible"
else
    echo -e "${RED}✗${NC} MinIO health check failed"
    echo "   Check: docker logs startup-mvp-minio"
    exit 1
fi
echo ""

# Check 3: CORS configuration
echo "3. Checking CORS configuration..."
if docker inspect startup-mvp-minio | grep -q "MINIO_API_CORS_ALLOW_ORIGIN"; then
    echo -e "${GREEN}✓${NC} CORS is configured"
    docker inspect startup-mvp-minio | grep "MINIO_API_CORS_ALLOW_ORIGIN"
else
    echo -e "${RED}✗${NC} CORS is not configured"
    echo "   Add MINIO_API_CORS_ALLOW_ORIGIN: \"*\" to docker-compose.yml"
    exit 1
fi
echo ""

# Check 4: Credentials in .env
echo "4. Checking .env credentials..."
cd startup-mvp
if grep -q "MINIO_SECRET_KEY=minioadmin" .env && grep -q "MINIO_ACCESS_KEY=minioadmin" .env; then
    echo -e "${GREEN}✓${NC} Credentials are correct in .env"
    grep "MINIO_ACCESS_KEY" .env
    grep "MINIO_SECRET_KEY" .env
else
    echo -e "${RED}✗${NC} Credentials mismatch in .env"
    echo "   Should be: MINIO_ACCESS_KEY=minioadmin"
    echo "   Should be: MINIO_SECRET_KEY=minioadmin"
    exit 1
fi
cd ..
echo ""

# Check 5: Bucket exists
echo "5. Checking if bucket exists..."
BUCKET_CHECK=$(docker run --rm --network espacio_app-network --entrypoint /bin/sh minio/mc -c "
  mc alias set myminio http://startup-mvp-minio:9000 minioadmin minioadmin > /dev/null 2>&1 &&
  mc ls myminio/ 2>&1 | grep espacio-files
" || echo "")

if [ -n "$BUCKET_CHECK" ]; then
    echo -e "${GREEN}✓${NC} Bucket 'espacio-files' exists"
    echo "   $BUCKET_CHECK"
else
    echo -e "${YELLOW}⚠${NC} Bucket 'espacio-files' not found"
    echo "   Creating bucket..."
    docker run --rm --network espacio_app-network --entrypoint /bin/sh minio/mc -c "
      mc alias set myminio http://startup-mvp-minio:9000 minioadmin minioadmin &&
      mc mb myminio/espacio-files &&
      mc anonymous set public myminio/espacio-files
    "
    echo -e "${GREEN}✓${NC} Bucket created successfully"
fi
echo ""

# Check 6: Bucket policy
echo "6. Checking bucket policy..."
POLICY_CHECK=$(docker run --rm --network espacio_app-network --entrypoint /bin/sh minio/mc -c "
  mc alias set myminio http://startup-mvp-minio:9000 minioadmin minioadmin > /dev/null 2>&1 &&
  mc anonymous get myminio/espacio-files 2>&1
" || echo "")

if echo "$POLICY_CHECK" | grep -q "public"; then
    echo -e "${GREEN}✓${NC} Bucket policy is set to public"
else
    echo -e "${YELLOW}⚠${NC} Setting bucket policy to public..."
    docker run --rm --network espacio_app-network --entrypoint /bin/sh minio/mc -c "
      mc alias set myminio http://startup-mvp-minio:9000 minioadmin minioadmin &&
      mc anonymous set public myminio/espacio-files
    "
    echo -e "${GREEN}✓${NC} Bucket policy updated"
fi
echo ""

# Check 7: Test upload
echo "7. Testing file upload..."
echo "test content" > /tmp/minio-test-file.txt
UPLOAD_TEST=$(docker run --rm --network espacio_app-network \
  -v /tmp/minio-test-file.txt:/test.txt \
  --entrypoint /bin/sh minio/mc -c "
  mc alias set myminio http://startup-mvp-minio:9000 minioadmin minioadmin > /dev/null 2>&1 &&
  mc cp /test.txt myminio/espacio-files/test-upload.txt 2>&1 &&
  mc rm myminio/espacio-files/test-upload.txt 2>&1
" || echo "FAILED")

if echo "$UPLOAD_TEST" | grep -q "FAILED"; then
    echo -e "${RED}✗${NC} Upload test failed"
    echo "   $UPLOAD_TEST"
    exit 1
else
    echo -e "${GREEN}✓${NC} Upload test successful"
fi
rm /tmp/minio-test-file.txt
echo ""

# Check 8: Dev server status
echo "8. Checking dev server status..."
if ps aux | grep -v grep | grep -q "npm run dev"; then
    echo -e "${YELLOW}⚠${NC} Dev server is running"
    echo "   ${YELLOW}IMPORTANT:${NC} You need to restart the dev server to apply the new credentials"
    echo "   Press Ctrl+C in the terminal running 'npm run dev', then run it again"
else
    echo -e "${GREEN}✓${NC} Dev server is not running (ready to start with new config)"
    echo "   Start with: cd startup-mvp && npm run dev"
fi
echo ""

# Summary
echo "=================================================="
echo "Verification Complete!"
echo "=================================================="
echo ""
echo -e "${GREEN}All checks passed!${NC}"
echo ""
echo "Next steps:"
echo "1. ${YELLOW}Restart your dev server${NC} if it's running:"
echo "   - Stop: Press Ctrl+C"
echo "   - Start: cd startup-mvp && npm run dev"
echo ""
echo "2. Test file upload in your application:"
echo "   - Open http://localhost:3000"
echo "   - Navigate to a page with file upload"
echo "   - Try uploading a file"
echo ""
echo "3. If issues persist, check:"
echo "   - Browser console for errors"
echo "   - Network tab for 403 responses"
echo "   - See MINIO_FIX_SUMMARY.md for troubleshooting"
echo ""
echo "MinIO Console: http://localhost:9001"
echo "Login: minioadmin / minioadmin"
echo ""

