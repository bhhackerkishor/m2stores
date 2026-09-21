/* eslint-disable no-console */
// Runs all critical business-logic test suites. Extend as new suites are added.
import { spawn } from "child_process";

function run(script: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn("npx", ["tsx", script], { stdio: "inherit", shell: true });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function main() {
  console.log("🚀 Running M2Stores critical test suites...\n");
  const suites = ["src/scripts/test-inventory.ts", "src/scripts/test-cart.ts", "src/scripts/test-checkout.ts", "src/scripts/test-payments.ts", "src/scripts/test-payment-integrity.ts", "src/scripts/test-orders.ts", "src/scripts/test-dashboard.ts", "src/scripts/test-coupons-offers.ts", "src/scripts/test-reviews-support.ts", "src/scripts/test-returns.ts", "src/scripts/test-search.ts", "src/scripts/test-security.ts"];
  let failed = 0;
  for (const s of suites) {
    console.log(`\n━━━ ${s} ━━━`);
    const code = await run(s);
    if (code !== 0) {
      console.error(`❌ Suite failed: ${s}`);
      failed++;
    } else {
      console.log(`✅ Suite passed: ${s}`);
    }
  }
  if (failed > 0) {
    console.error(`\n❌ ${failed} suite(s) failed`);
    process.exit(1);
  }
  console.log("\n🎉 All suites passed!");
}

main();
