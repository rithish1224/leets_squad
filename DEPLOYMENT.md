# LeetSquad - Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Setup
- [ ] Generate strong JWT_SECRET: `openssl rand -hex 32`
- [ ] Set up PostgreSQL production database
- [ ] Configure Gmail App Password for email (https://myaccount.google.com/apppasswords)
- [ ] Prepare production domain/SSL certificate
- [ ] Set up monitoring/logging infrastructure

### 2. Database Migration
```bash
# Ensure all migrations are applied
npm run migrate

# Verify migration status
psql $DATABASE_URL -c "\dt"  # Should show users, streaks, groups tables
```

### 3. Environment Variables

Copy `.env.production.example` to `.env` and fill in:

```bash
# Critical variables
DATABASE_URL=postgresql://user:password@host:5432/dsa_accountability
JWT_SECRET=<32-char-hex-string>
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com

# Email configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=app-specific-password
```

### 4. Build & Test Locally

```bash
# Build backend
npm run build

# Run in production mode
NODE_ENV=production npm run start

# Verify health check
curl http://localhost:3001/api/health
```

## Deployment Options

### Option A: Heroku
```bash
# Install Heroku CLI
# heroku login

# Create app
heroku create leetsquad-api

# Add PostgreSQL
heroku addons:create heroku-postgresql:standard-0 --app leetsquad-api

# Set environment variables
heroku config:set NODE_ENV=production -a leetsquad-api
heroku config:set JWT_SECRET=$(openssl rand -hex 32) -a leetsquad-api
heroku config:set EMAIL_USER=your-email@gmail.com -a leetsquad-api
heroku config:set EMAIL_PASSWORD=app-password -a leetsquad-api

# Deploy
git push heroku main

# Verify deployment
heroku logs --tail -a leetsquad-api
```

### Option B: AWS EC2
```bash
# 1. Create EC2 instance (Ubuntu 22.04)
# 2. Install dependencies
sudo apt-get update
sudo apt-get install -y nodejs npm postgresql-client

# 3. Clone repository
git clone <repo-url>
cd leetsquad/backend

# 4. Install dependencies
npm install
npm run build

# 5. Set up environment
cp .env.production.example .env
# Edit .env with production values

# 6. Run with PM2
npm install -g pm2
pm2 start dist/index.js --name "leetsquad-api" --env NODE_ENV=production
pm2 save
pm2 startup

# 7. Set up Nginx reverse proxy (see nginx.conf)
```

### Option C: Docker
```bash
# Build Docker image
docker build -t leetsquad-api:latest .

# Run container
docker run -d \
  --name leetsquad-api \
  -p 3001:3001 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  -e NODE_ENV=production \
  leetsquad-api:latest
```

### Option D: Railway
```bash
# 1. Connect GitHub repo to Railway
# 2. Add PostgreSQL plugin
# 3. Set environment variables in Railway dashboard
# 4. Auto-deploy on push
```

## Post-Deployment

### Verify Installation
```bash
# Check health endpoint
curl https://your-domain.com/api/health

# Check logs
tail -f /var/log/pm2/leetsquad-api.log

# Test authentication
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### Monitor Performance
- Set up error tracking (Sentry, LogRocket)
- Monitor database performance
- Set up alerting for 5xx errors
- Monitor response times and latency

### Scaling
- Database: Enable read replicas for analytics queries
- Backend: Load balance across multiple instances
- Cache: Add Redis for session management
- CDN: Use CloudFlare for static assets

## Security Best Practices

### Already Implemented ✅
- Helmet security headers
- Rate limiting (auth: 10 attempts/15min, password reset: 5/hour)
- CORS properly configured
- JWT token expiration (7 days)
- Password hashing (bcrypt, 12 rounds)
- OTP-based password reset (not email links)
- Input validation with express-validator

### Additional Recommendations
1. Enable HTTPS only
2. Set up firewall rules
3. Regular security audits
4. Dependency updates: `npm audit`
5. SQL injection prevention (already using parameterized queries)
6. DDoS protection (CloudFlare, AWS Shield)
7. Regular database backups

## Rollback Procedure

```bash
# If deployment fails:
# 1. Check logs
pm2 logs leetsquad-api

# 2. Restart service
pm2 restart leetsquad-api

# 3. Revert to previous version
git checkout <previous-commit>
npm run build
pm2 restart leetsquad-api
```

## Troubleshooting

### Database Connection Error
```bash
# Test connection
psql $DATABASE_URL -c "SELECT version();"

# Check DATABASE_URL format:
# postgresql://username:password@host:port/database
```

### Email Not Sending
```bash
# Verify Gmail App Password (not regular password)
# Check EMAIL_USER and EMAIL_PASSWORD in .env
# Ensure 2FA is enabled on Gmail account
```

### High Memory Usage
```bash
# Monitor with:
pm2 monit

# Check for memory leaks in event handlers
# Increase Node memory limit:
node --max-old-space-size=4096 dist/index.js
```

## Performance Optimization

1. **Database**: Add indexes on frequently queried columns
2. **Caching**: Implement Redis for leaderboard/analytics
3. **API**: Implement pagination for large datasets
4. **Compression**: Enable gzip compression
5. **Monitoring**: Track API response times

## Contact & Support

For issues or questions:
- Check logs: `pm2 logs leetsquad-api`
- Check status: `pm2 status`
- Restart: `pm2 restart leetsquad-api`
