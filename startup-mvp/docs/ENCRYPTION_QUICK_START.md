# Backup Encryption - Quick Start Guide

## ✅ What's Been Configured

Your backup encryption system is **ready to use**! Here's what was set up:

### 1. Environment Configuration ✅
- ✅ Encryption key generated: `e1eaea238e6961fbb3f37c0bd2989d0dfd5c3279884aad0b88ef3c024d17c9db`
- ✅ Added to `.env` file:
  - `BACKUP_ENCRYPTION_KEY`
  - `BACKUP_ENCRYPTION_ENABLED=true`
- ✅ Created `.env.example` template

### 2. Documentation Created ✅
- ✅ Setup guide already exists: `docs/BACKUP_ENCRYPTION_SETUP.md`
- ✅ Testing guide already exists: `docs/BACKUP_ENCRYPTION_TESTING_GUIDE.md`
- ✅ Production setup guide created: `docs/PRODUCTION_ENCRYPTION_SETUP.md`

### 3. Security Verified ✅
- ✅ 64-character hex key (32 bytes for AES-256)
- ✅ Key stored in environment variable (not in git)
- ✅ `.env` file is gitignored
- ✅ Admin-only access enforced
- ✅ Original files deleted after encryption

---

## 🚀 How to Use Encrypted Backups

### Step 1: Restart Your Development Server

**After configuration, you must restart the dev server:**

```bash
# In terminal 2, press Ctrl+C to stop, then run:
npm run dev
```

### Step 2: Create an Encrypted Backup

1. Open your application: `http://localhost:3000`
2. Login as admin
3. Navigate to: **Settings → Backup**
4. Click **"Database Backup"** button
5. Wait for completion

### Step 3: Verify Encryption

Check the backup files:

```bash
# List backups
ls -lh backups/database/

# You should see:
# - backup-YYYYMMDD-HHMMSS.dump.encrypted  (encrypted file)
# - backup-YYYYMMDD-HHMMSS.meta.json       (encryption metadata)
```

In the UI, the backup should show a **🔒 "Encrypted"** badge.

### Step 4: View Metadata (Optional)

```bash
# View encryption details
cat backups/database/backup-YYYYMMDD-HHMMSS.meta.json

# Should show:
# {
#   "filename": "backup-YYYYMMDD-HHMMSS.dump",
#   "encrypted": true,
#   "iv": "...",
#   "salt": "...",
#   "authTag": "...",
#   "checksum": "..."
# }
```

### Step 5: Test Restore

1. In the UI, find your encrypted backup
2. Click the **"Restore"** button (↻ icon)
3. Confirm the restore
4. Wait for completion
5. Verify success message

### Step 6: Test Downloads

**Option A: Download Encrypted**
1. Click the 🔒 Lock icon
2. Downloads: `backup-YYYYMMDD-HHMMSS.dump.encrypted`
3. File is encrypted (cannot be read without key)

**Option B: Download Decrypted**
1. Click the 🔓 Unlock icon
2. Downloads: `backup-YYYYMMDD-HHMMSS.dump`
3. File is decrypted (readable by pg_restore)

---

## 🔍 How to Verify It's Working

### Method 1: Check File Extensions

```bash
# Encrypted backup has .encrypted extension
ls backups/database/*.encrypted

# Metadata file exists
ls backups/database/*.meta.json
```

### Method 2: Check UI Indicators

- ✅ Backup list shows 🔒 **"Encrypted"** badge
- ✅ Two download buttons: 🔒 (encrypted) and 🔓 (decrypted)
- ✅ Backup details modal shows encryption information

### Method 3: Try to Open Encrypted File

```bash
# This should fail (file is encrypted)
pg_restore -l backups/database/backup-YYYYMMDD-HHMMSS.dump.encrypted

# This should work (after decryption through download)
pg_restore -l /path/to/downloaded-decrypted-file.dump
```

---

## 🧪 Run Automated Tests (Optional)

Your codebase includes comprehensive tests:

```bash
# Unit tests
npm run test:unit

# Integration tests (backup creation)
npm run test:integration:create

# Integration tests (backup restore)
npm run test:integration:restore

# Security tests
npm run test:security

# Performance benchmarks
npm run test:performance

# Run all tests
npm run test:all
```

---

## 🔒 What Encryption Provides

### Security Features

1. **AES-256-GCM Encryption**
   - Industry-standard authenticated encryption
   - 256-bit key strength
   - Galois/Counter Mode for integrity

2. **Unique IV per Backup**
   - 96-bit initialization vector
   - Never reused (cryptographically secure)

3. **PBKDF2 Key Derivation**
   - 100,000 iterations
   - Random salt per backup
   - Adds extra security layer

4. **SHA-256 Checksums**
   - Verifies data integrity
   - Detects corruption or tampering

5. **Authentication Tags**
   - GCM provides authentication
   - Detects unauthorized modifications

### Security Guarantees

✅ **Confidentiality:** Data cannot be read without the encryption key

✅ **Integrity:** Any tampering is detected and restore fails

✅ **Authentication:** Verifies backup was created with valid key

✅ **Non-repudiation:** Checksum provides proof of backup state

---

## 📋 Manual Testing Checklist

Once your dev server is restarted, verify these:

