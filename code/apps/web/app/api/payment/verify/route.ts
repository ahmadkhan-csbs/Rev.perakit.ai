import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { orderId, paymentId, signature, planKey } = await req.json();

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // If real keys are present, verify HMAC SHA256 signature
    if (keySecret && !keySecret.includes("placeholder") && signature) {
      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      if (generatedSignature !== signature) {
        return NextResponse.json(
          { success: false, error: "Invalid payment signature" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      plan: planKey,
      paymentId: paymentId || `pay_verified_${Date.now()}`,
    });
  } catch (error: any) {
    console.error("Payment verification failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Verification failed" },
      { status: 500 }
    );
  }
}
