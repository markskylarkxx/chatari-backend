# WhatFlow — Backend Setup Guide

WhatsApp Business automation SaaS for Nigerian small businesses.

---

## Prerequisites

- Node.js 18+
- A Supabase account (free) → https://supabase.com
- A Meta Developer account (free) → https://developers.facebook.com
- An Anthropic account (free trial) → https://console.anthropic.com
- A Paystack account (free) → https://paystack.com

---

## Step 1 — Install dependencies

```bash
npm install
```

---

## Step 2 — Set up environment variables

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`. See comments in the file for where to get each value.

---

## Step 3 — Set up the database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

---

## Step 4 — Run the development server

```bash
npm run dev
```

The app runs at http://localhost:3000

---

## Step 5 — Expose your local server for Meta webhook (dev only)

Meta needs a public HTTPS URL to send webhook events to.
Use ngrok or cloudflare tunnel during development:

```bash
# Option A: ngrok (free)
npx ngrok http 3000

# Option B: Cloudflare Tunnel (free, more stable)
npx cloudflared tunnel --url http://localhost:3000
```

Copy the public URL (e.g. https://abc123.ngrok.io) and:
1. Go to Meta Developer Console → Your App → WhatsApp → Configuration
2. Set Webhook URL to: https://your-ngrok-url.io/api/webhook
3. Set Verify Token to: the value of META_WEBHOOK_VERIFY_TOKEN in your .env.local
4. Subscribe to the "messages" webhook field

---

## Step 6 — Deploy to production

```bash
# Deploy to Vercel
npx vercel --prod
```

After deploying, update your Meta webhook URL to your production domain.

---

## API Routes Reference

| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | /api/webhook | Meta WhatsApp webhook |
| POST | /api/send-message | Send manual reply from inbox |
| GET | /api/conversations | List all conversations |
| GET/PATCH | /api/conversations/[id] | Single conversation + status update |
| GET/POST | /api/products | List + create products |
| PATCH/DELETE | /api/products/[id] | Update + delete product |
| GET | /api/contacts | List contacts |
| PATCH | /api/contacts/[id] | Update contact name |
| GET | /api/orders | List orders |
| PATCH | /api/orders/[id] | Update order status |
| GET/POST | /api/flows | List + create conversation flows |
| GET/POST | /api/broadcasts | List + send broadcasts |
| GET | /api/analytics | Dashboard stats + chart data |
| GET/PATCH | /api/settings | Business settings + AI config |
| GET | /api/auth/callback | Supabase auth callback |
| GET | /api/paystack/verify | Payment verification |

---

## Architecture Notes

### How a message flows through the system

```
Customer sends WhatsApp message
        ↓
Meta sends POST to /api/webhook
        ↓
We respond 200 immediately (< 100ms)
        ↓
Background processing begins:
  1. Find/create Contact
  2. Find/create Conversation
  3. Save inbound Message to DB
  4. Check if any Flow trigger matches
     YES → Send flow response
     NO  → Call Claude API → Send AI reply
  5. Save outbound Message to DB
