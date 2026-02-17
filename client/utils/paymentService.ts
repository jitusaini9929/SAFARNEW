import { apiFetch } from "@/utils/apiFetch";
import { useState } from "react";
import type { Course, CreateOrderResponse, VerifyPaymentResponse } from "@shared/payments";

// ═══════════════════════════════════════════════════════
// Razorpay Service - Client-side payment handler
// ═══════════════════════════════════════════════════════

// Extend window to include Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}

// Load the Razorpay checkout script dynamically
let razorpayScriptLoaded = false;

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (razorpayScriptLoaded && window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      razorpayScriptLoaded = true;
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

// Create an order on the server
export async function createOrder(courseId: string): Promise<CreateOrderResponse> {
  const response = await apiFetch("/api/payments/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId }),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create order");
  }

  return response.json();
}

// Verify payment on the server
export async function verifyPayment(
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string,
  courseId: string
): Promise<VerifyPaymentResponse> {
  const response = await apiFetch("/api/payments/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
    }),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Payment verification failed");
  }

  return response.json();
}

// Check if user has already purchased a course
export async function checkPurchaseStatus(
  courseId: string
): Promise<{ purchased: boolean; payment?: any }> {
  const response = await apiFetch(`/api/payments/status/${courseId}`, {
    credentials: "include",
  });

  if (!response.ok) {
    return { purchased: false };
  }

  return response.json();
}

// Open Razorpay checkout
export interface RazorpayCheckoutOptions {
  course: Course;
  orderData: CreateOrderResponse;
  user: { name: string; email: string };
  onSuccess: (paymentId: string) => void;
  onFailure: (error: string) => void;
}

export function openRazorpayCheckout({
  course,
  orderData,
  user,
  onSuccess,
  onFailure,
}: RazorpayCheckoutOptions) {
  if (!window.Razorpay) {
    onFailure("Razorpay SDK not loaded. Please refresh and try again.");
    return;
  }

  const options = {
    key: orderData.keyId,
    amount: orderData.order.amount,
    currency: orderData.order.currency,
    name: "SAFAR",
    description: course.name,
    image: "/Banner.jpeg",
    order_id: orderData.order.id,
    handler: async function (response: any) {
      try {
        const verifyResult = await verifyPayment(
          response.razorpay_order_id,
          response.razorpay_payment_id,
          response.razorpay_signature,
          course.id
        );

        if (verifyResult.success) {
          onSuccess(verifyResult.paymentId || response.razorpay_payment_id);
        } else {
          onFailure("Payment verification failed. Please contact support.");
        }
      } catch (error: any) {
        onFailure(error.message || "Payment verification failed");
      }
    },
    prefill: {
      name: user.name,
      email: user.email,
    },
    notes: {
      courseId: course.id,
      courseName: course.name,
    },
    theme: {
      color: "#10B981", // Emerald-500 to match SAFAR theme
    },
    modal: {
      ondismiss: function () {
        // User closed the payment popup without completing
        console.log("Payment popup dismissed");
      },
    },
  };

  const rzp = new window.Razorpay(options);

  rzp.on("payment.failed", function (response: any) {
    onFailure(
      response.error?.description || "Payment failed. Please try again."
    );
  });

  rzp.open();
}
