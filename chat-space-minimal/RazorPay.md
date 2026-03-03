# Razorpay Integration Architecture (For SAFAR Project)

## 🎯 Decision

Use:

- Razorpay (Indian payment gateway)
- UPI-first checkout
- Webhook-based unlock system
- MongoDB to store payments
- Redis only for sessions (unchanged)

---

# 🧱 Clean Architecture For Your Stack

## 🔁 Payment Flow (Correct Way)

Frontend (React SPA)  
→ calls `/api/create-order`  
→ Backend creates Razorpay order  
→ Returns `order_id` to frontend  
→ Razorpay Checkout opens  
→ User pays  
→ Razorpay sends webhook to `/api/webhook`  
→ Backend verifies signature  
→ Payment stored in MongoDB  
→ User course unlocked  

---

# 📦 Database Design (MongoDB)

## 1️⃣ payments Collection

```ts
{
  _id,
  userId,
  courseId,
  razorpayOrderId,
  razorpayPaymentId,
  amount,
  status: "created" | "paid" | "failed",
  createdAt,
  paidAt
}
```

## 2️⃣ userCourses Collection

```ts
{
  _id,
  userId,
  courseId,
  unlockedAt
}
```

⚠️ Do NOT depend on frontend confirmation.  
Always trust webhook verification.

---

# 🔐 Webhook Logic (CRITICAL)

Endpoint:

```
POST /api/webhook
```

### Steps:

1. Get raw body  
2. Verify Razorpay signature using webhook secret  
3. Check event type = `payment.captured`  
4. Extract:
   - `order_id`
   - `payment_id`
5. Find payment in MongoDB  
6. Update status to `"paid"`  
7. Insert into `userCourses` collection  
8. Done  

❗ No signature verification = security disaster.

---

# 🧠 Why This Is Important

If you unlock course from frontend success response:

Anyone can:
- Fake success response
- Modify JS
- Unlock without paying

Webhook verification prevents that.

---

# ⚡ Performance Note (Important at 30K Users)

MongoDB is fine.

Add indexes on:

- `userId`
- `razorpayOrderId`
- `status`

Without indexes, payment lookups will slow down as you scale.

---

# 💰 Revenue Scaling Strategy

### Current:
- 1 course = ₹50

### Future:
- Multiple courses < ₹200

---

## Phase 1
Simple one-time payments.

## Phase 2
Add bundle system.

## Phase 3
Add “All Access ₹199/month”.

Subscriptions dramatically increase revenue and improve average order value (AOV).

---

# 🚨 What NOT To Do

❌ Do not use QR-only payments  
❌ Do not manually verify payments  
❌ Do not skip webhook verification  
❌ Do not store Razorpay secret in frontend  
❌ Do not rely on session state for unlock  
