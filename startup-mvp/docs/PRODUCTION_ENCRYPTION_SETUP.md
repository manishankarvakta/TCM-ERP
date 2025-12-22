# Production Encryption Setup Guide

This guide explains how to configure backup encryption for production deployment.

## 🔐 Generate Production Encryption Key

**IMPORTANT:** Use a different key for production than development!

```bash
# Generate a new production key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Save this key securely** - you'll need it to restore any backups created in production.

---

## 🚀 Deployment Platform Configuration

### Docker Compose

Add to your `docker-compose.yml` or `docker-compose.prod.yml`:

```yaml
services:
  app:
    environment:
      # Backup Encryption
      BACKUP_ENCRYPTION_KEY: ${BACKUP_ENCRYPTION_KEY}
      BACKUP_ENCRYPTION_ENABLED: true
```

Then set the environment variable:

```bash
# In your server or CI/CD pipeline
export BACKUP_ENCRYPTION_KEY="your-production-key-here"

# Or use a .env.production file (NOT committed to git)
echo "BACKUP_ENCRYPTION_KEY=your-production-key-here" > .env.production
docker-compose --env-file .env.production up -d
```

---

### Kubernetes

Create a Secret:

```bash
# Create the secret
kubectl create secret generic backup-encryption-secret \
  --from-literal=encryption-key='your-production-key-here'
```

Reference in your Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: your-app
spec:
  template:
    spec:
      containers:
      - name: app
        env:
        - name: BACKUP_ENCRYPTION_KEY
          valueFrom:
            secretKeyRef:
              name: backup-encryption-secret
              key: encryption-key
        - name: BACKUP_ENCRYPTION_ENABLED
          value: "true"
```

---

### Vercel

1. Go to your project settings
2. Navigate to Environment Variables
3. Add:
   - **Name:** `BACKUP_ENCRYPTION_KEY`
   - **Value:** `your-production-key-here`
   - **Environment:** Production
   - ✅ Mark as "Sensitive"
4. Add:
   - **Name:** `BACKUP_ENCRYPTION_ENABLED`
   - **Value:** `true`
   - **Environment:** Production

---

### Railway

1. Go to your project
2. Click on "Variables" tab
3. Add:
   ```
   BACKUP_ENCRYPTION_KEY=your-production-key-here
   BACKUP_ENCRYPTION_ENABLED=true
   ```
4. Deploy the changes

---

### AWS (EC2, ECS, etc.)

#### Using AWS Systems Manager Parameter Store:

```bash
# Store the encryption key
aws ssm put-parameter \
  --name "/myapp/backup-encryption-key" \
  --value "your-production-key-here" \
  --type "SecureString" \
  --tier "Standard"
```

Then in your application startup script:

```bash
#!/bin/bash
export BACKUP_ENCRYPTION_KEY=$(aws ssm get-parameter \
  --name "/myapp/backup-encryption-key" \
  --with-decryption \
  --query "Parameter.Value" \
  --output text)

export BACKUP_ENCRYPTION_ENABLED=true

npm start
```

#### Using AWS Secrets Manager:

```bash
# Create secret
aws secretsmanager create-secret \
  --name backup-encryption-key \
  --secret-string "your-production-key-here"
```

---

### Azure

#### Using Azure Key Vault:

```bash
# Create key vault (if not exists)
az keyvault create --name myapp-keyvault --resource-group myResourceGroup

# Store the encryption key
az keyvault secret set \
  --vault-name myapp-keyvault \
  --name backup-encryption-key \
  --value "your-production-key-here"
```

Reference in your app:

```bash
export BACKUP_ENCRYPTION_KEY=$(az keyvault secret show \
  --name backup-encryption-key \
  --vault-name myapp-keyvault \
  --query value -o tsv)

export BACKUP_ENCRYPTION_ENABLED=true
```

---

### Google Cloud Platform

#### Using Secret Manager:

```bash
# Create the secret
echo -n "your-production-key-here" | \
  gcloud secrets create backup-encryption-key --data-file=-

# Grant access to your service account
gcloud secrets add-iam-policy-binding backup-encryption-key \
  --member="serviceAccount:your-service-account@project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Reference in Cloud Run or App Engine:

```yaml
# app.yaml
env_variables:
  BACKUP_ENCRYPTION_ENABLED: "true"

# Use Secret Manager in Cloud Run
gcloud run deploy your-app \
  --set-secrets BACKUP_ENCRYPTION_KEY=backup-encryption-key:latest
