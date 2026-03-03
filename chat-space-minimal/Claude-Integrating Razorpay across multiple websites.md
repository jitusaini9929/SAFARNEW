# Integrating Razorpay across multiple websites

**User:** Shashank (shashank181002@gmail.com)  
**Created:** 2/11/2026 21:05:43  
**Updated:** 2/11/2026 21:11:39  
**Exported:** 2/11/2026 21:12:02  
**Link:** [https://claude.ai/chat/cfe530ce-92b1-4743-ab7f-7a5b9d939b6f](https://claude.ai/chat/cfe530ce-92b1-4743-ab7f-7a5b9d939b6f)  

## Prompt:
2/11/2026, 9:05:45 PM

i have a doubt :  I have created some courses and want to sell , i have an old website that has paymenr gateway razaorpay - which asks user to create account in that website and then lets them pay . i have made new website - and i have courses there and want to sell the users but i have redirected the payment gatway link url of my old website  , now the user has to create account in two website to pay for the course. 

What are my options that i can use the same payment gateway for two websites but user need not go to old wesite to pay , instead i can integrate the same payment gateway to my new website ?? I mean a single payment gateway used by two website, is it possible ??



## Response:
2/11/2026, 9:06:01 PM

````plaintext
Thought process: Analyzed payment gateway integration across multiple websites.

The user is asking about using the same payment gateway (Razorpay) across two websites without requiring users to create accounts on both sites. They currently have:
- Old website with Razorpay payment gateway that requires account creation
- New website with courses, but payment is redirected to the old website
- This creates a poor user experience - users must create accounts on both sites

They want to know if they can use the same Razorpay account/integration on both websites without users needing to go to the old website.

This is a technical question about payment gateway integration, not something that requires computer use or file creation. I can answer this directly based on my knowledge of how payment gateways like Razorpay work.

Key points to address:
1. Yes, one Razorpay account can be used on multiple websites
2. The account creation issue is likely their own implementation, not Razorpay's requirement
3. They need to integrate Razorpay properly on the new website
4. Explain the options clearly

I don't need to use any tools for this - it's a straightforward technical question I can answer conversationally.
````

Yes, absolutely! You can use the **same Razorpay account across multiple websites**. This is a common and supported practice. Let me clarify your options:

## The Good News

**One Razorpay account can power unlimited websites.** The key issue you're facing isn't about Razorpay - it's about how you've implemented user accounts on your websites.

## Your Options

### **Option 1: Integrate Razorpay Directly on New Website** (Recommended)
- Install Razorpay on your new website using the same API keys from your Razorpay account
- Users create account ONLY on the new website
- Payment happens directly on new website without redirecting to old site
- **This is the cleanest solution**

**What you need:**
- Your Razorpay API Key ID and Secret (from Razorpay Dashboard)
- Integrate Razorpay checkout on your new website
- Handle payment callbacks/webhooks on the new website

### **Option 2: Single Sign-On (SSO)**
- If you want to keep using both websites, implement SSO so one account works on both
- More complex, only worth it if you truly need both websites active

### **Option 3: Migrate Everything to New Website**
- Move all courses to new website
- Redirect old website visitors to new site
- Sunset the old website gradually

## Key Point

The requirement for users to "create account on old website to pay" is **your implementation**, not Razorpay's requirement. Razorpay doesn't force this - it's just how your old website is coded.

**What you should do:** Integrate Razorpay properly on your new website so payment happens there directly, without any redirect to the old site.

Would you like help with the technical steps to integrate Razorpay on your new website?



## Prompt:
2/11/2026, 9:07:32 PM

yes and tell me what credentail i need from the razor pay to integrate this paywall in my new website .



## Response:
2/11/2026, 9:07:56 PM

````plaintext
Thought process: Synthesized Razorpay integration steps and credential requirements.

The user wants to know:
1. How to integrate Razorpay on their new website
2. What credentials they need from Razorpay

Let me provide a clear, step-by-step guide for Razorpay integration along with the exact credentials needed.
````

Great! Here's what you need and how to integrate Razorpay on your new website:

## Credentials You Need from Razorpay

### **1. API Keys (Most Important)**
From your Razorpay Dashboard:
- **Key ID** (starts with `rzp_test_` or `rzp_live_`)
- **Key Secret** (keep this SECRET - never expose in frontend code)

**How to get them:**
1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to **Settings** → **API Keys**
3. Generate keys if you haven't already
4. You'll see:
   - **Test Mode** keys (for testing)
   - **Live Mode** keys (for actual payments)

### **2. Webhook Secret** (Optional but recommended)
- Used to verify payment notifications
- Found in **Settings** → **Webhooks**

---

## Integration Steps

### **Step 1: Choose Integration Method**

**For simple integration:**
- **Standard Checkout** - Razorpay's hosted payment page (easiest)

**For custom experience:**
- **Custom Checkout** - Embedded on your site
- **Payment Links** - No coding required
- **Payment Pages** - Shareable links

### **Step 2: Basic Integration Code**

Here's a simple example using **Standard Checkout**:

```html
<!-- Frontend: Payment Button -->
<button id="rzp-button">Pay Now</button>

<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
document.getElementById('rzp-button').onclick = function(e){
    var options = {
        "key": "rzp_test_XXXXXXXX", // Your Key ID (frontend safe)
        "amount": "50000", // Amount in paise (500.00 INR)
        "currency": "INR",
        "name": "Your Course Name",
        "description": "Course Purchase",
        "image": "https://yourwebsite.com/logo.png",
        "handler": function (response){
            // Payment successful
            alert('Payment ID: ' + response.razorpay_payment_id);
            // Send to your backend to verify
            verifyPayment(response);
        },
        "prefill": {
            "name": "Customer Name",
            "email": "customer@example.com",
            "contact": "9999999999"
        },
        "theme": {
            "color": "#3399cc"
        }
    };
    var rzp1 = new Razorpay(options);
    rzp1.open();
    e.preventDefault();
}

function verifyPayment(response) {
    // Send payment details to your backend for verification
    fetch('/verify-payment', {
        method: 'POST',
        body: JSON.stringify(response),
        headers: {'Content-Type': 'application/json'}
    });
}
</script>
```

### **Step 3: Backend Verification (CRITICAL)**

```python
# Backend: Verify payment signature
import hmac
import hashlib

def verify_payment_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
    key_secret = 'YOUR_KEY_SECRET'  # Keep this secret!
    
    message = razorpay_order_id + "|" + razorpay_payment_id
    generated_signature = hmac.new(
        key_secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return generated_signature == razorpay_signature
```

---

## Important Security Notes

### ✅ **DO:**
- Store Key Secret in **environment variables** or secure backend
- Always verify payments on **backend/server-side**
- Use webhooks for payment confirmation
- Start with **Test Mode** keys first

### ❌ **DON'T:**
- Never expose Key Secret in frontend JavaScript
- Don't trust frontend payment confirmations alone
- Don't skip backend verification

---

## Quick Setup Checklist

1. ✅ Get API Keys from Razorpay Dashboard
2. ✅ Test with Test Mode keys first
3. ✅ Integrate checkout on new website
4. ✅ Set up backend verification
5. ✅ Set up webhooks for payment notifications
6. ✅ Test complete payment flow
7. ✅ Switch to Live Mode keys when ready

---

## What Platform is Your Website Built On?

This matters for integration method:
- **WordPress** - Use Razorpay plugin
- **Custom PHP/Python/Node.js** - Use SDK or API
- **Shopify/WooCommerce** - Built-in integration available
- **Static site** - Use Payment Links or Payment Pages

Let me know your platform and I can give you more specific integration code!



## Prompt:
2/11/2026, 9:08:50 PM

node.js



## Response:
2/11/2026, 9:09:26 PM

````plaintext
Thought process: Architected comprehensive Razorpay integration guide for Node.js.

The user has a Node.js website and wants to integrate Razorpay. I should provide them with a complete, production-ready integration example for Node.js including:

1. Installing the Razorpay SDK
2. Creating orders (backend)
3. Frontend integration
4. Payment verification
5. Webhook handling
6. Best practices

Let me provide a comprehensive Node.js integration guide.
````

Perfect! Here's a complete **Node.js integration** for Razorpay:

## Installation

```bash
npm install razorpay
```

---

## Complete Integration Code

### **1. Backend Setup (Node.js/Express)**

```javascript
// server.js or app.js
const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,      // rzp_test_XXXXX or rzp_live_XXXXX
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ====================================
// STEP 1: Create Order (Before Payment)
// ====================================
app.post('/api/create-order', async (req, res) => {
    try {
        const { amount, currency, courseId } = req.body;
        
        const options = {
            amount: amount * 100,  // Amount in paise (multiply by 100)
            currency: currency || 'INR',
            receipt: `receipt_${Date.now()}`,
            notes: {
                courseId: courseId,
                userId: req.user?.id // Your user ID from session
            }
        };

        const order = await razorpay.orders.create(options);
        
        res.json({
            success: true,
            order: order,
            key_id: process.env.RAZORPAY_KEY_ID // Send to frontend
        });
    } catch (error) {
        console.error('Order creation failed:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create order' 
        });
    }
});

// ====================================
// STEP 2: Verify Payment Signature
// ====================================
app.post('/api/verify-payment', async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature 
        } = req.body;

        // Create signature for verification
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        
        const expectedSign = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest('hex');

        if (razorpay_signature === expectedSign) {
            // Payment is verified ✅
            
            // TODO: Update your database
            // - Mark order as paid
            // - Grant course access to user
            // - Send confirmation email
            
            res.json({
                success: true,
                message: 'Payment verified successfully',
                paymentId: razorpay_payment_id
            });
        } else {
            // Signature mismatch ❌
            res.status(400).json({
                success: false,
                message: 'Invalid payment signature'
            });
        }
    } catch (error) {
        console.error('Payment verification failed:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed'
        });
    }
});

// ====================================
// STEP 3: Webhook Handler (Optional but Recommended)
// ====================================
app.post('/api/razorpay-webhook', (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    // Verify webhook signature
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest === req.headers['x-razorpay-signature']) {
        // Webhook verified
        const event = req.body.event;
        const payment = req.body.payload.payment.entity;

        switch(event) {
            case 'payment.authorized':
                console.log('Payment authorized:', payment.id);
                break;
            case 'payment.captured':
                console.log('Payment captured:', payment.id);
                // Grant course access
                break;
            case 'payment.failed':
                console.log('Payment failed:', payment.id);
                // Handle failed payment
                break;
        }
        
        res.json({ status: 'ok' });
    } else {
        res.status(400).json({ error: 'Invalid signature' });
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

---

### **2. Frontend Integration (HTML + JavaScript)**

```html
<!DOCTYPE html>
<html>
<head>
    <title>Course Purchase</title>
</head>
<body>
    <h1>Purchase Course</h1>
    <button id="buy-course-btn">Buy Now - ₹499</button>

    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <script>
        document.getElementById('buy-course-btn').addEventListener('click', async () => {
            try {
                // Step 1: Create order on backend
                const response = await fetch('/api/create-order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        amount: 499,
                        currency: 'INR',
                        courseId: 'course_123'
                    })
                });

                const data = await response.json();

                if (!data.success) {
                    alert('Failed to create order');
                    return;
                }

                // Step 2: Open Razorpay checkout
                const options = {
                    key: data.key_id,
                    amount: data.order.amount,
                    currency: data.order.currency,
                    name: 'Your Course Platform',
                    description: 'Course Purchase',
                    image: 'https://yourwebsite.com/logo.png',
                    order_id: data.order.id,
                    handler: async function (response) {
                        // Step 3: Verify payment on backend
                        const verifyResponse = await fetch('/api/verify-payment', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });

                        const verifyData = await verifyResponse.json();

                        if (verifyData.success) {
                            alert('Payment successful! ✅');
                            // Redirect to course page
                            window.location.href = '/my-courses';
                        } else {
                            alert('Payment verification failed ❌');
                        }
                    },
                    prefill: {
                        name: 'Student Name',
                        email: 'student@example.com',
                        contact: '9999999999'
                    },
                    notes: {
                        courseId: 'course_123'
                    },
                    theme: {
                        color: '#3399cc'
                    }
                };

                const rzp = new Razorpay(options);
                
                rzp.on('payment.failed', function (response) {
                    alert('Payment failed: ' + response.error.description);
                });

                rzp.open();

            } catch (error) {
                console.error('Error:', error);
                alert('Something went wrong');
            }
        });
    </script>