```

### AI reply context

The AI is given:
- Business name and personality instructions
- Full product catalogue with prices
- Last 10 messages of conversation history

This means the AI can maintain context across a conversation and never quotes wrong prices.

### Cost per customer (monthly estimate)

- Supabase: free (up to 500MB)
- Vercel: free (up to 100GB bandwidth)
- Meta API: free (up to 1,000 conversations)
- Claude API: ~$3–5 (for a typical small business volume)
- Total cost to serve 1 customer: ~$3–5/month
- You charge: ₦7,500–₦30,000/month
- Margin: very healthy

---

## Folder Structure
whatflow-backend/
├── app/api/              # ✅ Full REST API routes
│   ├── auth/            # Authentication endpoints
│   ├── conversations/   # Chat management
│   ├── orders/          # Order processing
│   ├── products/        # Product catalogue
│   ├── contacts/        # Customer contacts
│   ├── broadcasts/      # WhatsApp broadcasts
│   ├── flows/           # Automation flows (no-code builder)
│   ├── analytics/       # Business analytics
│   ├── paystack/        # Payment integration
│   ├── settings/        # Business settings
│   ├── webhook/         # WhatsApp webhook handler
│   └── send-message/    # Send WhatsApp messages
├── lib/                 # Shared utilities
├── prisma/              #  Database schema & ORM
├── types/               # TypeScript definitions
├── middleware.ts        # Auth middleware
└── package.json



Register a new business

curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "business@example.com",
    "name": "Chioma Okafor",
    "businessName": "Chioma's Fashion Store",
    "whatsappNumber": "+2348012345678"
  }'

  Login
  curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "business@example.com",
    "password": "yourpassword"
  }'

  Logout
  curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

  Get Current user
  curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"


  Get all Conversations
  curl -X GET http://localhost:3000/api/conversations \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# With filters
curl -X GET "http://localhost:3000/api/conversations?status=open&limit=20&page=1" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"


  Get single Conversation
  curl -X GET http://localhost:3000/api/conversations/conv_123456 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

  Get conversation messages
curl -X GET http://localhost:3000/api/conversations/conv_123456/messages \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

  Send a message
curl -X POST http://localhost:3000/api/conversations/conv_123456/messages \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello! Your order will be delivered tomorrow.",
    "direction": "outbound"
  }'

  Close conversation
curl -X PATCH http://localhost:3000/api/conversations/conv_123456 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "closed"
  }'
  Get all orders

  curl -X GET http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# With filters
curl -X GET "http://localhost:3000/api/orders?status=pending&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

  Get Single Order
  curl -X GET http://localhost:3000/api/orders/ord_123456 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

  Create New order
  curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "cont_123456",
    "items": [
      {"name": "Red Dress", "price": 25000, "quantity": 1},
      {"name": "Black Bag", "price": 15000, "quantity": 2}
    ],
    "total": 55000,
    "notes": "Please deliver to 123 Main Street, Lagos"
  }'

  Update Order status
  curl -X PATCH http://localhost:3000/api/orders/ord_123456 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed"
  }'

  Delete Order 
  curl -X DELETE http://localhost:3000/api/orders/ord_123456 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

  Get all product

  curl -X GET http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

  Get Single Product
  curl -X GET http://localhost:3000/api/products/prod_123456 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

  Create Product

  curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ankara Maxi Dress",
    "description": "Beautiful African print dress",
    "price": 35000,
    "inStock": true
  }'

  Update product

curl -X PATCH http://localhost:3000/api/products/prod_123456 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 32000,
    "inStock": false
  }'




  Delete product
bash
curl -X DELETE http://localhost:3000/api/products/prod_123456 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
Contacts/Customers Endpoints
Get all contacts
bash
curl -X GET http://localhost:3000/api/contacts \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Search contacts
curl -X GET "http://localhost:3000/api/contacts?search=Chioma" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
Get single contact
bash
curl -X GET http://localhost:3000/api/contacts/cont_123456 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
Update contact
bash
curl -X PATCH http://localhost:3000/api/contacts/cont_123456 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Chioma Okafor",
    "phoneNumber": "+2348098765432"
  }'
Flows (Automation) Endpoints
Get all flows
bash
curl -X GET http://localhost:3000/api/flows \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
Create flow
bash
curl -X POST http://localhost:3000/api/flows \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome Message",
    "trigger": "hello",
    "steps": [
      {"message": "Welcome to Chioma Fashion! How can we help you today?", "waitForReply": true},
      {"message": "Would you like to see our latest collection?", "waitForReply": false}
    ]
  }'
Update flow
bash
curl -X PATCH http://localhost:3000/api/flows/flow_123456 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Customer Welcome",
    "isActive": true
  }'
Delete flow
bash
curl -X DELETE http://localhost:3000/api/flows/flow_123456 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
Broadcasts Endpoints
Get all broadcasts
bash
curl -X GET http://localhost:3000/api/broadcasts \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
Create broadcast
bash
curl -X POST http://localhost:3000/api/broadcasts \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "FLASH SALE! 30% off all dresses today only! Use code FLASH30",
    "scheduledAt": "2025-05-10T10:00:00Z"
  }'
Send broadcast now
bash
curl -X POST http://localhost:3000/api/broadcasts/bc_123456/send \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
Delete broadcast
bash
curl -X DELETE http://localhost:3000/api/broadcasts/bc_123456 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
Analytics Endpoints
Get dashboard stats
bash
curl -X GET http://localhost:3000/api/analytics/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Response example:
# {
#   "totalConversations": 245,
#   "totalOrders": 89,
#   "totalRevenue": 2450000,
#   "responseRate": 94,
#   "avgResponseTime": 2.5
# }


Get conversation analytics

curl -X GET "http://localhost:3000/api/analytics/conversations?period=7d" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
Get sales analytics

curl -X GET "http://localhost:3000/api/analytics/sales?period=month" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
Business Settings Endpoints
Get business settings

curl -X GET http://localhost:3000/api/settings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
Update business settings

curl -X PATCH http://localhost:3000/api/settings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Chioma's Fashion Hub",
    "aiPersonality": "Friendly and helpful fashion assistant",
    "aiEnabled": true,
    "whatsappNumber": "+2348012345678"
  }'
Update AI settings

curl -X PATCH http://localhost:3000/api/settings/ai \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "aiEnabled": true,
    "aiPersonality": "You are a helpful fashion consultant. Be friendly and suggest products based on customer preferences."
  }'
WhatsApp Integration Endpoints
Get WhatsApp status

curl -X GET http://localhost:3000/api/whatsapp/status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
Connect WhatsApp number

curl -X POST http://localhost:3000/api/whatsapp/connect \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+2348012345678",
    "phoneNumberId": "1234567890",
    "wabaId": "9876543210"
  }'
Webhook receiver (WhatsApp sends here)

curl -X POST http://localhost:3000/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [
      {
        "id": "12345",
        "changes": [
          {
            "value": {
              "messages": [
                {
                  "from": "2348012345678",
                  "text": {"body": "Hello, do you have red dresses?"},
                  "type": "text"
                }
              ]
            }
          }
        ]
      }
    ]
  }'
Paystack Payment Endpoints
Initialize payment

curl -X POST http://localhost:3000/api/paystack/initialize \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "amount": 55000,
    "orderId": "ord_123456"
  }'
Verify payment

curl -X GET http://localhost:3000/api/paystack/verify?reference=ref_123456 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

Payment webhook (Paystack sends here)

curl -X POST http://localhost:3000/api/paystack/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "charge.success",
    "data": {
      "reference": "ref_123456",
      "amount": 55000,
      "status": "success"
    }
  }'
Search Endpoints
Global search

curl -X GET "http://localhost:3000/api/search?q=Chioma" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Search in specific collections
curl -X GET "http://localhost:3000/api/search?q=dress&type=products" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
Export Endpoints

Export conversations

curl -X GET "http://localhost:3000/api/export/conversations?format=csv" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  --output conversations.csv
Export orders

curl -X GET "http://localhost:3000/api/export/orders?format=csv" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  --output orders.csv



Health Check
Check if API is running

curl -X GET http://localhost:3000/health

# Response:
# {"status":"ok","timestamp":"2025-01-09T10:00:00.000Z"}



TESTING

# Create test conversation
curl -X POST http://localhost:3000/api/conversations \
  -H "Content-Type: application/json" \
  -d '{
    "contactPhone": "+2348012345678",
    "contactName": "Chioma Test",
    "message": "I want to buy a red dress"
  }'

# Create test order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "contactPhone": "+2348012345678",
    "items": [{"name": "Red Dress", "price": 25000, "quantity": 1}],
    "total": 25000
  }'


  


  Test 1 — Simulate a WhatsApp message coming in:
bashcurl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "field": "messages",
        "value": {
          "metadata": { "phone_number_id": "test_phone_id" },
          "messages": [{
            "from": "2348012345678",
            "id": "wamid.test456",
            "type": "text",
            "timestamp": "1234567890",
            "text": { "body": "I want to buy a red dress" }
          }]
        }
      }]
    }]
  }'
Test 2 — Check the conversation was created:
bashcurl http://localhost:3000/api/conversations
Test 3 — Check products route:
bashcurl http://localhost:3000/api/products
Test 4 — Add a product:
bashcurl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Red Dress", "price": 15000, "description": "Beautiful red gown", "inStock": true}'