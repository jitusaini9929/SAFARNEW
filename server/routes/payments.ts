import { Router, Request, Response } from "express";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";
import type {
  CreateOrderRequest,
  CreateOrderResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  PaymentStatusResponse,
  TransactionHistoryResponse,
} from "@shared/payments";

// Augment Express Request to include session
declare module "express" {
  interface Request {
    session: {
      userId?: string;
      destroy: (cb?: (err?: any) => void) => void;
      [key: string]: any;
    };
  }
}

// ═══════════════════════════════════════════════════════
// Razorpay Configuration
// ═══════════════════════════════════════════════════════

// Import Razorpay - using dynamic import since it's a CommonJS module
import Razorpay from "razorpay";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_MOCK_KEY_ID";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "MOCK_KEY_SECRET";

let razorpayInstance: InstanceType<typeof Razorpay> | null = null;

function getRazorpay() {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
}

// Course catalog - imported from shared but server keeps its own source of truth
const COURSES = [
  {
    id: "safar-30",
    name: "SAFAR 30-Day Meditation Course",
    description:
      "A 30-day guided meditation journey to build a consistent practice, reduce stress, and deepen self-awareness.",
    price: 499,
    currency: "INR",
    imageUrl: "/Banner.jpeg",
  },
];

function getCourseById(courseId: string) {
  return COURSES.find((c) => c.id === courseId) || null;
}

// ═══════════════════════════════════════════════════════
// Router
// ═══════════════════════════════════════════════════════

export const paymentRoutes = Router();

// All payment routes require auth
paymentRoutes.use(requireAuth);

// ─────────────────────────────────────────────────────
// POST /api/payments/create-order
// Creates a Razorpay order and stores it in DB
// ─────────────────────────────────────────────────────
paymentRoutes.post("/create-order", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const { courseId } = req.body as CreateOrderRequest;

    const course = getCourseById(courseId);
    if (!course) {
      return res.status(400).json({ success: false, message: "Invalid course ID" });
    }

    // Check if user already purchased this course
    const existingPurchase = await pool.query(
      `SELECT id FROM course_enrollments 
       WHERE user_id = $1 AND course_id = $2 AND access_granted = TRUE`,
      [userId, courseId]
    );

    if (existingPurchase.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "You have already purchased this course",
      });
    }

    // Create Razorpay order
    const razorpay = getRazorpay();
    const receipt = `rcpt_${Date.now()}_${uuidv4().slice(0, 8)}`;

    const razorpayOrder = await razorpay.orders.create({
      amount: course.price * 100, // Amount in paise
      currency: course.currency,
      receipt,
      notes: {
        courseId,
        userId,
        courseName: course.name,
      },
    });

    // Store order in DB
    const orderId = uuidv4();
    await pool.query(
      `INSERT INTO orders (id, razorpay_order_id, user_id, course_id, amount, currency, status, receipt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [orderId, razorpayOrder.id, userId, courseId, course.price, course.currency, "created", receipt]
    );

    // Log transaction
    await pool.query(
      `INSERT INTO transaction_logs (id, order_id, event_type, event_data)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), razorpayOrder.id, "order_created", JSON.stringify(razorpayOrder)]
    );

    const response: CreateOrderResponse = {
      success: true,
      order: {
        id: razorpayOrder.id,
        amount: Number(razorpayOrder.amount),
        currency: razorpayOrder.currency,
        receipt,
      },
      keyId: RAZORPAY_KEY_ID,
      course,
    };

    res.json(response);
  } catch (error: any) {
    console.error("❌ Order creation failed:", error);
    res.status(500).json({ success: false, message: "Failed to create order" });
  }
});

