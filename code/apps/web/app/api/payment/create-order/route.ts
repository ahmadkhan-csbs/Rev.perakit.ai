import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(req: Request) {
  try {
    const { planKey, amount } = await req.json();

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // If Razorpay keys are configured, create real order
    if (keyId && keySecret && !keyId.includes("placeholder")) {
      const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

      const options = {
        amount: Math.round(Number(amount) * 100), // amount in paise
        currency: "INR",
        receipt: `rcpt_${planKey}_${Date.now()}`,
        notes: {
          plan: planKey,
        },
      };

      const order = await razorpay.orders.create(options);
      return NextResponse.json({
        success: true,
        mock: false,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
      });
    }

    // Fallback: Test / Simulation mode when keys are not yet provided
    return NextResponse.json({
      success: true,
      mock: true,
      orderId: `order_test_${Date.now()}`,
      amount: Math.round(Number(amount) * 100),
      currency: "INR",
      keyId: "rzp_test_demo",
    });
  } catch (error: any) {
    console.error("Order creation failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
