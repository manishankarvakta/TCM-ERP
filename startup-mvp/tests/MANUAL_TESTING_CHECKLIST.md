# Manual Testing Checklist for Encrypted Backups

This checklist should be completed before deploying encrypted backups to production.

## Prerequisites

- [ ] Encryption key generated and stored securely
- [ ] Environment variables configured
- [ ] Application restarted after configuration
- [ ] Test database with sample data available
- [ ] MinIO running (for files/full backup tests)

## Configuration Tests

### Environment Setup
- [ ] `BACKUP_ENCRYPTION_KEY` is set (64 hex characters)
- [ ] `BACKUP_ENCRYPTION_ENABLED=true` is set
- [ ] Application starts without errors
- [ ] No encryption key errors in logs

### Key Validation
- [ ] Invalid key format is rejected
- [ ] Missing key shows appropriate error
- [ ] Valid key is accepted

## Backup Creation Tests

### Database Backup
- [ ] Create database backup via UI
- [ ] Verify `.encrypted` file is created
- [ ] Verify `.meta.json` file is created
- [ ] Verify original `.sql` file is deleted
- [ ] Check backup appears in backup list
- [ ] Verify encryption status is shown in UI

### Files Backup
- [ ] Create files backup via UI
- [ ] Verify `.encrypted` file is created
- [ ] Verify `.meta.json` file is created
- [ ] Verify original `.zip` file is deleted
- [ ] Check backup appears in backup list

### Full Backup
- [ ] Create full backup via UI
- [ ] Verify `.encrypted` file is created
- [ ] Verify `.meta.json` file is created
- [ ] Verify original `.zip` file is deleted
- [ ] Check backup appears in backup list

## Backup Restore Tests

### Encrypted Database Backup
- [ ] Select encrypted database backup
- [ ] Click "Restore" button
- [ ] Verify restore completes successfully
- [ ] Verify data is restored correctly
- [ ] Check database records match original

### Encrypted Files Backup
- [ ] Select encrypted files backup
- [ ] Click "Restore" button
- [ ] Verify restore completes successfully
- [ ] Verify files are restored to MinIO
- [ ] Check file count matches original

### Encrypted Full Backup
- [ ] Select encrypted full backup
- [ ] Click "Restore" button
- [ ] Verify restore completes successfully
- [ ] Verify database is restored
- [ ] Verify files are restored
- [ ] Check data integrity

## Download Tests

### Encrypted Backup Download
- [ ] Download encrypted backup
- [ ] Verify file has `.encrypted` extension
- [ ] Verify file cannot be opened without decryption
- [ ] Verify file size is reasonable

### Decrypted Backup Download (if implemented)
- [ ] Download decrypted backup
- [ ] Verify file can be opened
- [ ] Verify file content is correct
- [ ] Verify file size matches original

## Upload and Restore Tests

### Encrypted Backup Upload
- [ ] Upload encrypted `.sql.encrypted` file
- [ ] Verify file is detected as encrypted
- [ ] Verify restore completes successfully
- [ ] Verify data is restored correctly

### Encrypted ZIP Upload
- [ ] Upload encrypted `.zip.encrypted` file
- [ ] Verify file is detected as encrypted
- [ ] Verify restore completes successfully
- [ ] Verify data is restored correctly

## Backward Compatibility Tests

### Unencrypted Backup Restore
- [ ] Create unencrypted backup (disable encryption)
- [ ] Enable encryption
- [ ] Restore unencrypted backup
- [ ] Verify restore works correctly
- [ ] Verify no errors occur

### Mixed Backup Types
- [ ] List backups with both encrypted and unencrypted
- [ ] Verify both types are shown correctly
- [ ] Verify encryption status is accurate
- [ ] Restore both types successfully

## Error Handling Tests

### Wrong Encryption Key
- [ ] Change `BACKUP_ENCRYPTION_KEY` to wrong value
- [ ] Attempt to restore encrypted backup
- [ ] Verify appropriate error message
- [ ] Verify restore fails gracefully

