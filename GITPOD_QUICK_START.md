# Gitpod Quick Start Guide

## 🎉 Welcome to Property Manager!

Your development environment is **automatically configured** and services **start automatically** when you open this workspace.

## ⏱️ First Time Setup

When you first open this workspace:
1. Wait ~3-4 minutes for initial setup (installs dependencies and builds apps)
2. Services will start automatically in **production mode** (faster!)
3. You'll see access URLs in the terminal

**Production mode means:**
- ⚡ Faster startup (~15 seconds vs ~60 seconds)
- 🚀 Optimized performance
- ⚠️ No hot reload (restart to see code changes)

## 🌐 Access URLs

After services start, you'll see:

```
🌐 Frontend:  https://3000-<your-workspace-url>
🔧 Backend:   https://4000-<your-workspace-url>
📚 API Docs:  https://4000-<your-workspace-url>/api/docs
```

Click on the Frontend URL to access the application!

## 👤 Quick Login (One-Click Access)

The login page now has **Quick Login buttons** for instant access to different roles:

### 🚀 One-Click Login
Just click the button for the role you want to test:

- **🏢 Landlord** - Property management dashboard
- **👤 Tenant** - Report issues and view tickets
- **🔧 Contractor** - View jobs and submit quotes
- **⚙️ Operations** - Manage ticket queue

### 📋 Manual Login Credentials

Or enter these manually:

| Role | Email | Password |
|------|-------|----------|
| **Landlord** | landlord@example.com | password123 |
| **Tenant** | tenant@example.com | password123 |
| **Contractor** | contractor@example.com | password123 |
| **Operations** | ops@example.com | password123 |

## 🔧 Common Commands

### View Logs
```bash
# Backend logs
tail -f /tmp/backend.log

# Frontend logs
tail -f /tmp/frontend.log
```

### Restart Services (Production Mode - Fast)
```bash
./start-production.sh
```

### Restart Services (Development Mode - Hot Reload)
```bash
./restart-services.sh
```

### Stop Services
```bash
./stop-services.sh
```

### Start Services Manually
```bash
# Production mode (fast startup, no hot reload)
USE_PROD_MODE=true bash .devcontainer/start-services.sh

# Development mode (slower startup, hot reload enabled)
bash .devcontainer/start-services.sh
```

## 📁 Project Structure

```
Property-Manager/
├── backend/              # NestJS API (port 4000)
├── frontend/             # Next.js app (port 3000)
├── .devcontainer/        # Auto-start configuration
├── restart-services.sh   # Restart both services
└── stop-services.sh      # Stop both services
```

## 🐛 Troubleshooting

### Services didn't start?
```bash
bash .devcontainer/start-services.sh
```

### Backend not responding?
```bash
# Check logs
tail -f /tmp/backend.log

# Restart
./restart-services.sh
```

### Frontend not loading?
```bash
# Check logs
tail -f /tmp/frontend.log

# Restart
./restart-services.sh
```

### Need to reset everything?
```bash
# Stop services
./stop-services.sh

# Run setup again
bash .devcontainer/setup.sh

# Start services
bash .devcontainer/start-services.sh
```

## 📚 Documentation

- **[README.md](./README.md)** - Full project documentation
- **[.devcontainer/README.md](.devcontainer/README.md)** - Auto-start details
- **[QUICK_START.md](./QUICK_START.md)** - Quick setup guide
- **[API_EXAMPLES.md](./API_EXAMPLES.md)** - API usage examples

## 🚀 Next Steps

1. ✅ Open the Frontend URL
2. ✅ Log in with test credentials
3. ✅ Explore the application
4. ✅ Check out the API docs
5. ✅ Start coding!

## 💡 Tips

- **Production Mode:** Services start in production mode by default for faster startup
- **Development Mode:** Use `./restart-services.sh` for hot reload during development
- **Hot Reload:** In dev mode, both frontend and backend support hot reload - just edit files and save!
- **Database:** SQLite is used by default (no Docker needed)
- **Ports:** Ports 3000 and 4000 are automatically exposed
- **Environment:** All environment variables are configured automatically
- **Startup Time:** Production mode: ~15 seconds, Development mode: ~60 seconds

## 🆘 Need Help?

Check the logs first:
```bash
tail -f /tmp/backend.log /tmp/frontend.log
```

Or restart everything:
```bash
./restart-services.sh
```

---

**Happy Coding! 🎉**
