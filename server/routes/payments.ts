import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { collections, getMongoClient } from '../db';
import { requireAuth } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

// ── Razorpay SDK ────────────────────────────────────
let Razorpay: any;
let razorpayInstance: any;

try {
  Razorpay = require('razorpay');
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('✅ Razorpay initialized');
  } else {
    console.warn('⚠️ Razorpay credentials not found. Payment features will be disabled.');
  }
} catch (err) {
  console.warn('⚠️ Razorpay module not found. Payment features will be disabled.');
}

// Available courses
const COURSES: Record<string, any> = {};

try {
  const { COURSES: sharedCourses } = require('@shared/payments');
  Object.assign(COURSES, sharedCourses);
} catch {
  // Fallback
  Object.assign(COURSES, {
    crash_course_1: {
      id: 'crash_course_1',
      name: 'JEE Crash Course 2025',
      description: 'Intensive crash course for JEE Mains',
      amount: 49900,
      currency: 'INR',
      features: ['Live Classes', 'Study Material', 'Mock Tests']
    }
  });
}

function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!process.env.RAZORPAY_KEY_SECRET) return false;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expectedSignature === signature;
}

// ── ROUTES ──────────────────────────────────────────

// GET /api/payments/courses
router.get('/courses', (_req, res) => {
  res.json({ courses: Object.values(COURSES) });
});

// POST /api/payments/create-order
router.post('/create-order', requireAuth, async (req: any, res: Response) => {
  if (!razorpayInstance) return res.status(503).json({ message: 'Payment service unavailable' });

  try {
    const userId = req.session.userId!;
    const { courseId } = req.body;

    const course = COURSES[courseId];
    if (!course) return res.status(400).json({ message: 'Invalid course' });

    // Check existing enrollment
    const existing = await collections.courseEnrollments().findOne({
      user_id: userId, course_id: courseId, access_granted: true
    });
    if (existing) return res.status(400).json({ message: 'Already enrolled in this course' });

    const receipt = `rcpt_${Date.now()}_${userId.slice(0, 8)}`;
    const razorpayOrder = await razorpayInstance.orders.create({
      amount: course.amount,
      currency: course.currency || 'INR',
      receipt,
      notes: { userId, courseId }
    });

    const orderId = uuidv4();
    await collections.orders().insertOne({
      id: orderId,
      razorpay_order_id: razorpayOrder.id,
      user_id: userId,
      course_id: courseId,
      amount: course.amount / 100,
      currency: course.currency || 'INR',
      status: 'created',
      receipt,
      created_at: new Date(),
      updated_at: new Date()
    });

    await collections.transactionLogs().insertOne({
      id: uuidv4(),
      order_id: orderId,
      payment_id: null,
      event_type: 'order_created',
      event_data: { razorpay_order_id: razorpayOrder.id, amount: course.amount, courseId },
      created_at: new Date()
    });

    res.json({
      orderId: razorpayOrder.id,
      amount: course.amount,
      currency: course.currency || 'INR',
      key: process.env.RAZORPAY_KEY_ID,
      courseName: course.name
    });
  } catch (error: any) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Failed to create order' });
  }
});

// POST /api/payments/verify
router.post('/verify', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.session.userId!;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment details' });
    }

    const isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) return res.status(400).json({ message: 'Invalid payment signature' });

    // Use MongoDB session for atomicity
    const mongoClient = getMongoClient();
    const session = mongoClient.startSession();

    try {
      await session.withTransaction(async () => {
        // Update order status
        await collections.orders().updateOne(
          { razorpay_order_id },
          { $set: { status: 'paid', updated_at: new Date() } },
          { session }
        );

        const order = await collections.orders().findOne({ razorpay_order_id }, { session });
        if (!order) throw new Error('Order not found');

        // Record payment
        await collections.payments().insertOne({
          id: uuidv4(),
          razorpay_payment_id,
          razorpay_order_id,
          user_id: userId,
          amount: order.amount,
          currency: order.currency,
          status: 'captured',
          razorpay_signature,
          created_at: new Date(),
          captured_at: new Date()
        }, { session });

        // Create enrollment
        await collections.courseEnrollments().updateOne(
          { user_id: userId, course_id: order.course_id },
          {
            $set: { access_granted: true, razorpay_order_id, razorpay_payment_id },
            $setOnInsert: { id: uuidv4(), user_id: userId, course_id: order.course_id, enrolled_at: new Date() }
          },
          { upsert: true, session }
        );

        // Log
        await collections.transactionLogs().insertOne({
          id: uuidv4(),
          order_id: order.id,
          payment_id: razorpay_payment_id,
          event_type: 'payment_verified',
          event_data: { razorpay_order_id, razorpay_payment_id, amount: order.amount },
          created_at: new Date()
        }, { session });
      });

      res.json({ message: 'Payment verified and enrollment granted', success: true });
    } finally {
      await session.endSession();
    }
  } catch (error: any) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: 'Payment verification failed' });
  }
});

// GET /api/payments/status/:courseId
router.get('/status/:courseId', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.session.userId!;
    const { courseId } = req.params;

    const enrollment = await collections.courseEnrollments().findOne({
      user_id: userId, course_id: courseId
    });

    if (enrollment && enrollment.access_granted) {
      return res.json({ enrolled: true, enrolledAt: enrollment.enrolled_at });
    }

    // Check for pending order
    const pendingOrder = await collections.orders().findOne({
      user_id: userId, course_id: courseId, status: 'created'
    });

    res.json({
      enrolled: false,
      hasPendingOrder: !!pendingOrder,
      pendingOrderId: pendingOrder?.razorpay_order_id || null
    });
  } catch (error: any) {
    console.error('Payment status error:', error);
    res.status(500).json({ message: 'Failed to check payment status' });
  }
});

// GET /api/payments/history
router.get('/history', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.session.userId!;

    const orders = await collections.orders()
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .toArray();

    // Get payment info for each order
    const history = [];
    for (const order of orders) {
      const payment = await collections.payments().findOne({ razorpay_order_id: order.razorpay_order_id });
      const course = COURSES[order.course_id];

      history.push({
        orderId: order.razorpay_order_id,
        courseName: course?.name || order.course_id,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        paymentId: payment?.razorpay_payment_id || null,
        paymentMethod: payment?.method || null,
        createdAt: order.created_at,
        paidAt: payment?.captured_at || null
      });
    }

    res.json({ transactions: history });
  } catch (error: any) {
    console.error('Payment history error:', error);
    res.status(500).json({ message: 'Failed to fetch transaction history' });
  }
});

// GET /api/payments/enrollments
router.get('/enrollments', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.session.userId!;

    const enrollments = await collections.courseEnrollments()
      .find({ user_id: userId, access_granted: true })
      .toArray();

    const result = enrollments.map(e => ({
      courseId: e.course_id,
      courseName: COURSES[e.course_id]?.name || e.course_id,
      enrolledAt: e.enrolled_at,
      expiresAt: e.expires_at
    }));

    res.json({ enrollments: result });
  } catch (error: any) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ message: 'Failed to fetch enrollments' });
  }
});

export const paymentRoutes = router;
