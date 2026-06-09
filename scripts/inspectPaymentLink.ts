import "dotenv/config";
import { pagarmeRequest } from "../src/lib/pagarmeClient";

const linkId = process.argv[2] || "pl_G1ElL9ymZMdKgODhJt50XVrR2B5wOaY3";

async function main() {
  const link = await pagarmeRequest<Record<string, unknown>>("GET", `/paymentlinks/${linkId}`);
  const cc = (link.payment_settings as Record<string, unknown>)?.credit_card_settings as Record<string, unknown>;
  console.log(JSON.stringify({
    id: link.id,
    url: link.url,
    status: link.status,
    installments: cc?.installments,
    installments_setup: cc?.installments_setup,
    cart_total: (link.cart_settings as Record<string, unknown>)?.total_cost,
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