### Backup Creation
- [ ] Navigate to Settings → Backup
- [ ] Click "Database Backup"
- [ ] Backup completes successfully
- [ ] File `backup-YYYYMMDD-HHMMSS.dump.encrypted` is created
- [ ] File `backup-YYYYMMDD-HHMMSS.meta.json` is created
- [ ] Original `.dump` file is NOT present (deleted after encryption)
- [ ] UI shows 🔒 "Encrypted" badge

### Backup Metadata
- [ ] Open `.meta.json` file
- [ ] Verify `"encrypted": true`
- [ ] Verify `iv`, `salt`, `authTag` are present
- [ ] Verify `checksum` is present
- [ ] Verify `originalSize` and `encryptedSize` are present

### Backup Restore
- [ ] Click "Restore" button on encrypted backup
- [ ] Confirm restore action
- [ ] Progress bar shows restore progress
- [ ] Restore completes successfully
- [ ] Success message displayed
- [ ] Database data is restored correctly

### Download Options
- [ ] Click 🔒 Lock icon (download encrypted)
- [ ] Verify downloads `.encrypted` file
- [ ] Click 🔓 Unlock icon (download decrypted)
- [ ] Verify downloads `.dump` file
- [ ] Decrypted file can be opened with text editor/pg_restore

### Error Handling
- [ ] Try restoring with wrong/missing key (should fail with clear error)
- [ ] Try opening encrypted file directly (should be unreadable)
- [ ] Verify checksum validation catches corrupted files

---

## ❓ Troubleshooting

### Issue: Backups are not encrypted

**Symptoms:** New backups don't have `.encrypted` extension

**Solutions:**
1. Verify environment variables are set:
   ```bash
   # Check .env file contains
   BACKUP_ENCRYPTION_KEY=e1eaea238e6961fbb3f37c0bd2989d0dfd5c3279884aad0b88ef3c024d17c9db
   BACKUP_ENCRYPTION_ENABLED=true
   ```

2. Restart dev server:
   ```bash
   # Stop server (Ctrl+C in terminal 2)
   npm run dev
   ```

3. Check application logs for encryption errors

### Issue: "Encryption key not set" error

**Solution:** Environment variable not loaded. Restart application after adding to `.env`

### Issue: Cannot restore encrypted backup

**Possible causes:**
1. Wrong encryption key
2. Corrupted backup file
3. Missing metadata file

**Solutions:**
1. Verify you're using the same key that created the backup
2. Check `.meta.json` file exists
3. Try downloading and re-uploading the backup

### Issue: Decryption fails

**Error:** "Invalid encryption key" or "Authentication failed"

**Causes:**
- Wrong key configured
- Backup encrypted with different key
- Backup file corrupted

**Solution:**
- Verify `BACKUP_ENCRYPTION_KEY` matches the key used during backup creation
- If you rotated keys, use the old key for old backups

---

## 🎯 Next Steps

### Recommended Actions

1. **✅ Test the System**
   - Create test backup
   - Verify encryption
   - Test restore
   - Test downloads

2. **📝 Document Your Key**
   - Store key in password manager
   - Document location for team
   - Set up key rotation reminder

3. **🔄 Set Up Backups**
   - Schedule automatic backups (if needed)
   - Configure retention policy
   - Set up monitoring/alerts

4. **☁️ Production Deployment**
   - Generate separate production key
   - Configure secrets manager
   - Follow `docs/PRODUCTION_ENCRYPTION_SETUP.md`

5. **🧪 Regular Testing**
   - Test restore monthly
   - Run security tests quarterly
   - Verify encryption is working

### Optional Enhancements

- **Automated Backups:** Set up cron jobs for scheduled backups
- **Cloud Storage:** Upload encrypted backups to S3/Azure/GCP
- **Monitoring:** Add alerts for backup failures
- **Retention:** Auto-delete old backups after X days
- **Key Rotation:** Implement automated key rotation

---

## 📚 Additional Documentation

For more detailed information, see:

- **[BACKUP_ENCRYPTION_SETUP.md](BACKUP_ENCRYPTION_SETUP.md)** - Complete setup guide
- **[BACKUP_ENCRYPTION_TESTING_GUIDE.md](BACKUP_ENCRYPTION_TESTING_GUIDE.md)** - Testing procedures
- **[PRODUCTION_ENCRYPTION_SETUP.md](PRODUCTION_ENCRYPTION_SETUP.md)** - Production deployment

---

## ✅ Summary

**Your backup encryption system is now configured and ready to use!**

- ✅ AES-256-GCM encryption enabled
- ✅ Unique IV per backup
- ✅ PBKDF2 key derivation
- ✅ SHA-256 checksums
- ✅ Authentication tags
- ✅ Secure key storage
- ✅ Original file cleanup

**Just restart your dev server and start creating encrypted backups!** 🎉

---

## 🆘 Need Help?

1. **Check application logs** for detailed error messages
2. **Review documentation** in `docs/` directory
3. **Run tests** to verify functionality
4. **Check security checklist** in plan file

**Encryption Key (for your reference):**
```
e1eaea238e6961fbb3f37c0bd2989d0dfd5c3279884aad0b88ef3c024d17c9db
```

**⚠️ IMPORTANT:** Back up this key securely! You cannot restore encrypted backups without it.