</body>
</html>
```

---

### **3. Environment Variables (.env file)**

```env
# Test Mode (for development)
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=YOUR_TEST_SECRET_KEY

# Live Mode (for production - switch when ready)
# RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXXXXXX
# RAZORPAY_KEY_SECRET=YOUR_LIVE_SECRET_KEY

RAZORPAY_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET
```

**Load environment variables:**
```javascript
require('dotenv').config();
```

Install dotenv:
```bash
npm install dotenv
```

---

## Complete Flow Diagram

```
User clicks "Buy Now"
       ↓
Frontend calls /api/create-order
       ↓
Backend creates Razorpay order
       ↓
Order ID sent to frontend
       ↓
Razorpay checkout opens
       ↓
User completes payment
       ↓
Frontend receives payment details
       ↓
Frontend calls /api/verify-payment
       ↓
Backend verifies signature
       ↓
Grant course access ✅
```

---

## Setup Webhooks (Recommended)

1. Go to Razorpay Dashboard → **Settings** → **Webhooks**
2. Add webhook URL: `https://yourwebsite.com/api/razorpay-webhook`
3. Select events:
   - `payment.authorized`
   - `payment.captured`
   - `payment.failed`
4. Copy the **Webhook Secret** to your `.env` file

---

## Testing

### **Test Cards (Test Mode):**
- **Success:** 4111 1111 1111 1111
- **Failure:** 4111 1111 1111 1112
- **CVV:** Any 3 digits
- **Expiry:** Any future date

