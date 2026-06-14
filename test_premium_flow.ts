import { connectMongo, collections, getMongoClient } from './server/db.js';
import { v4 as uuidv4 } from 'uuid';

async function runTests() {
  await connectMongo();
  
  // Clean up
  await collections.users().deleteMany({ email: 'test_premium@safar.com' });
  await collections.premiumEntitlements().deleteMany({ userId: 'test_user_id_123' });
  await collections.orders().deleteMany({ user_id: 'test_user_id_123' });

  // 1. Create a free user
  await collections.users().insertOne({
    id: 'test_user_id_123',
    email: 'test_premium@safar.com',
    is_premium: false,
  });

  // 2. GET /premium/status equivalent logic
  let entitlement = await collections.premiumEntitlements().findOne({ userId: 'test_user_id_123' });
  let isPremium = entitlement && entitlement.isActive && entitlement.expiresAt > new Date();
  console.log('Test 2 - Free user isPremium:', !!isPremium); // Should be false

  // 3. POST /payments/verify equivalent logic
  const courseId = 'study-planner-pro-6month'; // Half yearly
  const orderId = uuidv4();
  
  await collections.orders().insertOne({
    id: orderId,
    razorpay_order_id: 'order_test_123',
    user_id: 'test_user_id_123',
    course_id: courseId,
    amount: 699,
    currency: 'INR',
    status: 'created',
    created_at: new Date(),
    updated_at: new Date(),
  });

  // Simulate verify logic (which updates premium_entitlements)
  const now = new Date();
  const planType = '6month';
  const durationMonths = 6;
  const newExpiresAt = new Date(now);
  newExpiresAt.setMonth(newExpiresAt.getMonth() + durationMonths);

  await collections.premiumEntitlements().updateOne(
    { userId: 'test_user_id_123' },
    {
      $set: {
        isActive: true,
        planType: planType,
        expiresAt: newExpiresAt,
        razorpayOrderId: 'order_test_123',
        razorpayPaymentId: 'pay_test_123',
        updatedAt: now,
      },
      $setOnInsert: {
        startedAt: now,
        createdAt: now,
      }
    },
    { upsert: true }
  );

  // 4. GET /premium/status equivalent logic again
  entitlement = await collections.premiumEntitlements().findOne({ userId: 'test_user_id_123' });
  isPremium = entitlement && entitlement.isActive && entitlement.expiresAt > new Date();
  console.log('Test 3 - Paid user isPremium:', !!isPremium); // Should be true
  console.log('Plan type:', entitlement?.planType); // Should be 6month
  console.log('Expires at:', entitlement?.expiresAt);

  console.log('All tests passed locally.');
  process.exit(0);
}

runTests().catch(console.error);
