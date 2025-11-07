# Gitpod Quick Start Guide

## 🎉 Welcome to Property Manager!

Your development environment is **automatically configured** and services **start automatically** when you open this workspace.

## ⏱️ First Time Setup

When you first open this workspace:
1. Wait ~2 minutes for initial setup
2. Services will start automatically
3. You'll see access URLs in the terminal

## 🌐 Access URLs

After services start, you'll see:

```
🌐 Frontend:  https://3000-<your-workspace-url>
🔧 Backend:   https://4000-<your-workspace-url>
📚 API Docs:  https://4000-<your-workspace-url>/api/docs
```

Click on the Frontend URL to access the application!

## 👤 Test Credentials

Log in with these accounts:

| Role | Email | Password |
|------|-------|----------|
| **Landlord** | landlord@example.com | password123 |
| **Tenant** | tenant@example.com | password123 |
| **Contractor** | contractor@example.com | password123 |

## 🔧 Common Commands

### View Logs
```bash
# Backend logs
tail -f /tmp/backend.log

# Frontend logs
tail -f /tmp/frontend.log
```

### Restart Services
```bash
./restart-services.sh
```

### Stop Services
```bash
./stop-services.sh
```

### Start Services Manually
```bash
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

- **Hot Reload:** Both frontend and backend support hot reload - just edit files and save!
- **Database:** SQLite is used by default (no Docker needed)
- **Ports:** Ports 3000 and 4000 are automatically exposed
- **Environment:** All environment variables are configured automatically

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
