# Dokku Deployment Guide

This guide provides instructions for deploying the Albers Aerospace Intranet to a Dokku server.

## Prerequisites

- Dokku installed on your server (version 0.28.0 or later recommended)
- PostgreSQL plugin installed: `dokku plugin:install https://github.com/dokku/dokku-postgres.git`
- Git configured on your local machine
- SSH access to the Dokku server

## Initial Setup

### 1. Create the Dokku Application

SSH into your Dokku server and create the application:

```bash
dokku apps:create albers-intranet
```

### 2. Create and Link PostgreSQL Database

```bash
# Create the PostgreSQL service
dokku postgres:create albers-intranet-db

# Link it to your app (this automatically sets DATABASE_URL)
dokku postgres:link albers-intranet-db albers-intranet
```

### 3. Create Persistent Storage for Files

```bash
# Create the storage directory on the host
sudo mkdir -p /var/lib/dokku/data/storage/albers-intranet

# Set proper permissions
sudo chown -R dokku:dokku /var/lib/dokku/data/storage/albers-intranet

# Mount the storage to the app
dokku storage:mount albers-intranet /var/lib/dokku/data/storage/albers-intranet:/app/storage
```

### 4. Configure Environment Variables

Set all required environment variables:

```bash
# Session security (generate a secure random string)
dokku config:set albers-intranet SESSION_SECRET="$(openssl rand -base64 32)"

# Node environment
dokku config:set albers-intranet NODE_ENV=production

# SMTP Configuration for Outlook Gov
dokku config:set albers-intranet \
  SMTP_HOST=smtp.office365.us \
  SMTP_PORT=587 \
  SMTP_USER=your-email@albers.aero \
  SMTP_PASS="your-email-password" \
  SMTP_FROM=your-email@albers.aero

# Storage directory (optional, defaults to /app/storage)
dokku config:set albers-intranet STORAGE_DIR=/app/storage

# Port (optional, Dokku handles this automatically)
dokku config:set albers-intranet PORT=5000
```

### 5. Configure Domain (Optional)

If you have a custom domain:

```bash
dokku domains:add albers-intranet intranet.albers.aero
```

To enable SSL with Let's Encrypt:

```bash
# Install Let's Encrypt plugin if not already installed
dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git

# Set email for Let's Encrypt
dokku letsencrypt:set albers-intranet email your-email@albers.aero

# Enable Let's Encrypt
dokku letsencrypt:enable albers-intranet

# Enable auto-renewal
dokku letsencrypt:cron-job --add
```

## Deployment

### 6. Add Dokku Remote to Your Local Repository

On your local machine, add the Dokku server as a Git remote:

```bash
git remote add dokku dokku@your-server-hostname:albers-intranet
```

### 7. Deploy the Application

Push your code to Dokku:

```bash
git push dokku main
```

The first deployment will:
- Install Node.js dependencies
- Build the frontend (Vite)
- Build the backend (esbuild)
- Start the application

### 8. Verify Deployment

Check the application logs:

```bash
dokku logs albers-intranet --tail
```

Check the running status:

```bash
dokku ps:report albers-intranet
```

### 9. Access the Application

Your application will be available at:
- Default: `http://albers-intranet.your-dokku-domain`
- Custom domain (if configured): `https://intranet.albers.aero`

## Database Management

### View Database Information

```bash
dokku postgres:info albers-db
```

### Create a Database Backup

```bash
dokku postgres:export albers-db > backup-$(date +%Y%m%d).dump
```

### Restore from Backup

```bash
dokku postgres:import albers-db < backup-20260121.dump
```

### Access Database Console

```bash
dokku postgres:connect albers-db
```

## Application Management

### View Logs

```bash
# Tail logs in real-time
dokku logs albers-intranet --tail

# View last 100 lines
dokku logs albers-intranet --num 100
```

### Restart the Application

```bash
dokku ps:restart albers-intranet
```

### Scale the Application

```bash
# Scale web processes (if needed for high traffic)
dokku ps:scale albers-intranet web=2
```

### View Environment Variables

```bash
dokku config albers-intranet
```

### Update Environment Variables

```bash
dokku config:set albers-intranet KEY=value
```

## Updating the Application

To deploy updates:

1. Commit your changes locally:
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

2. Push to Dokku:
   ```bash
   git push dokku main
   ```

3. Dokku will automatically:
   - Build the new version
   - Run health checks
   - Zero-downtime deploy (if configured)

## Troubleshooting

### Application Won't Start

Check logs for errors:
```bash
dokku logs albers-intranet --tail
```

Common issues:
- Missing environment variables
- Database connection issues
- Build failures

### Database Connection Issues

Verify DATABASE_URL is set:
```bash
dokku config:get albers-intranet DATABASE_URL
```

Test database connectivity:
```bash
dokku postgres:connect albers-db
```

### File Upload Issues

Check storage mount:
```bash
dokku storage:list albers-intranet
```

Verify directory permissions:
```bash
ls -la /var/lib/dokku/data/storage/albers-intranet
```

### Email Not Sending

Verify SMTP configuration:
```bash
dokku config:get albers-intranet SMTP_HOST
dokku config:get albers-intranet SMTP_USER
```

Check application logs for SMTP errors:
```bash
dokku logs albers-intranet --tail | grep -i smtp
```

### Build Failures

If build fails during deployment:

1. Check build logs:
   ```bash
   dokku logs albers-intranet
   ```

2. Verify Node.js version compatibility
3. Ensure all dependencies are in package.json
4. Check for TypeScript errors locally: `npm run check`

## Security Best Practices

1. **Keep SESSION_SECRET secure** - Never commit to Git
2. **Use strong SMTP passwords** - Consider app-specific passwords
3. **Enable SSL/TLS** - Use Let's Encrypt for HTTPS
4. **Regular backups** - Automate database backups
5. **Update dependencies** - Keep Node.js and packages up to date
6. **Monitor logs** - Watch for suspicious activity
7. **Restrict SSH access** - Only allow authorized users

## Performance Tuning

### Enable HTTP/2

```bash
dokku nginx:set albers-intranet http2-push-preload true
```

### Configure Client Max Body Size (for large file uploads)

```bash
dokku nginx:set albers-intranet client-max-body-size 200m
```

### Enable Gzip Compression

```bash
dokku nginx:set albers-intranet gzip on
dokku nginx:set albers-intranet gzip-types "text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript"
```

## Maintenance

### Zero-Downtime Deployments

Dokku supports zero-downtime deployments by default. To ensure this:

1. Application must respond to health checks on port 5000
2. Use multiple web processes for high availability:
   ```bash
   dokku ps:scale albers-intranet web=2
   ```

### Scheduled Tasks (if needed)

If you need to run scheduled tasks (e.g., cleanup, reports):

1. Create a separate script in your repository
2. Use Dokku's cron plugin or system cron to schedule execution

## Support

For issues specific to:
- **Dokku**: https://dokku.com/docs/
- **Application code**: Contact your development team
- **Outlook Gov SMTP**: Contact your IT department

## Additional Resources

- [Dokku Documentation](https://dokku.com/docs/getting-started/installation/)
- [Dokku PostgreSQL Plugin](https://github.com/dokku/dokku-postgres)
- [Node.js Buildpack](https://github.com/heroku/heroku-buildpack-nodejs)
