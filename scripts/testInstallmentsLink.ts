import "dotenv/config";
import { pagarmeRequest } from "../src/lib/pagarmeClient";

const amountCents = 120000;

async function createWithSetup() {
  return pagarmeRequest<Record<string, unknown>>("POST", "/paymentlinks", {
    name: "Teste setup 10x",
    type: "order",
    payment_settings: {
      accepted_payment_methods: ["credit_card"],
      credit_card_settings: {
        operation_type: "auth_and_capture",
        installments_setup: {
          max_installments: 10,
          amount: amountCents,
          free_installments: 10,
          interest_type: "simple",
          interest_rate: 0,
        },
      },
    },
    cart_settings: {
      items: [{ name: "Teste", amount: amountCents, default_quantity: 1 }],
    },
  });
}

async function createWithArray() {
  const installments = Array.from({ length: 10 }, (_, i) => ({
    number: i + 1,
    total: amountCents,
  }));
  return pagarmeRequest<Record<string, unknown>>("POST", "/paymentlinks", {
    name: "Teste array 10x",
    type: "order",
    payment_settings: {
      accepted_payment_methods: ["credit_card"],
      credit_card_settings: {
        operation_type: "auth_and_capture",
        installments,
      },
    },
    cart_settings: {
      items: [{ name: "Teste", amount: amountCents, default_quantity: 1 }],
    },
  });
}

async function dump(label: string, link: Record<string, unknown>) {
  const cc = (link.payment_settings as Record<string, unknown>)?.credit_card_settings as Record<string, unknown>;
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify({
    id: link.id,
    url: link.url,
    installments: cc?.installments,
    installments_setup: cc?.installments_setup,
  }, null, 2));
}

async function main() {
  const setupLink = await createWithSetup();
  await dump("installments_setup", setupLink);

  const arrayLink = await createWithArray();
  await dump("installments array", arrayLink);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
