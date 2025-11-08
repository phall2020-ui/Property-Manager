# Quick Login Guide

## 🚀 One-Click Role Switching

The login page now features **Quick Login buttons** that let you instantly access different user roles without typing credentials.

---

## 📍 How to Use

1. **Open the application** - Navigate to the login page
2. **See the Quick Login section** - Blue box at the top
3. **Click any role button** - Instantly log in as that role
4. **Explore the portal** - Each role has different features

---

## 👥 Available Roles

### 🏢 Landlord
**Email:** `landlord@example.com`  
**Password:** `password123`

**What you can do:**
- View all properties
- Manage tenancies
- Approve/decline maintenance quotes
- View financial reports
- Track rent payments
- Manage invoices

**Landing Page:** `/dashboard`

---

### 👤 Tenant
**Email:** `tenant@example.com`  
**Password:** `password123`

**What you can do:**
- Report maintenance issues
- View your tickets
- Track ticket status
- View your tenancy details
- See payment history

**Landing Page:** `/report-issue`

---

### 🔧 Contractor
**Email:** `contractor@example.com`  
**Password:** `password123`

**What you can do:**
- View assigned jobs
- Submit quotes for work
- Update job status
- Mark jobs as complete
- Upload completion photos

**Landing Page:** `/jobs`

---

### ⚙️ Operations
**Email:** `ops@example.com`  
**Password:** `password123`

**What you can do:**
- View all tickets in queue
- Assign contractors to jobs
- Manage ticket priorities
- Track SLA compliance
- View system analytics

**Landing Page:** `/queue`

---

## 🎯 Quick Testing Workflow

### Test Complete Ticket Workflow

1. **Login as Tenant** 👤
   - Click "Tenant" button
   - Report a maintenance issue
   - Note the ticket ID

2. **Switch to Contractor** 🔧
   - Logout (top right menu)
   - Click "Contractor" button
   - Find the ticket
   - Submit a quote

3. **Switch to Landlord** 🏢
   - Logout
   - Click "Landlord" button
   - Find the ticket
   - Approve the quote

4. **Back to Contractor** 🔧
   - Logout
   - Click "Contractor" button
   - Mark job as complete

5. **Check as Tenant** 👤
   - Logout
   - Click "Tenant" button
   - See completed ticket

---

## 🔄 Switching Between Roles

### Method 1: Logout and Quick Login
```
1. Click user menu (top right)
2. Click "Logout"
3. Click desired role button
```

### Method 2: Direct Navigation
```
1. Navigate to /login
2. Click desired role button
```

---

## 🎨 Visual Guide

### Login Page Layout

```
┌─────────────────────────────────────────┐
│  🚀 Quick Login (Development)           │
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ 🏢 Landlord  │  │ 👤 Tenant    │   │
│  │ landlord@... │  │ tenant@...   │   │
│  └──────────────┘  └──────────────┘   │
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ 🔧 Contractor│  │ ⚙️ Operations│   │
│  │ contractor@..│  │ ops@...      │   │
│  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Sign in                                │
│                                         │
│  Email:    [________________]          │
│  Password: [________________]          │
│                                         │
│  [        Sign in        ]             │
└─────────────────────────────────────────┘
```

---

## 📊 Role Comparison

| Feature | Landlord | Tenant | Contractor | Ops |
|---------|----------|--------|------------|-----|
| **View Properties** | ✅ All | ❌ | ❌ | ✅ All |
| **Create Tickets** | ✅ | ✅ | ❌ | ✅ |
| **Submit Quotes** | ❌ | ❌ | ✅ | ❌ |
| **Approve Quotes** | ✅ | ❌ | ❌ | ✅ |
| **Assign Contractors** | ❌ | ❌ | ❌ | ✅ |
| **View Finances** | ✅ | ❌ | ❌ | ✅ |
| **Manage Tenancies** | ✅ | ❌ | ❌ | ✅ |

---

## 🔐 Security Note

**⚠️ Development Feature Only**

The Quick Login buttons are designed for **development and testing** purposes. In production:

- These buttons should be removed
- Users must enter credentials manually
- Consider adding 2FA for enhanced security
- Implement rate limiting on login attempts

---

## 💡 Tips

### For Testing
- **Use Quick Login** - Fastest way to switch roles
- **Keep multiple tabs** - Open different roles simultaneously
- **Use incognito** - Test without logout/login cycle

### For Development
- **Test permissions** - Verify role-based access control
- **Check UI differences** - Each role sees different features
- **Validate workflows** - Test complete user journeys

### For Demos
- **Quick switching** - Impress stakeholders with fast role changes
- **Show all portals** - Demonstrate complete system
- **Real-time updates** - Show cross-role interactions

---

## 🐛 Troubleshooting

### Button not working?
```bash
# Check if backend is running
curl http://localhost:4000/api/health

# Check frontend logs
tail -f /tmp/frontend.log
```

### Wrong portal after login?
- Each role has a default landing page
- Check the role assignment in database
- Verify user has correct organization membership

### Can't see certain features?
- Features are role-based
- Some features require specific permissions
- Check the role comparison table above

---

## 🎓 Learning Path

### New to the System?
1. **Start as Tenant** - Simplest interface
2. **Try Contractor** - See job management
3. **Explore Landlord** - Most features
4. **Master Operations** - Full system view

### Testing New Features?
1. **Identify affected roles** - Which users see it?
2. **Test each role** - Use Quick Login
3. **Verify permissions** - Check access control
4. **Test workflows** - Cross-role interactions

---

## 📚 Related Documentation

- **GITPOD_QUICK_START.md** - Getting started guide
- **AUTO_START_SUMMARY.md** - Auto-start configuration
- **TICKET_FEATURES_STATUS.md** - Ticket system features
- **README.md** - Complete project documentation

---

## 🚀 Quick Reference

### Fastest Way to Test Each Portal

```bash
# Landlord Portal
1. Click 🏢 Landlord button
2. Explore: Properties → Tickets → Finance

# Tenant Portal  
1. Click 👤 Tenant button
2. Explore: Report Issue → My Tickets

# Contractor Portal
1. Click 🔧 Contractor button
2. Explore: Jobs → Submit Quote

# Operations Portal
1. Click ⚙️ Operations button
2. Explore: Queue → Assign Jobs
```

---

**Last Updated:** 2025-11-08

**Status:** ✅ Fully Implemented and Tested
