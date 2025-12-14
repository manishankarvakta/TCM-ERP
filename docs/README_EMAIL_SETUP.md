# Email Configuration Guide

This project uses nodemailer for sending emails. Configure your email service in the `.env` file.

## Techsoul BD Email Configuration (Current Setup)

Add these to your `.env` file:

```env
# Techsoul BD SMTP Configuration
SMTP_HOST=mail.techsoulbd.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@techsoulbd.com
SMTP_PASS=your-email-password-here

# Email From Address
EMAIL_FROM=no-reply@techsoulbd.com
```

**Important:** 
- Port 465 requires SSL/TLS (secure: true)
- Use the email account's password for `SMTP_PASS`
- Make sure `SMTP_PASS` is set in your `.env` file

## Environment Variables Explained

| Variable | Value | Description |
|----------|-------|-------------|
| `SMTP_HOST` | `mail.techsoulbd.com` | Your SMTP server hostname |
| `SMTP_PORT` | `465` | SMTP port (465 = SSL/TLS) |
| `SMTP_SECURE` | `true` | Enable SSL/TLS for port 465 |
| `SMTP_USER` | `no-reply@techsoulbd.com` | Your email username |
| `SMTP_PASS` | `your-password` | Your email password (set this in .env) |
| `EMAIL_FROM` | `no-reply@techsoulbd.com` | From address in emails |

## Alternative Email Services

### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
```

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
EMAIL_FROM=noreply@yourdomain.com
```

## Development Mode

If email credentials are not configured:
- Reset codes will be logged to console (development only)
- Email sending will fail gracefully
- Always configure proper SMTP credentials for production

## Testing Email Configuration

1. Set all environment variables in `.env`
2. Restart your development server
3. Try the forgot password flow
4. Check the console for email sending status
5. Verify you receive the email

## Troubleshooting

### Email not sending?
1. Check all environment variables are set correctly
2. Verify password is correct (no extra spaces)
3. Check if your hosting provider blocks port 465
4. Check server logs for detailed error messages
5. Try testing with a mail client first to verify credentials

### Port 465 issues?
- Port 465 requires SSL/TLS
- Make sure `SMTP_SECURE=true` when using port 465
- Some hosting providers may block this port

## Forgot Password Flow

1. User enters email → `/forgot-password`
2. System sends 6-digit code → `/forgot-password/verify?email=...`
3. User verifies code → `/forgot-password/reset?email=...&code=...`
4. User resets password → Redirects to `/login`

## Password Reset Codes

- 6-digit numeric codes
- Valid for 15 minutes
- Single-use only
- Automatically cleaned up after use