### **Test UPI ID:**
- `success@razorpay`

---

## Important Notes

✅ **Always verify on backend** - Never trust frontend alone  
✅ **Use environment variables** - Never hardcode secrets  
✅ **Test in Test Mode first** - Switch to Live Mode only after thorough testing  
✅ **Capture payments** - Auto-capture is enabled by default  
✅ **Handle webhooks** - For reliable payment notifications  

Need help with any specific part?



## Prompt:
2/11/2026, 9:10:37 PM

where will the transaction history stored , where will the use purachase information stored , everything from time of urchase to amout debited credited , refund everything . 

For context i have postgres database hosted on neon



## Response:
2/11/2026, 9:11:39 PM

````plaintext
Thought process: Architected dual-storage strategy for payment and purchase data management.

The user is asking about where transaction history and purchase information is stored. They need to understand:
1. Where Razorpay stores transaction data (on their side)
2. Where the user should store their own transaction/purchase records (in their PostgreSQL database)
3. What data they should store
4. How to structure their database

This is important because:
- Razorpay stores the payment data on their servers
- But the user needs their own records for their application logic
- They need to link payments to course purchases, users, etc.
- They need this for reporting, refunds, support, etc.

I should explain:
1. Razorpay's role (they store payment data, accessible via dashboard and API)
2. User's database role (storing purchase records, linking to users and courses)
3. Database schema design for PostgreSQL
4. How to sync data between Razorpay and their database
5. What to store and why
````

