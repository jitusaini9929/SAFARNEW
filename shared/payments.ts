// ═══════════════════════════════════════════════════════
// Shared Payment Types - Used by both client & server
// ═══════════════════════════════════════════════════════

export interface Course {
  id: string;
  name: string;
  description: string;
  price: number; // in INR
  currency: string;
  imageUrl?: string;
}

export interface CreateOrderRequest {
  courseId: string;
  amount: number;
  currency?: string;
}

export interface CreateOrderResponse {
  success: boolean;
  order: {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
  };
  keyId: string;
  course: Course;
}

export interface PaymentConfigResponse {
  available: boolean;
  provider: "razorpay";
  message?: string;
}

export interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  courseId: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  paymentId?: string;
  enrollmentId?: string;
}

export interface PaymentStatusResponse {
  purchased: boolean;
  payment?: {
    paymentId: string;
    amount: number;
    status: string;
    method: string;
    paidAt: string;
  };
}

export interface TransactionHistoryItem {
  orderId: string;
  amount: number;
  orderStatus: string;
  orderDate: string;
  paymentId: string | null;
  paymentMethod: string | null;
  paymentStatus: string | null;
  capturedAt: string | null;
  courseName: string;
  refundId: string | null;
  refundAmount: number | null;
  refundDate: string | null;
}

export interface TransactionHistoryResponse {
  success: boolean;
  transactions: TransactionHistoryItem[];
}

// Available courses for purchase in Dhyan section
export const DHYAN_COURSES: Course[] = [
  {
    id: "safar-30",
    name: "SAFAR 30-Day Meditation Course",
    description: "A 30-day guided meditation journey to build a consistent practice, reduce stress, and deepen self-awareness.",
    price: 49,
    currency: "INR",
    imageUrl: "/Banner.jpeg",
  },
];

// Study Planner Pro subscription products
export const STUDY_PLANNER_PRODUCTS: Course[] = [
  {
    id: "study-planner-pro-monthly",
    name: "Study Planner Pro — Monthly",
    description: "Unlock Auto-Schedule, unlimited topics, exam templates, full insights dashboard, and reschedule tools.",
    price: 199,
    currency: "INR",
  },
  {
    id: "study-planner-pro-exam",
    name: "Study Planner Pro — Exam Season",
    description: "3 months of full premium access. Perfect for competitive exam preparation.",
    price: 499,
    currency: "INR",
  },
  {
    id: "study-planner-pro-annual",
    name: "Study Planner Pro — Annual",
    description: "12 months of premium access. Best value for long-haul JEE/NEET preparation.",
    price: 999,
    currency: "INR",
  },
];

// Lookup map used by server payment routes.
export const DHYAN_COURSES_BY_ID: Record<string, Course> = Object.fromEntries(
  [...DHYAN_COURSES, ...STUDY_PLANNER_PRODUCTS].map((course) => [course.id, course]),
);
