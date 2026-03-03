import crypto from "crypto";
import { Router, type Request, type Response } from "express";
import Razorpay from "razorpay";
import { v4 as uuidv4 } from "uuid";
import { DHYAN_COURSES_BY_ID } from "../../shared/payments";
import { collections, getMongoClient } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

type CourseWithAmount = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl?: string;
  amount: number; // paise
};

const COURSES: Record<string, CourseWithAmount> = Object.fromEntries(
  Object.values(DHYAN_COURSES_BY_ID).map((course) => [
    course.id,
    {
      ...course,
      amount: Math.round(course.price * 100),
    },
  ]),
);

const razorpayReady =
  Boolean(process.env.RAZORPAY_KEY_ID) &&
  Boolean(process.env.RAZORPAY_KEY_SECRET);

const razorpayInstance = razorpayReady
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })
  : null;

if (razorpayInstance) {
  console.log("Razorpay initialized");
} else {
  console.warn("Razorpay credentials not found. Payment features are disabled.");
}

function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  if (!process.env.RAZORPAY_KEY_SECRET) return false;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expectedSignature === signature;
}

function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return false;
  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}

// GET /api/payments/courses
router.get("/courses", (_req, res) => {
  res.json({ courses: Object.values(COURSES) });
});

// POST /api/payments/create-order
router.post("/create-order", requireAuth, async (req: any, res: Response) => {
  if (!razorpayInstance) {
    return res.status(503).json({ message: "Payment service unavailable" });
  }

  try {
    const userId = req.session.userId!;
    const { courseId } = req.body;

    const course = COURSES[courseId];
    if (!course) return res.status(400).json({ message: "Invalid course" });

    const existing = await collections.courseEnrollments().findOne({
      user_id: userId,
      course_id: courseId,
      access_granted: true,
    });
    if (existing) {
      return res.status(400).json({ message: "Already enrolled in this course" });
    }

    const receipt = `rcpt_${Date.now()}_${String(userId).slice(0, 8)}`;
    const razorpayOrder = await razorpayInstance.orders.create({
      amount: course.amount,
      currency: course.currency || "INR",
      receipt,
      notes: { userId, courseId },
    });

    const orderId = uuidv4();
    await collections.orders().insertOne({
      id: orderId,
      razorpay_order_id: razorpayOrder.id,
      user_id: userId,
      course_id: courseId,
      amount: course.amount / 100,
      currency: course.currency || "INR",
      status: "created",
      receipt,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await collections.transactionLogs().insertOne({
      id: uuidv4(),
      order_id: orderId,
      payment_id: null,
      event_type: "order_created",
      event_data: {
        razorpay_order_id: razorpayOrder.id,
        amount: course.amount,
        courseId,
      },
      created_at: new Date(),
    });

    return res.json({
      success: true,
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt || receipt,
      },
      keyId: process.env.RAZORPAY_KEY_ID,
      course: {
        id: course.id,
        name: course.name,
        description: course.description,
        price: course.price,
        currency: course.currency,
        imageUrl: course.imageUrl,
      },
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    return res.status(500).json({ message: "Failed to create order" });
  }
});

// POST /api/payments/verify
router.post("/verify", requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.session.userId!;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
    } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment details" });
    }

    const isValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );
    if (!isValid) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const mongoClient = getMongoClient();
    const session = mongoClient.startSession();
    let enrollmentId: string | undefined;

    try {
      await session.withTransaction(async () => {
        const order = await collections.orders().findOne(
          {
            razorpay_order_id,
            user_id: userId,
          },
          { session },
        );

        if (!order) {
          throw new Error("ORDER_NOT_FOUND");
        }

        if (courseId && order.course_id !== courseId) {
          throw new Error("COURSE_MISMATCH");
        }

        await collections.orders().updateOne(
          { razorpay_order_id },
          { $set: { status: "paid", updated_at: new Date() } },
          { session },
        );

        await collections.payments().updateOne(
          { razorpay_payment_id },
          {
            $set: {
              razorpay_order_id,
              user_id: userId,
              amount: order.amount,
              currency: order.currency,
              status: "captured",
              razorpay_signature,
              method: "upi",
              captured_at: new Date(),
              updated_at: new Date(),
            },
            $setOnInsert: {
              id: uuidv4(),
              razorpay_payment_id,
              created_at: new Date(),
            },
          },
          { upsert: true, session },
        );

        await collections.courseEnrollments().updateOne(
          { user_id: userId, course_id: order.course_id },
          {
            $set: {
              access_granted: true,
              razorpay_order_id,
              razorpay_payment_id,
              updated_at: new Date(),
            },
            $setOnInsert: {
              id: uuidv4(),
              user_id: userId,
              course_id: order.course_id,
              enrolled_at: new Date(),
            },
          },
          { upsert: true, session },
        );

        const enrollment = await collections.courseEnrollments().findOne(
          { user_id: userId, course_id: order.course_id },
          { session },
        );
        enrollmentId = enrollment?.id;

        await collections.transactionLogs().insertOne(
          {
            id: uuidv4(),
            order_id: order.id,
            payment_id: razorpay_payment_id,
            event_type: "payment_verified",
            event_data: {
              razorpay_order_id,
              razorpay_payment_id,
              amount: order.amount,
            },
            created_at: new Date(),
          },
          { session },
        );
      });

      return res.json({
        success: true,
        message: "Payment verified and enrollment granted",
        paymentId: razorpay_payment_id,
        enrollmentId,
      });
    } catch (error: any) {
      if (error?.message === "ORDER_NOT_FOUND") {
        return res.status(404).json({ message: "Order not found" });
      }
      if (error?.message === "COURSE_MISMATCH") {
        return res.status(400).json({ message: "Course mismatch for order" });
      }
      throw error;
    } finally {
      await session.endSession();
    }
  } catch (error: any) {
    console.error("Verify payment error:", error);
    return res.status(500).json({ message: "Payment verification failed" });
  }
});