Great question! You need **TWO places** to store transaction data:

## 1️⃣ **Razorpay's System** (Automatic)
Razorpay automatically stores ALL payment data on their servers:
- Transaction history
- Payment status
- Amount debited/credited
- Refunds
- Customer details
- Timestamps

**Access via:**
- Razorpay Dashboard: https://dashboard.razorpay.com
- Razorpay API (to fetch payment details)

## 2️⃣ **Your PostgreSQL Database** (You Must Create)

You MUST store purchase information in your own database because:
- Link payments to users and courses
- Fast queries (don't call Razorpay API every time)
- Custom business logic
- Reporting and analytics
- Course access control

---

## PostgreSQL Database Schema

Here's a complete schema for your Neon PostgreSQL database:

```sql
-- ====================================
-- 1. ORDERS TABLE
-- ====================================
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(255) UNIQUE NOT NULL,  -- Razorpay order_id (ord_xxxxx)
    user_id INTEGER NOT NULL,                -- Your user ID
    course_id INTEGER NOT NULL,              -- Your course ID
    amount DECIMAL(10, 2) NOT NULL,          -- Amount in INR
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(50) DEFAULT 'created',    -- created, paid, failed, refunded
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys (assuming you have users and courses tables)
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- ====================================
-- 2. PAYMENTS TABLE
-- ====================================
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    payment_id VARCHAR(255) UNIQUE NOT NULL,     -- Razorpay payment_id (pay_xxxxx)
    order_id VARCHAR(255) NOT NULL,              -- Links to orders.order_id
    user_id INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(50) NOT NULL,                 -- authorized, captured, failed, refunded
    method VARCHAR(50),                          -- card, upi, netbanking, wallet
    email VARCHAR(255),
    contact VARCHAR(20),
    
    -- Payment details
    card_last4 VARCHAR(4),                       -- Last 4 digits of card
    card_network VARCHAR(50),                    -- visa, mastercard, rupay
    bank VARCHAR(100),                           -- Bank name for netbanking/UPI
    wallet VARCHAR(50),                          -- Wallet name
    vpa VARCHAR(255),                            -- UPI VPA
    
    -- Razorpay metadata
    razorpay_signature VARCHAR(255),
    razorpay_order_id VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    captured_at TIMESTAMP,
    refunded_at TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

-- ====================================
-- 3. REFUNDS TABLE
-- ====================================
CREATE TABLE refunds (
    id SERIAL PRIMARY KEY,
    refund_id VARCHAR(255) UNIQUE NOT NULL,      -- Razorpay refund_id (rfnd_xxxxx)
    payment_id VARCHAR(255) NOT NULL,            -- Links to payments.payment_id
    order_id VARCHAR(255) NOT NULL,
    user_id INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(50) NOT NULL,                 -- pending, processed, failed
    reason VARCHAR(500),                         -- Refund reason
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (payment_id) REFERENCES payments(payment_id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

-- ====================================
-- 4. COURSE ENROLLMENTS TABLE
-- ====================================
CREATE TABLE course_enrollments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    order_id VARCHAR(255) NOT NULL,              -- Links to orders.order_id
    payment_id VARCHAR(255),                     -- Links to payments.payment_id
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    access_granted BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP,                        -- For time-limited courses
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    
    UNIQUE(user_id, course_id)                   -- Prevent duplicate enrollments
);

-- ====================================
-- 5. TRANSACTION LOGS (Audit Trail)
-- ====================================
CREATE TABLE transaction_logs (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(255),
    payment_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,            -- order_created, payment_captured, refund_processed
    event_data JSONB,                            -- Full Razorpay response
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- INDEXES for better performance
-- ====================================
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX idx_enrollments_user_course ON course_enrollments(user_id, course_id);
CREATE INDEX idx_transaction_logs_order ON transaction_logs(order_id);
```

---

## Updated Node.js Code with Database Integration

```javascript
const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// PostgreSQL connection (Neon)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ====================================
// CREATE ORDER
// ====================================
app.post('/api/create-order', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { amount, courseId, userId } = req.body;
        
        // Create Razorpay order
        const options = {
            amount: amount * 100,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            notes: { courseId, userId }
        };

        const razorpayOrder = await razorpay.orders.create(options);
        
        // Save order to database
        await client.query(
            `INSERT INTO orders (order_id, user_id, course_id, amount, currency, status)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [razorpayOrder.id, userId, courseId, amount, 'INR', 'created']
        );
        
        // Log transaction
        await client.query(
            `INSERT INTO transaction_logs (order_id, event_type, event_data)
             VALUES ($1, $2, $3)`,
            [razorpayOrder.id, 'order_created', JSON.stringify(razorpayOrder)]
        );
        
        res.json({
            success: true,
            order: razorpayOrder,
            key_id: process.env.RAZORPAY_KEY_ID
        });
        
    } catch (error) {
        console.error('Order creation failed:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
});

