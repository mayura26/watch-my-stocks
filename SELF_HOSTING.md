# Self-Hosting Guide

This guide covers self-hosting WatchMyStocks with various deployment options.

## Prerequisites

- Node.js 18+ installed
- Database (Turso) configured
- All environment variables set
- Domain/port accessible

## Development Setup

### Local Development
```bash
# Start the main app
npm run dev

# Start the alert scheduler (in separate terminal) - runs continuously
npm run alerts

# Or run alert check once (for testing)
npm run alerts:once
```

### Manual Testing
```bash
# Test alert checking
Invoke-WebRequest -Uri "http://localhost:3000/api/alerts/check" -Method POST

# Test cron endpoint
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/alerts" -Method GET
```

## Production Deployment

### Option 1: Coolify (Recommended)

**Setup:**
1. Connect your Git repository
2. Set Build Pack to Docker
3. Use the provided Dockerfile
4. Set Port to 3000
5. Add all environment variables
6. Set up scheduled task: `npm run alerts:once` every minute (`* * * * *`)

**Benefits:**
- Built-in scheduling
- Automatic restarts
- Easy monitoring
- No complex configuration

### Option 2: PM2 Process Manager

**Installation:**
```bash
npm install -g pm2
```

**Setup:**
```bash
# Start both app and alert scheduler
pm2 start "npm start" --name "watch-my-stocks"
pm2 start "npm run alerts" --name "alert-scheduler"

# Save PM2 configuration
pm2 save
pm2 startup
```

**Management:**
```bash
# Check status
pm2 status

# View logs
pm2 logs

# Restart services
pm2 restart all

# Stop services
pm2 stop all
```

### Option 3: Docker Deployment

**Build and Run:**
```bash
# Build image
docker build -t watch-my-stocks .

# Run container
docker run -p 3000:3000 --env-file .env watch-my-stocks
```

**With Docker Compose:**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - TURSO_DATABASE_URL=${TURSO_DATABASE_URL}
      - TURSO_AUTH_TOKEN=${TURSO_AUTH_TOKEN}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - FINNHUB_API_KEY=${FINNHUB_API_KEY}
      - COINGECKO_API_KEY=${COINGECKO_API_KEY}
      - POLYGON_API_KEY=${POLYGON_API_KEY}
```

## Verification

### Check if alerts are running
```bash
# Test manual alert check
curl -X POST http://localhost:3000/api/alerts/check

# Check health endpoint
curl http://localhost:3000/api/health
```

### Monitor performance
```bash
# Check system resources
htop
# or
top

# Check PM2 monitoring (if using PM2)
pm2 monit
```

## Troubleshooting

### Alerts not running
1. Check scheduled task status in Coolify
2. Check PM2 status: `pm2 status` (if using PM2)
3. Check logs for errors
4. Verify environment variables
5. Test manual API call

### High resource usage
1. Monitor system resources
2. Check for memory leaks
3. Optimize database queries
4. Consider rate limiting

### Database connection issues
1. Verify database credentials
2. Check network connectivity
3. Monitor database logs
4. Test connection manually

## Security Considerations

### Firewall
```bash
# Only allow necessary ports
sudo ufw allow 3000
sudo ufw enable
```

### Reverse Proxy (Nginx)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### SSL Certificate
```bash
# Using Let's Encrypt
sudo certbot --nginx -d your-domain.com
```

## Backup Strategy

### Database Backup
```bash
# Create backup script
cat > scripts/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
# Add your database backup command here
echo "Database backup created: backup_$DATE"
EOF

chmod +x scripts/backup-db.sh

# Add to crontab (daily backup)
0 2 * * * /path/to/your/project/scripts/backup-db.sh
```

### Application Backup
```bash
# Backup application files
tar -czf watch-my-stocks-backup-$(date +%Y%m%d).tar.gz /path/to/your/project
```

## Monitoring

### Health Check Endpoint
```bash
# Add to your monitoring system
curl http://localhost:3000/api/health
```

### PM2 Monitoring (if using PM2)
```bash
# Real-time monitoring
pm2 monit

# Log rotation
pm2 install pm2-logrotate
```

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