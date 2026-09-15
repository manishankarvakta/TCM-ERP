# Backup Encryption Setup Guide

This guide explains how to set up and use encrypted backups in the application.

## Overview

The backup system now supports AES-256-GCM encryption for all backup types:
- Database backups (`.sql` files)
- Files backups (`.zip` files)
- Full backups (`.zip` files containing both)

## Configuration

### Step 1: Generate Encryption Key

Generate a secure 256-bit (32-byte) encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This will output a 64-character hexadecimal string. **Save this key securely** - you'll need it to restore encrypted backups.

### Step 2: Add Environment Variables

Add the following to your `.env` file:

```env
# Backup Encryption
BACKUP_ENCRYPTION_KEY=<your-64-character-hex-key>
BACKUP_ENCRYPTION_ENABLED=true
```

**Important Security Notes:**
- Never commit the encryption key to version control
- Store the key in a secure location (password manager, secrets manager)
- Use different keys for development and production
- Rotate keys periodically (every 90 days recommended)

### Step 3: Restart Application

After adding the environment variables, restart your application:

```bash
# Development
npm run dev

# Production (Docker)
docker-compose restart
```

## How It Works

### Backup Creation Flow

1. **Create Backup** → System generates backup file (SQL or ZIP)
2. **Encrypt Backup** → If encryption is enabled:
   - Generates unique IV (Initialization Vector) for this backup
   - Generates random salt for key derivation
   - Encrypts data using AES-256-GCM
   - Calculates SHA-256 checksum
   - Saves encrypted file with `.encrypted` extension
   - Saves metadata file (`.meta.json`) with encryption details
   - **Deletes original unencrypted file** (security: only encrypted version remains)
3. **Store Metadata** → Encryption metadata saved for restore

### Restore Flow

1. **Detect Encryption** → System checks for `.meta.json` file
2. **Load Metadata** → Retrieves IV, salt, auth tag, checksum
3. **Decrypt Backup** → Decrypts using encryption key
4. **Verify Checksum** → Validates data integrity
5. **Restore Data** → Proceeds with normal restore process

## Usage

### Creating Encrypted Backups

Encrypted backups are created automatically when `BACKUP_ENCRYPTION_ENABLED=true`:

1. Go to Settings → Backup
2. Click "Database Backup", "Files Backup", or "Full Backup"
3. The backup will be encrypted automatically
4. Only the encrypted version is stored (original is deleted)

### Restoring Encrypted Backups

Restoring encrypted backups works the same as unencrypted backups:

1. Go to Settings → Backup
2. Select an encrypted backup from the list
3. Click "Restore"
4. The system will automatically decrypt and restore

**Note:** You must have the correct `BACKUP_ENCRYPTION_KEY` configured to restore encrypted backups.

### Downloading Backups

**Download Encrypted:**
- Default behavior: Downloads encrypted backup file
- File extension: `.sql.encrypted` or `.zip.encrypted`
- Requires decryption before use

**Download Decrypted:**
- Use "Download Decrypted" option (if available in UI)
- Downloads unencrypted backup file
- Can be used directly without decryption

## Backup File Structure

### Encrypted Backup Files

```
backups/
├── database/
│   ├── backup-20251221-161930.sql.encrypted  # Encrypted backup
│   └── backup-20251221-161930.meta.json     # Encryption metadata
├── files/
│   └── backup-20251221-161930.zip.encrypted
└── full/
    └── backup-20251221-161930.zip.encrypted
```

### Metadata File Format

```json
{
  "filename": "backup-20251221-161930.sql",
  "type": "database",
  "encrypted": true,
  "encryptionVersion": 1,
  "keyVersion": 1,
  "iv": "base64-encoded-iv",
  "salt": "base64-encoded-salt",
  "authTag": "base64-encoded-auth-tag",
  "checksum": "sha256-checksum-of-original-data",
  "originalSize": 1234567,
  "encryptedSize": 1234583,
  "createdAt": "2025-12-21T16:19:30.000Z"
}
```