// ====================================
// VERIFY PAYMENT
// ====================================
app.post('/api/verify-payment', async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature 
        } = req.body;

        // Verify signature
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest('hex');

        if (razorpay_signature !== expectedSign) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Invalid signature' });
        }

        // Fetch payment details from Razorpay
        const payment = await razorpay.payments.fetch(razorpay_payment_id);
        
        // Get order from database
        const orderResult = await client.query(
            'SELECT * FROM orders WHERE order_id = $1',
            [razorpay_order_id]
        );
        
        if (orderResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        const order = orderResult.rows[0];
        
        // Save payment to database
        await client.query(
            `INSERT INTO payments (
                payment_id, order_id, user_id, amount, currency, status, 
                method, email, contact, card_last4, card_network, bank, 
                wallet, vpa, razorpay_signature, razorpay_order_id, captured_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
            [
                payment.id,
                razorpay_order_id,
                order.user_id,
                payment.amount / 100,
                payment.currency,
                payment.status,
                payment.method,
                payment.email,
                payment.contact,
                payment.card?.last4 || null,
                payment.card?.network || null,
                payment.bank || null,
                payment.wallet || null,
                payment.vpa || null,
                razorpay_signature,
                razorpay_order_id,
                new Date()
            ]
        );
        
        // Update order status
        await client.query(
            'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE order_id = $2',
            ['paid', razorpay_order_id]
        );
        
        // Grant course access
        await client.query(
            `INSERT INTO course_enrollments (user_id, course_id, order_id, payment_id, access_granted)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id, course_id) DO NOTHING`,
            [order.user_id, order.course_id, razorpay_order_id, payment.id, true]
        );
        
        // Log transaction
        await client.query(
            `INSERT INTO transaction_logs (order_id, payment_id, event_type, event_data)
             VALUES ($1, $2, $3, $4)`,
            [razorpay_order_id, payment.id, 'payment_captured', JSON.stringify(payment)]
        );
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: 'Payment verified and course access granted',
            paymentId: payment.id
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Payment verification failed:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
});

// ====================================
// PROCESS REFUND
// ====================================
app.post('/api/refund', async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { paymentId, amount, reason } = req.body;
        
        // Process refund via Razorpay
        const refund = await razorpay.payments.refund(paymentId, {
            amount: amount * 100,
            notes: { reason }
        });
        
        // Get payment details
        const paymentResult = await client.query(
            'SELECT * FROM payments WHERE payment_id = $1',
            [paymentId]
        );
        
        if (paymentResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }
        
        const payment = paymentResult.rows[0];
        
        // Save refund to database
        await client.query(
            `INSERT INTO refunds (refund_id, payment_id, order_id, user_id, amount, currency, status, reason, processed_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                refund.id,
                paymentId,
                payment.order_id,
                payment.user_id,
                amount,
                'INR',
                refund.status,
                reason,
                new Date()
            ]
        );
        
        // Update payment status
        await client.query(
            'UPDATE payments SET status = $1, refunded_at = CURRENT_TIMESTAMP WHERE payment_id = $2',
            ['refunded', paymentId]
        );
        
        // Update order status
        await client.query(
            'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE order_id = $2',
            ['refunded', payment.order_id]
        );
        
        // Revoke course access
        await client.query(
            'UPDATE course_enrollments SET access_granted = FALSE WHERE payment_id = $1',
            [paymentId]
        );
        
        // Log transaction
        await client.query(
            `INSERT INTO transaction_logs (order_id, payment_id, event_type, event_data)
             VALUES ($1, $2, $3, $4)`,
            [payment.order_id, paymentId, 'refund_processed', JSON.stringify(refund)]
        );
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: 'Refund processed successfully',
            refundId: refund.id
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Refund failed:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
});

