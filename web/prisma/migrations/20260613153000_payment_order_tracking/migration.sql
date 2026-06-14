ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "razorpay_order_id" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "razorpay_signature" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "cashfree_order_id" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "cashfree_payment_id" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_razorpay_order_id_key" ON "Payment"("razorpay_order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_cashfree_order_id_key" ON "Payment"("cashfree_order_id");
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");