```

---

## 🔄 Key Rotation Schedule

### Recommended Rotation Schedule

- **Every 90 days** for standard security
- **Every 30 days** for high-security environments
- **Immediately** if key may have been compromised

### Rotation Procedure

1. **Generate new key:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Keep old key accessible** (to restore old backups)

3. **Update production environment** with new key

4. **Restart application** to use new key

5. **Create test backup** to verify new key works

6. **Document key version** and rotation date

7. **Store old key securely** (labeled with version/date)

---

## 📋 Production Checklist

Before going live with encryption in production:

- [ ] Generated unique production encryption key (different from dev)
- [ ] Stored key in secrets manager (not in git or plain text)
- [ ] Set `BACKUP_ENCRYPTION_ENABLED=true`
- [ ] Set `BACKUP_ENCRYPTION_KEY` in production environment
- [ ] Verified `.env` is in `.gitignore`
- [ ] Tested backup creation (encrypted file should be created)
- [ ] Tested backup restoration (encrypted backup should restore)
- [ ] Documented key location for disaster recovery
- [ ] Set up key rotation reminder (90 days)
- [ ] Configured backup retention policy
- [ ] Set up monitoring/alerts for backup failures
- [ ] Tested encryption with production-size data
- [ ] Verified checksums are validating correctly

---

## 🛡️ Security Best Practices

### 1. Key Management

✅ **DO:**
- Use different keys for dev/staging/production
- Store keys in secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
- Rotate keys every 90 days
- Back up keys securely (encrypted password manager)
- Use strong, randomly generated keys (32 bytes)

❌ **DON'T:**
- Store keys in git repositories
- Share keys via email, Slack, or other insecure channels
- Use the same key across environments
- Hard-code keys in application code
- Store keys in plain text files on servers

### 2. Access Control

✅ **DO:**
- Limit access to encryption keys to authorized personnel only
- Use role-based access control (RBAC) for secrets
- Audit key access and usage
- Implement least privilege principle
- Use service accounts for automated processes

❌ **DON'T:**
- Share production keys with developers
- Grant broad access to secrets
- Store keys in shared team drives
- Use personal accounts for production key access

### 3. Backup Storage

✅ **DO:**
- Store encrypted backups off-site (different cloud region)
- Implement versioning for backup files
- Set up retention policies (e.g., keep 30 days)
- Monitor backup storage usage
- Test restore procedures regularly

❌ **DON'T:**
- Store backups in the same location as the database
- Keep backups indefinitely without review
- Skip testing restore procedures
- Ignore backup failure alerts

### 4. Monitoring & Alerting

✅ **DO:**
- Set up alerts for backup failures
- Monitor encryption/decryption performance
- Track backup file sizes over time
- Alert on missing scheduled backups
- Log all backup operations

❌ **DON'T:**
- Assume backups are working without verification
- Ignore performance degradation
- Skip regular backup audits

---

## 🚨 Disaster Recovery

### If Production Key is Lost

If you lose the production encryption key, **you cannot restore encrypted backups**. To prevent this:

1. **Store keys in multiple secure locations:**
   - Primary: Secrets manager (AWS, Azure, GCP)
   - Secondary: Encrypted password manager (1Password, Bitwarden)
   - Tertiary: Encrypted USB drive in physical safe

2. **Document key locations:**
   - Create disaster recovery document
   - List all key storage locations
   - Include access procedures
   - Store document securely

3. **Test recovery procedures:**
   - Quarterly: Verify keys can be retrieved
   - Annually: Perform full disaster recovery drill
   - After key rotation: Verify old keys are accessible

### If Key is Compromised

If you suspect the encryption key has been compromised:

1. **Immediately rotate key** (follow rotation procedure above)
2. **Create new backup** with new key
3. **Audit access logs** to determine scope of breach
4. **Review backup files** for unauthorized access
5. **Consider re-encrypting old backups** with new key (if possible)
6. **Document incident** for security review

---

## 📊 Monitoring Queries

### Check Encryption Status

```bash
# Check if encryption is enabled
echo "BACKUP_ENCRYPTION_ENABLED: $BACKUP_ENCRYPTION_ENABLED"

# Verify key is set (don't print the actual key!)
if [ -n "$BACKUP_ENCRYPTION_KEY" ]; then
  echo "✅ Encryption key is set"
else
  echo "❌ Encryption key is NOT set"
fi
```

### Verify Encrypted Backups

```bash
# List encrypted backups
ls -lh backups/database/*.encrypted

# Check metadata files
ls -lh backups/database/*.meta.json

# Count encrypted vs unencrypted
echo "Encrypted backups: $(ls backups/database/*.encrypted 2>/dev/null | wc -l)"
echo "Unencrypted backups: $(ls backups/database/*.dump 2>/dev/null | wc -l)"
```

---

## 🔗 Additional Resources

- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [Azure Key Vault Best Practices](https://docs.microsoft.com/en-us/azure/key-vault/general/best-practices)
- [GCP Secret Manager Best Practices](https://cloud.google.com/secret-manager/docs/best-practices)
- [NIST Key Management Guidelines](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)

---

## ✅ Success Criteria

Production encryption is properly configured when:

- ✅ Unique production encryption key generated
- ✅ Key stored in secrets manager (not in code)
- ✅ Environment variables set correctly
- ✅ New backups are encrypted (`.encrypted` files created)
- ✅ Metadata files (`.meta.json`) are created
- ✅ UI shows 🔒 "Encrypted" badge in production
- ✅ Encrypted backups can be restored successfully
- ✅ Original unencrypted files are deleted after encryption
- ✅ Key rotation schedule documented
- ✅ Disaster recovery procedures documented
- ✅ Monitoring and alerts configured

---

**🎉 Congratulations!** Your production backup encryption is now configured securely.

Remember to:
- Test backups regularly
- Rotate keys on schedule
- Monitor for failures
- Document procedures
- Keep keys backed up securely