// ====================================
// GET USER'S TRANSACTION HISTORY
// ====================================
app.get('/api/user/:userId/transactions', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const result = await pool.query(
            `SELECT 
                o.order_id,
                o.amount,
                o.status as order_status,
                o.created_at as order_date,
                p.payment_id,
                p.method,
                p.status as payment_status,
                p.captured_at,
                c.name as course_name,
                r.refund_id,
                r.amount as refund_amount,
                r.processed_at as refund_date
            FROM orders o
            LEFT JOIN payments p ON o.order_id = p.order_id
            LEFT JOIN courses c ON o.course_id = c.id
            LEFT JOIN refunds r ON p.payment_id = r.payment_id
            WHERE o.user_id = $1
            ORDER BY o.created_at DESC`,
            [userId]
        );
        
        res.json({
            success: true,
            transactions: result.rows
        });
        
    } catch (error) {
        console.error('Failed to fetch transactions:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

---

## Environment Variables (.env)

```env
# Razorpay
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=YOUR_SECRET_KEY

# Neon PostgreSQL
DATABASE_URL=postgresql://username:password@your-neon-host/dbname?sslmode=require
```

Install pg package:
```bash
npm install pg dotenv
```

---

## Summary

| **What** | **Where** | **Purpose** |
|----------|-----------|-------------|
| Payment processing | Razorpay servers | Handle actual money transactions |
| Transaction records | Your PostgreSQL | Link payments to users/courses, reporting |
| Payment details | Both places | Razorpay = source of truth, Your DB = fast queries |
| Refunds | Both places | Razorpay processes, Your DB tracks |
| Course access | Your PostgreSQL | Grant/revoke based on payment status |

**Key Point:** Razorpay is your payment processor, but YOU control the business logic and data in your PostgreSQL database!

Need help setting up the tables in Neon?





---
Powered by [Claude Exporter](https://www.ai-chat-exporter.net)