## Security Features

### Encryption Algorithm
- **Algorithm:** AES-256-GCM (Galois/Counter Mode)
- **Key Size:** 256 bits (32 bytes)
- **IV Size:** 96 bits (12 bytes)
- **Auth Tag:** 128 bits (16 bytes)

### Key Derivation
- **Method:** PBKDF2
- **Hash:** SHA-256
- **Iterations:** 100,000
- **Salt:** Random 128-bit salt per backup

### Integrity Verification
- **Checksum:** SHA-256 of original data
- **Authentication:** GCM authentication tag
- **Verification:** Automatic on restore

## Troubleshooting

### Error: "BACKUP_ENCRYPTION_KEY environment variable is not set"

**Solution:** Add `BACKUP_ENCRYPTION_KEY` to your `.env` file and restart the application.

### Error: "BACKUP_ENCRYPTION_KEY must be a 64-character hexadecimal string"

**Solution:** Generate a new key using the command in Step 1. The key must be exactly 64 hex characters.

### Error: "Decryption failed: Invalid encryption key"

**Possible Causes:**
1. Wrong encryption key configured
2. Backup was encrypted with a different key
3. Key was changed after backup was created

**Solution:** 
- Verify the encryption key matches the one used to create the backup
- If key was rotated, use the old key to restore, then create new backups with new key

### Error: "Checksum verification failed"

**Possible Causes:**
1. Backup file was corrupted
2. Backup file was tampered with
3. File transfer error

**Solution:**
- Re-download the backup file
- Verify file integrity
- Try restoring from a different backup

### Encrypted Backups Not Being Created

**Check:**
1. `BACKUP_ENCRYPTION_ENABLED=true` in `.env`
2. `BACKUP_ENCRYPTION_KEY` is set and valid
3. Application was restarted after adding environment variables
4. Check application logs for encryption errors

## Key Rotation

### When to Rotate Keys

- Every 90 days (recommended)
- After security incident
- When key may have been compromised
- As part of security audit

### Key Rotation Procedure

1. **Create Final Backups with Old Key**
   - Create backups with current key
   - Verify backups can be restored
   - Store backups securely

2. **Generate New Key**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Update Environment Variable**
   ```env
   BACKUP_ENCRYPTION_KEY=<new-64-character-hex-key>
   ```

4. **Restart Application**
   ```bash
   docker-compose restart
   ```

5. **Create New Backups**
   - New backups will use the new key
   - Old backups still require old key to restore

6. **Archive Old Key**
   - Store old key securely (you may need it to restore old backups)
   - Mark old key as deprecated
   - Set reminder to delete old key after retention period

### Restoring with Old Key

If you need to restore an old backup encrypted with a previous key:

1. Temporarily set `BACKUP_ENCRYPTION_KEY` to the old key
2. Restore the backup
3. Update key back to current key
4. Create new backup with current key

## Best Practices

1. **Key Storage**
   - Use secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
   - Never commit keys to version control
   - Use different keys for dev/staging/production

2. **Backup Storage**
   - Store encrypted backups in secure location
   - Use separate storage for backups and encryption keys
   - Implement backup retention policy

3. **Access Control**
   - Limit access to backup files
   - Use file system permissions
   - Audit backup access logs

4. **Testing**
   - Test restore process regularly
   - Verify encrypted backups can be restored
   - Test key rotation procedure

5. **Documentation**
   - Document key location and access
   - Maintain key rotation schedule
   - Document restore procedures

## Backward Compatibility

- **Unencrypted backups** can still be restored
- System automatically detects encrypted vs unencrypted backups
- No changes needed to restore existing unencrypted backups

## Support

For issues or questions:
1. Check application logs for detailed error messages
2. Verify environment variables are set correctly
3. Test with a small backup first
4. Contact system administrator if key is lost


