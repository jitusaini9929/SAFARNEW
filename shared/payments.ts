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
