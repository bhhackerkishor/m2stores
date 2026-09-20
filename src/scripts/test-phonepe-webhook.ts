import crypto from "crypto";

const SALT_KEY = "96434309-7796-489d-8924-ab56988a6076";
const SALT_INDEX = "1";
const WEBHOOK_URL = "http://localhost:3000/api/payments/phonepe/webhook";

// 1. Target merchantTransactionId from your DB
const merchantTransactionId = "M2S_TEST_TXN_12345";

// 2. Build mock payload
const payload = {
  success: true,
  code: "PAYMENT_SUCCESS",
  message: "Payment completed successfully",
  data: {
    merchantId: "PGTESTPAYUAT86",
    merchantTransactionId,
    transactionId: "T20260920102400112233",
    amount: 50000, // in paise
    state: "COMPLETED",
    responseCode: "SUCCESS",
    paymentInstrument: { type: "UPI" }
  }
};

// 3. Base64 encode the payload
const base64Response = Buffer.from(JSON.stringify(payload)).toString("base64");

// 4. Compute SHA256 + Salt
const hash = crypto
  .createHash("sha256")
  .update(base64Response + SALT_KEY)
  .digest("hex");

const xVerify = `${hash}###${SALT_INDEX}`;

// 5. Post to local endpoint
async function sendMockWebhook() {
  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-VERIFY": xVerify,
    },
    body: JSON.stringify({ response: base64Response }),
  });

  const resText = await response.text();
  console.log("Status:", response.status);
  console.log("Response:", resText);
}

sendMockWebhook();