// ─────────────────────────────────────────────────────
// POST /api/payments/verify
// Verifies Razorpay payment signature and grants access
// ─────────────────────────────────────────────────────
paymentRoutes.post("/verify", async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userId = req.session.userId!;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
    } = req.body as VerifyPaymentRequest;

    // Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    // Fetch payment details from Razorpay
    const razorpay = getRazorpay();
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    // Get order from DB
    const orderResult = await client.query(
      "SELECT * FROM orders WHERE razorpay_order_id = $1 AND user_id = $2",
      [razorpay_order_id, userId]
    );

    if (orderResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orderResult.rows[0];

    // Save payment to DB
    const paymentId = uuidv4();
    await client.query(
      `INSERT INTO payments (
        id, razorpay_payment_id, razorpay_order_id, user_id, amount, currency, status,
        method, email, contact, card_last4, card_network, bank, wallet, vpa,
        razorpay_signature, captured_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        paymentId,
        payment.id,
        razorpay_order_id,
        userId,
        Number(payment.amount) / 100,
        payment.currency,
        payment.status,
        payment.method,
        payment.email || null,
        payment.contact || null,
        (payment as any).card?.last4 || null,
        (payment as any).card?.network || null,
        payment.bank || null,
        payment.wallet || null,
        payment.vpa || null,
        razorpay_signature,
        new Date(),
      ]
    );

    // Update order status
    await client.query(
      "UPDATE orders SET status = $1, updated_at = NOW() WHERE razorpay_order_id = $2",
      ["paid", razorpay_order_id]
    );

    // Grant course access
    const enrollmentId = uuidv4();
    await client.query(
      `INSERT INTO course_enrollments (id, user_id, course_id, razorpay_order_id, razorpay_payment_id, access_granted)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       ON CONFLICT (user_id, course_id) DO UPDATE SET access_granted = TRUE, razorpay_payment_id = $5`,
      [enrollmentId, userId, courseId, razorpay_order_id, razorpay_payment_id]
    );

    // Log transaction
    await client.query(
      `INSERT INTO transaction_logs (id, order_id, payment_id, event_type, event_data)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), razorpay_order_id, payment.id, "payment_captured", JSON.stringify(payment)]
    );

    await client.query("COMMIT");

    const response: VerifyPaymentResponse = {
      success: true,
      message: "Payment verified and course access granted!",
      paymentId: payment.id as string,
      enrollmentId,
    };

    res.json(response);
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("❌ Payment verification failed:", error);
    res.status(500).json({ success: false, message: "Payment verification failed" });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────
// GET /api/payments/status/:courseId
// Check if user has purchased a specific course
// ─────────────────────────────────────────────────────
paymentRoutes.get("/status/:courseId", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const { courseId } = req.params;

    const result = await pool.query(
      `SELECT ce.id, p.razorpay_payment_id, p.amount, p.status, p.method, p.captured_at
       FROM course_enrollments ce
       LEFT JOIN payments p ON ce.razorpay_payment_id = p.razorpay_payment_id
       WHERE ce.user_id = $1 AND ce.course_id = $2 AND ce.access_granted = TRUE`,
      [userId, courseId]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      const response: PaymentStatusResponse = {
        purchased: true,
        payment: {
          paymentId: row.razorpay_payment_id,
          amount: row.amount,
          status: row.status,
          method: row.method,
          paidAt: row.captured_at,
        },
      };
      return res.json(response);
    }

    res.json({ purchased: false } as PaymentStatusResponse);
  } catch (error: any) {
    console.error("❌ Payment status check failed:", error);
    res.status(500).json({ success: false, message: "Failed to check payment status" });
  }
});

// ─────────────────────────────────────────────────────
// GET /api/payments/history
// Get user's full transaction history
// ─────────────────────────────────────────────────────
paymentRoutes.get("/history", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;

    const result = await pool.query(
      `SELECT 
        o.razorpay_order_id as order_id,
        o.amount,
        o.status as order_status,
        o.created_at as order_date,
        o.course_id,
        p.razorpay_payment_id as payment_id,
        p.method as payment_method,
        p.status as payment_status,
        p.captured_at,
        r.razorpay_refund_id as refund_id,
        r.amount as refund_amount,
        r.processed_at as refund_date
      FROM orders o
      LEFT JOIN payments p ON o.razorpay_order_id = p.razorpay_order_id
      LEFT JOIN refunds r ON p.razorpay_payment_id = r.razorpay_payment_id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC`,
      [userId]
    );

    const response: TransactionHistoryResponse = {
      success: true,
      transactions: result.rows.map((row) => ({
        orderId: row.order_id,
        amount: row.amount,
        orderStatus: row.order_status,
        orderDate: row.order_date,
        paymentId: row.payment_id,
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status,
        capturedAt: row.captured_at,
        courseName:
          getCourseById(row.course_id)?.name || row.course_id,
        refundId: row.refund_id,
        refundAmount: row.refund_amount,
        refundDate: row.refund_date,
      })),
    };

    res.json(response);
  } catch (error: any) {
    console.error("❌ Transaction history fetch failed:", error);
    res.status(500).json({ success: false, message: "Failed to fetch transaction history" });
  }
});

// ─────────────────────────────────────────────────────
// GET /api/payments/courses
// Get available courses for purchase
// ─────────────────────────────────────────────────────
paymentRoutes.get("/courses", async (_req: Request, res: Response) => {
  res.json({ success: true, courses: COURSES });
});
