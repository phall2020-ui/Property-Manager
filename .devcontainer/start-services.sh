#!/bin/bash
set -e

echo "🚀 Starting Property Manager services..."

# Update environment URLs for Gitpod (in case workspace URL changed)
if [ -n "$GITPOD_WORKSPACE_URL" ]; then
    WORKSPACE_URL=$(echo $GITPOD_WORKSPACE_URL | sed 's|https://||')
    FRONTEND_URL="https://3000-${WORKSPACE_URL}"
    BACKEND_URL="https://4000-${WORKSPACE_URL}"
    
    # Update backend .env
    if [ -f /workspaces/Property-Manager/backend/.env ]; then
        sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=${FRONTEND_URL}|g" /workspaces/Property-Manager/backend/.env
        sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=${FRONTEND_URL},http://localhost:3000,http://localhost:5173|g" /workspaces/Property-Manager/backend/.env
    fi
    
    # Update frontend .env.local
    if [ -f /workspaces/Property-Manager/frontend/.env.local ]; then
        sed -i "s|NEXT_PUBLIC_API_BASE=.*|NEXT_PUBLIC_API_BASE=${BACKEND_URL}/api|g" /workspaces/Property-Manager/frontend/.env.local
    fi
fi

# Start backend in background
echo "🔧 Starting backend server..."
cd /workspaces/Property-Manager/backend
nohup npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:4000/api/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "⚠️  Backend took too long to start. Check logs: tail -f /tmp/backend.log"
    fi
    sleep 2
done

# Start frontend in background
echo "🎨 Starting frontend server..."
cd /workspaces/Property-Manager/frontend
nohup npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

# Wait for frontend to be ready
echo "⏳ Waiting for frontend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Frontend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "⚠️  Frontend took too long to start. Check logs: tail -f /tmp/frontend.log"
    fi
    sleep 2
done

# Display access information
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Property Manager is running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -n "$GITPOD_WORKSPACE_URL" ]; then
    WORKSPACE_URL=$(echo $GITPOD_WORKSPACE_URL | sed 's|https://||')
    echo "🌐 Frontend:  https://3000-${WORKSPACE_URL}"
    echo "🔧 Backend:   https://4000-${WORKSPACE_URL}"
    echo "📚 API Docs:  https://4000-${WORKSPACE_URL}/api/docs"
else
    echo "🌐 Frontend:  http://localhost:3000"
    echo "🔧 Backend:   http://localhost:4000"
    echo "📚 API Docs:  http://localhost:4000/api/docs"
fi

echo ""
echo "👤 Test Credentials:"
echo "   Landlord:   landlord@example.com / password123"
echo "   Tenant:     tenant@example.com / password123"
echo "   Contractor: contractor@example.com / password123"
echo ""
echo "📋 Logs:"
echo "   Backend:  tail -f /tmp/backend.log"
echo "   Frontend: tail -f /tmp/frontend.log"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
