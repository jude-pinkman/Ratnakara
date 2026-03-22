# Deployment Guide - Marine Data Platform

## Production Deployment Options

### Option 1: Docker Deployment (Recommended)

#### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+

#### Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd marine-data-platform
```

2. **Configure environment variables**
```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

3. **Build and start all services**
```bash
docker-compose up -d
```

4. **Initialize database**
```bash
# Wait for PostgreSQL to be ready, then:
docker exec -it marine-backend npm run seed
```

5. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- ML Service: http://localhost:8000

#### Production Docker Settings

Update `docker-compose.yml` for production:

```yaml
services:
  postgres:
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}  # Use strong password
    volumes:
      - /var/lib/postgresql/data  # Persistent storage

  backend:
    build:
      args:
        NODE_ENV: production
    environment:
      NODE_ENV: production

  frontend:
    build:
      args:
        NODE_ENV: production
    environment:
      NODE_ENV: production
```

---

### Option 2: Manual Deployment

#### Backend Deployment

```bash
cd backend

# Install dependencies
npm install --production

# Build TypeScript
npm run build

# Start with PM2
npm install -g pm2
pm2 start dist/app.js --name marine-backend

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Frontend Deployment

```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Start with PM2
pm2 start npm --name marine-frontend -- start

# Or use standalone server
npm run build && npm start
```

#### ML Service Deployment

```bash
cd ml-service

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start with gunicorn
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000

# Or use PM2
pm2 start "uvicorn main:app --host 0.0.0.0 --port 8000" --name marine-ml
```

---

### Option 3: Cloud Platform Deployment

#### Vercel (Frontend)

1. Install Vercel CLI
```bash
npm i -g vercel
```

2. Deploy
```bash
cd frontend
vercel deploy --prod
```

3. Set environment variables in Vercel dashboard

#### Railway/Render (Backend + ML)

1. Create `Procfile` in backend:
```
web: npm start
```

2. Create `Procfile` in ml-service:
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

3. Connect GitHub repository
4. Configure environment variables
5. Deploy

#### Heroku

```bash
# Backend
cd backend
heroku create marine-backend
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main

# ML Service
cd ml-service
heroku create marine-ml-service
heroku buildpacks:set heroku/python
git push heroku main

# Frontend
cd frontend
heroku create marine-frontend
heroku config:set NEXT_PUBLIC_API_URL=https://marine-backend.herokuapp.com
git push heroku main
```

---

## Database Setup for Production

### PostgreSQL Configuration

1. **Create production database**
```sql
CREATE DATABASE marine_data;
CREATE USER marine_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE marine_data TO marine_user;
```

2. **Run migrations**
```bash
psql -U marine_user -d marine_data -f backend/src/db/schema.sql
```

3. **Seed initial data**
```bash
cd backend
npm run seed
```

### Database Backup

```bash
# Backup
pg_dump -U marine_user marine_data > backup_$(date +%Y%m%d).sql

# Restore
psql -U marine_user -d marine_data < backup_20240101.sql
```

---

## Nginx Configuration

```nginx
# Backend API
server {
    listen 80;
    server_name api.marine-platform.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# ML Service
server {
    listen 80;
    server_name ml.marine-platform.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 80;
    server_name marine-platform.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## SSL/HTTPS with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificates
sudo certbot --nginx -d marine-platform.com -d api.marine-platform.com -d ml.marine-platform.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## Monitoring & Logging

### PM2 Monitoring

```bash
# View logs
pm2 logs

# Monitor performance
pm2 monit

# Generate startup script
pm2 startup
pm2 save
```

### Application Logging

Backend (`backend/src/app.ts`):
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

---

## Performance Optimization

### Database

1. **Add indexes** (already in schema.sql)
2. **Connection pooling** (already configured)
3. **Query optimization**

### Frontend

1. **Image optimization**
```bash
npm install sharp
```

2. **Enable compression**
```javascript
// next.config.js
module.exports = {
  compress: true,
  images: {
    domains: ['localhost'],
  }
}
```

### Backend

1. **Enable gzip compression**
```typescript
import compression from 'compression';
app.use(compression());
```

2. **Rate limiting**
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/', limiter);
```

---

## Security Checklist

- [ ] Change default database passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Add rate limiting
- [ ] Sanitize user inputs
- [ ] Enable Helmet.js
- [ ] Set secure HTTP headers
- [ ] Regular security updates
- [ ] Database backups
- [ ] Environment variable protection

---

## Scaling Strategies

### Horizontal Scaling

1. **Load Balancer** (Nginx, HAProxy)
2. **Multiple backend instances**
3. **Database replication** (Primary-Replica)
4. **Redis caching** for session management

### Vertical Scaling

1. **Increase server resources** (CPU, RAM)
2. **Optimize database queries**
3. **Enable caching**

---

## Troubleshooting Production Issues

### Backend not starting
```bash
# Check logs
pm2 logs marine-backend

# Check database connection
psql -U marine_user -d marine_data -c "SELECT 1;"
```

### Frontend build fails
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### Database connection errors
- Verify credentials in .env
- Check PostgreSQL is running
- Verify firewall rules
- Check database user permissions

---

## Maintenance

### Regular Tasks

1. **Database backups** (daily)
2. **Log rotation** (weekly)
3. **Security updates** (monthly)
4. **Performance monitoring** (continuous)
5. **Disk space monitoring** (continuous)

### Update Procedure

```bash
# Pull latest code
git pull origin main

# Update dependencies
cd backend && npm install
cd frontend && npm install
cd ml-service && pip install -r requirements.txt

# Run migrations if any
npm run migrate

# Restart services
pm2 restart all
```

---

## Support

For production support and issues:
- Check logs first
- Review error messages
- Consult documentation
- Create GitHub issue with details
