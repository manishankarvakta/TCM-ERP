-- This migration updates relation names in the Prisma schema for better consistency.
-- The actual database structure remains unchanged - only the Prisma field names were updated.
-- Changes:
-- - Voucher.creator (was User_Voucher_createdByToUser)
-- - Voucher.postedBy (was User_Voucher_postedByIdToUser)  
-- - Voucher.user (was User_Voucher_userIdToUser)
-- - User.createdVouchers (was Voucher_Voucher_createdByToUser)
-- - User.postedVouchers (was Voucher_Voucher_postedByIdToUser)
-- - User.userVouchers (was Voucher_Voucher_userIdToUser)

-- No SQL changes needed as this is a schema-only change.

