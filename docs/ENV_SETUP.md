# Environment Variables Setup

Add these to your `.env` file in the project root:

## Required Email Configuration (Techsoul BD)

```env
# Email Configuration - Techsoul BD SMTP
SMTP_HOST=mail.techsoulbd.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@techsoulbd.com
SMTP_PASS=your-email-password-here
EMAIL_FROM=no-reply@techsoulbd.com
EMAIL_FROM_NAME=Startup MVP
```

**Important:**
1. Replace `your-email-password-here` with the actual password for `no-reply@techsoulbd.com`
2. Port 465 requires SSL/TLS, so `SMTP_SECURE=true` is automatically set
3. Make sure there are no spaces around the `=` sign
4. Don't use quotes around values unless necessary
5. The password should be the actual email account password (not an app password)

## Authentication Troubleshooting (Error 535)

If you see "535 Incorrect authentication data":
1. **Verify the password is correct** - Make sure there are no extra spaces
2. **Check the username format** - Should be `no-reply@techsoulbd.com` (full email)
3. **Try the credentials in a mail client first** - Test with Outlook/Thunderbird to confirm they work
4. **Check if special characters in password** - Some special chars may need URL encoding
5. **Contact your hosting provider** - Some email servers require app-specific passwords

## Complete .env File Template

```env
# Database
DATABASE_URL=postgresql://myuser:mypassword@localhost:5432/mydatabase?schema=public

# NextAuth
NEXTAUTH_SECRET=I5p97Jpv0Xr7Zz7Ay8W6+O2eLmBR6N2gllGrZO01Szo=
NEXTAUTH_URL=http://localhost:3000

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Email Configuration - Techsoul BD SMTP
SMTP_HOST=mail.techsoulbd.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@techsoulbd.com
SMTP_PASS=YOUR_ACTUAL_PASSWORD_HERE
EMAIL_FROM=no-reply@techsoulbd.com
EMAIL_FROM_NAME=Startup MVP

# App URL (for email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## After Setting Up

1. Save the `.env` file
2. Restart your development server: `npm run dev`
3. Test the forgot password flow
4. Check console logs for email sending status
5. In development, codes will also be logged to console for testing

## Testing Email

To verify email is working:
1. Go to `/auth/forgot-password`
2. Enter a registered email
3. Check console for:
   - `✅ Email sent successfully:` (if working)
   - `❌ Error sending email:` (if there's an issue)
   - Development mode will also show the code in console

## Alternative: Test Email Credentials

You can test your SMTP credentials using a simple Node.js script:

```bash
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'mail.techsoulbd.com',
  port: 465,
  secure: true,
  auth: {
    user: 'no-reply@techsoulbd.com',
    pass: 'YOUR_PASSWORD'
  }
});
transporter.verify().then(() => console.log('✅ Connection successful!')).catch(e => console.error('❌ Error:', e));
"
```
