const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: '.env.test' });

const app = express();
app.use(express.json());
app.use(express.static('public'));

const HOST_URL = process.env.PHONEPE_HOST_URL;
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const SALT_KEY = process.env.PHONEPE_SALT_KEY;
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX;

// Diagnostic Endpoint: Check loaded environment variables
app.get('/api/test-env', (req, res) => {
  res.json({
    status: 'OK',
    config: {
      HOST_URL: HOST_URL || 'MISSING',
      MERCHANT_ID: MERCHANT_ID || 'MISSING',
      SALT_KEY_CONFIGURED: !!SALT_KEY,
      SALT_INDEX: SALT_INDEX || 'MISSING',
    },
  });
});

// Endpoint 1: Test Payment Initiation (/pg/v1/pay)
app.post('/api/test-initiate', async (req, res) => {
  try {
    const merchantTransactionId = 'TEST_' + Date.now();
    const redirectUrl = `http://localhost:${process.env.PORT || 3000}/success.html?txnId=${merchantTransactionId}`;

    const payload = {
  merchantId: MERCHANT_ID,
  merchantTransactionId: merchantTransactionId,
  merchantUserId: 'USER_TEST_123',
  amount: 100, // 1 INR in paise
  redirectUrl: redirectUrl,
  redirectMode: 'REDIRECT',
  callbackUrl: redirectUrl,
  mobileNumber: '9999999999', // Add standard test number
  paymentInstrument: {
    type: 'PAY_PAGE',
  },
};

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    
    // Checksum Rule: SHA256(base64Payload + "/pg/v1/pay" + saltKey) + "###" + saltIndex
    const stringToHash = base64Payload + '/pg/v1/pay' + SALT_KEY;
    const sha256Hash = crypto.createHash('sha256').update(stringToHash).digest('hex');
    const checksum = `${sha256Hash}###${SALT_INDEX}`;

    console.log('\n--- PHONEPE PAY REQUEST DIAGNOSTICS ---');
    console.log('Target Endpoint:', `${HOST_URL}/pg/v1/pay`);
    console.log('Payload Base64:', base64Payload);
    console.log('Generated X-VERIFY:', checksum);

    const response = await axios.post(
      `${HOST_URL}/pg/v1/pay`,
      { request: base64Payload },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
        },
      }
    );

    console.log('PhonePe API Response:', response.data);

    return res.json({
      success: true,
      merchantTransactionId,
      phonepeResponse: response.data,
      redirectUrl: response.data?.data?.instrumentResponse?.redirectInfo?.url,
    });
  } catch (error) {
    console.error('PhonePe Initiation Error:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
      httpStatus: error.response?.status || 500,
    });
  }
});

// Endpoint 2: Test Status Sync (/pg/v1/status/{merchantId}/{txnId})
app.get('/api/test-status/:txnId', async (req, res) => {
  const { txnId } = req.params;

  try {
    const endpointPath = `/pg/v1/status/${MERCHANT_ID}/${txnId}`;
    
    // Checksum Rule: SHA256("/pg/v1/status/{merchantId}/{txnId}" + saltKey) + "###" + saltIndex
    const stringToHash = endpointPath + SALT_KEY;
    const sha256Hash = crypto.createHash('sha256').update(stringToHash).digest('hex');
    const checksum = `${sha256Hash}###${SALT_INDEX}`;

    console.log('\n--- PHONEPE STATUS REQUEST DIAGNOSTICS ---');
    console.log('Target Endpoint:', `${HOST_URL}${endpointPath}`);
    console.log('Generated X-VERIFY:', checksum);

    const response = await axios.get(`${HOST_URL}${endpointPath}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': MERCHANT_ID,
      },
    });

    return res.json({
      success: true,
      phonepeResponse: response.data,
    });
  } catch (error) {
    console.error('PhonePe Status Error:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
      httpStatus: error.response?.status || 500,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PhonePe Diagnostic Tool listening at http://localhost:${PORT}`);
});