### Missing Metadata
- [ ] Manually delete `.meta.json` file
- [ ] Attempt to restore encrypted backup
- [ ] Verify appropriate error handling
- [ ] Verify graceful degradation

### Corrupted Backup
- [ ] Manually corrupt encrypted backup file
- [ ] Attempt to restore
- [ ] Verify authentication error
- [ ] Verify appropriate error message

### Missing Backup File
- [ ] Delete encrypted backup file
- [ ] Attempt to restore
- [ ] Verify "file not found" error
- [ ] Verify graceful error handling

## Security Validation

### Key Security
- [ ] Verify encryption key is not in logs
- [ ] Verify encryption key is not in backup files
- [ ] Verify encryption key is not exposed in errors
- [ ] Verify encryption key is not in metadata files

### File Security
- [ ] Verify original unencrypted files are deleted
- [ ] Verify encrypted files cannot be read as plain text
- [ ] Verify metadata files don't contain sensitive data
- [ ] Verify file permissions are correct

### Checksum Validation
- [ ] Verify checksum is calculated correctly
- [ ] Verify checksum is stored in metadata
- [ ] Verify checksum is validated on restore
- [ ] Verify tampered files are detected

## Performance Tests

### Small Backup (< 1 MB)
- [ ] Create encrypted backup
- [ ] Measure time: < 5 seconds
- [ ] Restore encrypted backup
- [ ] Measure time: < 5 seconds

### Medium Backup (1-10 MB)
- [ ] Create encrypted backup
- [ ] Measure time: < 30 seconds
- [ ] Restore encrypted backup
- [ ] Measure time: < 30 seconds

### Large Backup (> 10 MB)
- [ ] Create encrypted backup
- [ ] Measure time: < 2 minutes
- [ ] Restore encrypted backup
- [ ] Measure time: < 2 minutes
- [ ] Verify memory usage is acceptable

## UI/UX Tests

### Backup List
- [ ] Encrypted backups show encryption indicator
- [ ] Encryption status is clearly visible
- [ ] Checksum is displayed (if implemented)
- [ ] File sizes are accurate

### Backup Actions
- [ ] Download button works for encrypted backups
- [ ] Restore button works for encrypted backups
- [ ] Delete button works for encrypted backups
- [ ] Progress indicators work during encryption

### Error Messages
- [ ] Error messages are user-friendly
- [ ] Error messages don't expose sensitive data
- [ ] Error messages provide actionable guidance
- [ ] Error messages are logged appropriately

## Integration Tests

### With Database
- [ ] Encrypted backup preserves all database records
- [ ] Encrypted backup preserves data types
- [ ] Encrypted backup preserves relationships
- [ ] Restored data matches original exactly

### With MinIO
- [ ] Encrypted files backup preserves all files
- [ ] Encrypted files backup preserves folder structure
- [ ] Encrypted files backup preserves file metadata
- [ ] Restored files match original exactly

### With Progress Tracking
- [ ] Progress tracking works during encryption
- [ ] Progress tracking works during decryption
- [ ] Progress updates are accurate
- [ ] Progress errors are handled gracefully

## Production Readiness

### Documentation
- [ ] Setup guide is complete
- [ ] Troubleshooting guide is available
- [ ] Key rotation procedure is documented
- [ ] Security best practices are documented

### Monitoring
- [ ] Encryption errors are logged
- [ ] Performance metrics are tracked
- [ ] Backup success/failure is monitored
- [ ] Key rotation reminders are set

### Backup Strategy
- [ ] Backup retention policy is defined
- [ ] Key rotation schedule is set
- [ ] Backup storage location is secure
- [ ] Disaster recovery plan includes encrypted backups

## Sign-off

- [ ] All tests passed
- [ ] Documentation reviewed
- [ ] Security validated
- [ ] Performance acceptable
- [ ] Ready for production

**Tested by:** _________________  
**Date:** _________________  
**Version:** _________________