// POST /api/payments/webhook
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const signature = req.header("x-razorpay-signature");
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      return res.status(503).json({ message: "Webhook secret not configured" });
    }

    if (!signature || !rawBody) {
      return res.status(400).json({ message: "Missing webhook signature or payload" });
    }

    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const event = (req.body as any)?.event;
    if (event !== "payment.captured") {
      return res.status(200).json({ received: true, ignored: true });
    }

    const paymentEntity = (req.body as any)?.payload?.payment?.entity;
    const razorpayOrderId = paymentEntity?.order_id;
    const razorpayPaymentId = paymentEntity?.id;

    if (!razorpayOrderId || !razorpayPaymentId) {
      return res.status(400).json({ message: "Invalid payment payload" });
    }

    const order = await collections.orders().findOne({
      razorpay_order_id: razorpayOrderId,
    });

    if (!order) {
      console.warn(
        `Webhook payment.captured ignored. Order not found: ${razorpayOrderId}`,
      );
      return res.status(200).json({ received: true, ignored: true });
    }

    const now = new Date();
    const paymentAmount =
      typeof paymentEntity.amount === "number"
        ? paymentEntity.amount / 100
        : order.amount;
    const paymentMethod = paymentEntity.method || "upi";

    await collections.orders().updateOne(
      { razorpay_order_id: razorpayOrderId },
      { $set: { status: "paid", updated_at: now } },
    );

    await collections.payments().updateOne(
      { razorpay_payment_id: razorpayPaymentId },
      {
        $set: {
          razorpay_order_id: razorpayOrderId,
          user_id: order.user_id,
          amount: paymentAmount,
          currency: order.currency,
          status: "captured",
          method: paymentMethod,
          captured_at: now,
          updated_at: now,
        },
        $setOnInsert: {
          id: uuidv4(),
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: signature,
          created_at: now,
        },
      },
      { upsert: true },
    );

    await collections.courseEnrollments().updateOne(
      { user_id: order.user_id, course_id: order.course_id },
      {
        $set: {
          access_granted: true,
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          updated_at: now,
        },
        $setOnInsert: {
          id: uuidv4(),
          user_id: order.user_id,
          course_id: order.course_id,
          enrolled_at: now,
        },
      },
      { upsert: true },
    );

    await collections.transactionLogs().insertOne({
      id: uuidv4(),
      order_id: order.id,
      payment_id: razorpayPaymentId,
      event_type: "payment_captured_webhook",
      event_data: {
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        amount: paymentAmount,
      },
      created_at: now,
    });

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({ message: "Webhook processing failed" });
  }
});

// GET /api/payments/status/:courseId
router.get("/status/:courseId", requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.session.userId!;
    const { courseId } = req.params;

    const enrollment = await collections.courseEnrollments().findOne({
      user_id: userId,
      course_id: courseId,
      access_granted: true,
    });

    if (!enrollment) {
      return res.json({ purchased: false });
    }

    const latestOrder = await collections.orders().findOne(
      {
        user_id: userId,
        course_id: courseId,
        status: "paid",
      },
      { sort: { updated_at: -1 } },
    );

    const payment = latestOrder
      ? await collections.payments().findOne(
          { razorpay_order_id: latestOrder.razorpay_order_id },
          { sort: { captured_at: -1 } },
        )
      : null;

    return res.json({
      purchased: true,
      payment: payment
        ? {
            paymentId: payment.razorpay_payment_id,
            amount: payment.amount,
            status: payment.status,
            method: payment.method || "upi",
            paidAt: payment.captured_at || payment.created_at,
          }
        : undefined,
    });
  } catch (error: any) {
    console.error("Payment status error:", error);
    return res.status(500).json({ message: "Failed to check payment status" });
  }
});

// GET /api/payments/history
router.get("/history", requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.session.userId!;

    const orders = await collections.orders()
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .toArray();

    const history = [];
    for (const order of orders) {
      const payment = await collections.payments().findOne({
        razorpay_order_id: order.razorpay_order_id,
      });
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
        paidAt: payment?.captured_at || null,
      });
    }

    return res.json({ transactions: history });
  } catch (error: any) {
    console.error("Payment history error:", error);
    return res.status(500).json({ message: "Failed to fetch transaction history" });
  }
});

// GET /api/payments/enrollments
router.get("/enrollments", requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.session.userId!;

    const enrollments = await collections.courseEnrollments()
      .find({ user_id: userId, access_granted: true })
      .toArray();

    const result = enrollments.map((enrollment) => ({
      courseId: enrollment.course_id,
      courseName: COURSES[enrollment.course_id]?.name || enrollment.course_id,
      enrolledAt: enrollment.enrolled_at,
      expiresAt: enrollment.expires_at,
    }));

    return res.json({ enrollments: result });
  } catch (error: any) {
    console.error("Get enrollments error:", error);
    return res.status(500).json({ message: "Failed to fetch enrollments" });
  }
});

export const paymentRoutes = router;
