# Coolify Deployment Guide

This guide covers deploying WatchMyStocks to Coolify with built-in scheduled tasks.

## Prerequisites

- Coolify instance running
- Git repository with your code
- Environment variables configured

## Coolify Deployment with Scheduled Tasks

This approach uses Coolify's built-in scheduling feature to run the alert checker.

### Coolify Configuration:

1. **Repository**: Connect your Git repository
2. **Build Pack**: Docker
3. **Dockerfile**: Use the provided Dockerfile
4. **Port**: 3000
5. **Environment Variables**: Set all required variables
6. **Scheduled Task**: Set up `npm run alerts` to run every minute

### Environment Variables in Coolify:

```
NODE_ENV=production
TURSO_DATABASE_URL=your_database_url
TURSO_AUTH_TOKEN=your_auth_token
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_secret
FINNHUB_API_KEY=your_finnhub_key
COINGECKO_API_KEY=your_coingecko_key
POLYGON_API_KEY=your_polygon_key
```

### Deployment Steps:

1. **Connect Repository**:
   - Go to Coolify dashboard
   - Click "New Resource" → "Application"
   - Connect your Git repository
   - Select branch (usually `main`)

2. **Configure Build**:
   - Build Pack: Docker
   - Dockerfile: `./Dockerfile`
   - Build Context: `.`

3. **Set Environment Variables**:
   - Add all required environment variables
   - Make sure `NEXTAUTH_URL` matches your domain

4. **Set Up Scheduled Task**:
   - Go to "Scheduled Tasks" tab
   - Add new task: `npm run alerts:once`
   - Set schedule: `* * * * *` (every minute)
   - Enable the task

5. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete
   - Check logs for both app and scheduled task

### Verification:

```bash
# Check if the app is running
curl https://your-domain.com/api/health

# Check scheduled task logs in Coolify dashboard
# Look for alert checking activity every minute
```

## How It Works

### Coolify Scheduled Tasks:
- **Main App**: Runs continuously on port 3000
- **Alert Scheduler**: Runs every minute via Coolify's scheduler
- **Independent Execution**: Scheduled task runs separately from main app
- **Automatic Restart**: Coolify handles both app and task restarts

### Resource Usage:
- **CPU**: Alert checking runs for ~1-2 seconds every minute
- **Memory**: Minimal overhead for scheduled task
- **Network**: Just API calls to fetch prices
- **Database**: Shared connection pool

## Monitoring and Maintenance

### Health Checks

- **Endpoint**: `https://your-domain.com/api/health`
- **Coolify**: Will automatically monitor this endpoint
- **Alerts**: Check PM2 logs for alert checking activity

### Logs

```bash
# View application logs in Coolify dashboard
# Or via PM2 (if you have shell access)
pm2 logs watch-my-stocks
pm2 logs alert-scheduler
```

### Updates

1. **Push to Git**:
   ```bash
   git add .
   git commit -m "Update application"
   git push origin main
   ```

2. **Redeploy in Coolify**:
   - Go to your application
   - Click "Redeploy"
   - Wait for build to complete

### Troubleshooting

#### Alert Scheduler Not Running

1. **Check PM2 Status**:
   ```bash
   pm2 status
   ```

2. **Check Logs**:
   ```bash
   pm2 logs alert-scheduler
   ```

3. **Restart Scheduler**:
   ```bash
   pm2 restart alert-scheduler
   ```

#### Database Connection Issues

1. **Check Environment Variables**:
   - Verify `TURSO_DATABASE_URL`
   - Verify `TURSO_AUTH_TOKEN`

2. **Test Connection**:
   ```bash
   curl https://your-domain.com/api/health
   ```

#### High Resource Usage

1. **Monitor Resources** in Coolify dashboard
2. **Check PM2 Status**:
   ```bash
   pm2 monit
   ```

3. **Optimize Alert Frequency** (if needed)

## Security Considerations

### Environment Variables

- Never commit `.env` files
- Use Coolify's environment variable management
- Rotate secrets regularly

### Network Security

- Use HTTPS (Coolify handles this)
- Set up proper firewall rules
- Monitor access logs

### Database Security

- Use strong authentication tokens
- Enable database logging
- Regular backups

## Backup Strategy

### Database Backups

```bash
# Create backup script
cat > backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
# Add your Turso backup command here
echo "Database backup created: backup_$DATE"
EOF

# Add to crontab
0 2 * * * /path/to/backup-db.sh
```

### Application Backups

- Coolify handles application backups
- Keep Git repository updated
- Document configuration changes

## Scaling

### Horizontal Scaling

- Coolify can handle multiple instances
- Use load balancer for high traffic
- Consider database connection limits

### Vertical Scaling

- Increase container resources in Coolify
- Monitor performance metrics
- Optimize alert checking frequency

## Maintenance

### Regular Tasks

1. **Monitor Logs** - Check for errors
2. **Update Dependencies** - Keep packages current
3. **Database Maintenance** - Clean old notifications
4. **Security Updates** - Keep system updated

### Alert System Maintenance

1. **Check Alert Performance** - Monitor checking times
2. **Review Notification Cleanup** - Ensure old notifications are removed
3. **Monitor API Limits** - Watch for rate limiting
4. **Test Alert Triggers** - Verify system works correctly
