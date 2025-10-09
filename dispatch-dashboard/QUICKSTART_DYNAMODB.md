# DynamoDB Integration - Quick Start

## ✅ What's Been Set Up

Your dashboard is now connected to your DynamoDB table:
- **Table**: `elevenlabs-call-data`
- **Region**: `us-east-1`
- **ARN**: `arn:aws:dynamodb:us-east-1:315866721374:table/elevenlabs-call-data`

## 🚀 Quick Setup (2 minutes)

### Option 1: Interactive Setup (Recommended)
```bash
cd dispatch-dashboard
./setup-env.sh
```

### Option 2: Manual Setup
1. Create `.env.local` file in the `dispatch-dashboard` folder
2. Add your AWS credentials:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
DYNAMODB_TABLE_NAME=elevenlabs-call-data
```

## 🔑 Get Your AWS Credentials

1. Go to: https://console.aws.amazon.com/iam/
2. Click "Users" → Your username → "Security credentials"
3. Click "Create access key"
4. Copy both the Access Key ID and Secret Access Key

## 📊 Required DynamoDB Schema

Your table items should include these fields (flexible naming):

```json
{
  "id": "CALL-001",
  "timestamp": "2025-10-08T14:32:00Z",
  "severity": "critical",
  "type": "Medical Emergency",
  "status": "active",
  "description": "Emergency description",
  "caller": "Caller name",
  "address": "Location address",
  "coordinates": [-86.7816, 36.1627],
  "units": ["AMB-12", "ENG-5"]
}
```

**Important**: Only calls with `status: "active"` will be displayed!

## ▶️ Start the Dashboard

```bash
npm run dev
```

Open: http://localhost:3000

## 🔄 How It Works

- Data fetches from DynamoDB on page load
- Auto-refreshes every 10 seconds
- Falls back to local JSON if connection fails
- Only shows active calls (`status: "active"`)

## 🐛 Troubleshooting

**No calls showing?**
- Check browser console (F12) for errors
- Verify your table has items with `status: "active"`
- Test API directly: http://localhost:3000/api/emergencies

**Authentication errors?**
- Double-check credentials in `.env.local`
- Ensure IAM user has DynamoDB read permissions
- Verify table name is correct

**Still having issues?**
- Check detailed setup guide: `DYNAMODB_SETUP.md`
- Verify environment variables loaded: restart dev server after creating `.env.local`

## 🔐 Security Reminder

⚠️ **Never commit `.env.local` to git!** It's already in `.gitignore`.

## 📦 What Was Installed

- `@aws-sdk/client-dynamodb` - DynamoDB client
- `@aws-sdk/lib-dynamodb` - Document client for easier operations

## 🎯 Quick Test

After setup, check if it's working:

```bash
# In browser console:
fetch('/api/emergencies').then(r => r.json()).then(console.log)
```

You should see your active calls from DynamoDB!

