# Network Setup Guide

This guide explains how to resolve network connectivity issues between the mobile app and backend server.

## Quick Fix Steps

### 1. Get Your Local IP Address

Run this command on Windows PowerShell:

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*'} | Select-Object -First 1 | ForEach-Object {$_.IPAddress}
```

On macOS/Linux:

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### 2. Update Configuration

The app uses `app.config.js` which automatically detects your local IP. If you need to manually set it, update the `backendUrl` in `app.config.js`:

```javascript
extra: {
  backendUrl: `http://YOUR_LOCAL_IP:3000/api`,
  // ...
}
```

### 3. Restart Backend Server

Stop the current backend server (Ctrl+C) and restart it:

```bash
cd backend
npm run dev
```

The server should show:

```
Server is running on port 3000
```

### 4. Restart Expo Development Server

Stop the current Expo server (Ctrl+C) and restart with cache cleared:

```bash
# Clear Expo cache and restart
npx expo start --clear
```

Or if you're already in the project root:

```bash
npm start -- --clear
```

### 5. Verify Backend is Accessible

Test the health endpoint using curl:

```bash
curl http://localhost:3000/health
```

You should see a status 200 response with `{"status": "ok"}`.

## Configuration Files

### Backend Configuration

- **File**: `backend/src/app.ts`
- **CORS**: Configured to allow all origins in development
- **Server**: Listens on `0.0.0.0:3000` to accept LAN connections

### Mobile App Configuration

- **File**: `app.config.js` (dynamic) or `app.json` (static)
- **Backend URL**: Automatically detected from local IP or configured in `extra.backendUrl`
- **Service**: `src/services/facilityService.ts` uses the configured URL

## Troubleshooting

### Network Error: ECONNREFUSED

**Cause**: Backend server is not running or not accessible.

**Solution**:

1. Verify backend is running: `cd backend && npm run dev`
2. Check if port 3000 is in use: `netstat -ano | findstr :3000` (Windows)
3. Ensure firewall allows connections on port 3000
4. Verify the IP address in `app.config.js` matches your current local IP

### Network Error: ENOTFOUND

**Cause**: Cannot resolve the hostname/IP address.

**Solution**:

1. Update `app.config.js` with the correct local IP address
2. Ensure both devices (computer and phone) are on the same network
3. Restart Expo with `--clear` flag

### CORS Error

**Cause**: Backend CORS configuration is blocking requests.

**Solution**:

- CORS is already configured in `backend/src/app.ts` to allow all origins
- If issues persist, check that the backend server was restarted after changes

### Health Check Works But Facilities Endpoint Fails

**Cause**: Database connection issue (not a network problem).

**Solution**:

1. Check database connection string in `backend/.env`
2. Verify Prisma client is generated: `cd backend && npx prisma generate`
3. Check backend server logs for database errors

## Testing Connectivity

### Test Health Endpoint

```bash
# Using curl (if available)
curl http://localhost:3000/health
curl http://YOUR_LOCAL_IP:3000/health
```

### Test from Mobile Device

1. Ensure phone and computer are on the same Wi-Fi network
2. Open Expo Go app
3. Scan QR code or enter the connection URL
4. Check Expo logs for API connection attempts
5. Look for `[API]` log messages showing the backend URL being used

## Important Notes

- **Development Only**: The current CORS configuration allows all origins, which is suitable for development but should be restricted in production
- **IP Address Changes**: If your local IP changes (e.g., after reconnecting to Wi-Fi), update `app.config.js` and restart both servers
- **Android Emulator**: Uses `10.0.2.2` automatically - no configuration needed
- **iOS Simulator**: Uses `localhost` automatically - no configuration needed
- **Physical Devices**: Must use the local IP address (e.g., `192.168.1.5`)
