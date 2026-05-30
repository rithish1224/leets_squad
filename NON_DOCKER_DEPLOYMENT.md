# 🚀 Non-Docker Production Deployment Guide

Since you are not using Docker, you will need to host your backend on a Node.js server (like a VPS or PaaS) and your frontend on a static hosting provider (or Nginx). Here is the best-practice method.

---

## 1. Environment Setup (.env)

Create a `.env` file inside the `backend` folder matching your production credentials:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://your_db_user:your_db_password@your_db_host:5432/dsa_accountability
JWT_SECRET=your_super_secret_64_char_hex_string
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-frontend-domain.com

# Email configuration (for OTP)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@leetsquad.com
```

---

## 2. Deploying the Backend (VPS with PM2)

If you are deploying to a standard Virtual Private Server (VPS like DigitalOcean, AWS EC2, or Hetzner):

1. **Install Node.js** (v18 or higher) and PostgreSQL on your server (if not using a managed database).
2. **Install PM2 globally:**
   ```bash
   npm install -g pm2
   ```
3. **Pull your code** onto the server.
4. **Install Dependencies & Build:**
   ```bash
   cd backend
   npm install
   npm run build
   ```
5. **Run Migrations** to set up your database schema:
   ```bash
   npm run migrate
   ```
6. **Start the App with PM2**:
   Use the provided `ecosystem.config.js` located in the root of the project to run the backend in cluster mode across all your CPU cores.
   ```bash
   cd ..
   pm2 start ecosystem.config.js
   pm2 save
   ```

*Note: If you are using a PaaS like Render, Heroku, or Railway, simply hook your GitHub repo to it, set the build command to `npm install && npm run build` and the start command to `npm run start` in the backend folder.*

---

## 3. Deploying the Frontend (Vercel / Netlify / Cloudflare Pages)

The frontend is a static React/Vite application. It does not require a Node.js server to run in production.

1. **Set Environment Variable:**
   In your hosting provider's dashboard, set:
   `VITE_API_URL=https://api.your-backend-domain.com/api`

2. **Build Configuration:**
   - **Framework:** Vite / React
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Publish/Output Directory:** `frontend/dist`

Hosts like Vercel or Cloudflare Pages are 100% free for this and provide automatic SSL certificates and global CDN distribution.

---

## 4. Final Security Check
- Ensure your database port (5432) is heavily firewalled if running on a VPS.
- Map a domain to your backend VPS IP and set up an SSL certificate (e.g., using Certbot/Let's Encrypt with an Nginx reverse proxy mapped to port 3001).
- Double-check that your frontend `VITE_API_URL` uses `https://`.