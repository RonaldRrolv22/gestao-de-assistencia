import "dotenv/config";
import { getAdminDb } from "../src/lib/firebaseAdmin";
import { pagarmeRequest } from "../src/lib/pagarmeClient";

async function main() {
  const snap = await getAdminDb().collection("maintenance_requests").doc("rat-260605-01").get();
  const d = snap.data();
  console.log("columnId:", d?.columnId);
  console.log("budget.isApproved:", d?.budget?.isApproved);
  console.log("budgetPayment:", JSON.stringify(d?.budgetPayment, null, 2));

  const bp = d?.budgetPayment as Record<string, string> | undefined;
  if (bp?.pagarmeOrderId) {
    const order = await pagarmeRequest<{ status?: string; charges?: { status?: string }[] }>(
      "GET",
      `/orders/${bp.pagarmeOrderId}`
    );
    console.log("PIX/order status:", order.status, "charge:", order.charges?.[0]?.status);
  }
  if (bp?.pagarmePaymentLinkId) {
    const link = await pagarmeRequest<{ status?: string; order?: { status?: string } }>(
      "GET",
      `/paymentlinks/${bp.pagarmePaymentLinkId}`
    );
    console.log("card link status:", link.status, "order:", link.order?.status);
  }
}

main();
