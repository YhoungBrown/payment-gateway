require('dotenv').config();

const express = require('express');
const app = express();

app.use(express.json());

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_CALLBACK_URL = process.env.PAYSTACK_CALLBACK_URL;

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_CALLBACK_URL = process.env.FLUTTERWAVE_CALLBACK_URL;

const INTERSWITCH_MERCHANT_CODE = process.env.INTERSWITCH_MERCHANT_CODE;
const INTERSWITCH_BEARER_TOKEN = process.env.INTERSWITCH_BEARER_TOKEN;
const INTERSWITCH_CLIENT_ID = process.env.INTERSWITCH_CLIENT_ID;
const INTERSWITCH_CLIENT_SECRET = process.env.INTERSWITCH_CLIENT_SECRET;
const INTERSWITCH_PASSPORT_URL = process.env.INTERSWITCH_PASSPORT_URL;
const INTERSWITCH_PAYMENTGATEWAY_API_URL = process.env.INTERSWITCH_PAYMENTGATEWAY_API_URL;

if (!PAYSTACK_SECRET_KEY) {
  console.warn('WARNING: PAYSTACK_SECRET_KEY is not set. Paystack calls will fail.');
}

if (!FLUTTERWAVE_SECRET_KEY) {
  console.warn('WARNING: FLUTTERWAVE_SECRET_KEY is not set. Flutterwave calls will fail.');
}

// CORS for mobile app and web clients
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST');
    return res.sendStatus(200);
  }
  next();
});

function getCallbackUrl(req, override) {
  if (override) return override;
  if (PAYSTACK_CALLBACK_URL) return PAYSTACK_CALLBACK_URL;
  return `${req.protocol}://${req.get('host')}/callback`;
}

function paystackRequest(path, options = {}) {
  return fetch(`https://api.paystack.co${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });
}

function flutterwaveRequest(path, options = {}) {
  return fetch(`https://api.flutterwave.com${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });
}

function formatInterswitchDate(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

async function getInterswitchToken() {
  if (INTERSWITCH_BEARER_TOKEN) {
    return INTERSWITCH_BEARER_TOKEN;
  }

  if (!INTERSWITCH_CLIENT_ID || !INTERSWITCH_CLIENT_SECRET || !INTERSWITCH_PASSPORT_URL) {
    throw new Error(
      'Interswitch bearer token or OAuth credentials (client_id, client_secret, passport_url) are required'
    );
  }

  const credentials = Buffer.from(
    `${INTERSWITCH_CLIENT_ID}:${INTERSWITCH_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch(
    `${INTERSWITCH_PASSPORT_URL}?grant_type=client_credentials`,
    {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}` },
    }
  );

  if (!res.ok) {
    throw new Error('Failed to fetch Interswitch OAuth token');
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * POST /initialize
 *
 * Body: { request: PaymentRequest, processor: ProcessorConfig }
 * Returns: { checkoutUrl: string }
 *
 * This matches the SDK's `initialize` callback shape.
 */
app.post('/initialize', async (req, res) => {
  try {
    const { request, processor } = req.body;

    if (!request || !processor) {
      return res.status(400).json({ error: 'request and processor are required' });
    }

    if (processor.type === 'paystack') {
      if (!PAYSTACK_SECRET_KEY) {
        return res.status(500).json({ error: 'PAYSTACK_SECRET_KEY is not configured' });
      }

      const callbackUrl = getCallbackUrl(req, processor.callbackUrl);

      const paystackRes = await paystackRequest('/transaction/initialize', {
        method: 'POST',
        body: JSON.stringify({
          email: request.email,
          amount: request.amount, // SDK sends kobo/minor units
          currency: request.currency,
          reference: request.reference,
          callback_url: callbackUrl,
          channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money'],
          ...(request.metadata ? { metadata: request.metadata } : {}),
        }),
      });

      const paystackData = await paystackRes.json();

      if (!paystackData.status) {
        console.error('Paystack initialize failed:', paystackData.message);
        return res.status(502).json({
          error: 'Payment provider error',
          detail: paystackData.message,
        });
      }

      console.log('Paystack initialized:', paystackData.data.reference);

      return res.json({
        checkoutUrl: paystackData.data.authorization_url,
      });
    }

    if (processor.type === 'flutterwave') {
      if (!FLUTTERWAVE_SECRET_KEY) {
        return res.status(500).json({ error: 'FLUTTERWAVE_SECRET_KEY is not configured' });
      }

      const callbackUrl = getCallbackUrl(req, processor.callbackUrl || FLUTTERWAVE_CALLBACK_URL);

      // Flutterwave expects amount in the currency major unit (e.g. NGN, not kobo).
      const amountInMajorUnit = request.currency === 'NGN'
        ? request.amount / 100
        : request.amount;

      const flutterwaveRes = await flutterwaveRequest('/v3/payments', {
        method: 'POST',
        body: JSON.stringify({
          tx_ref: request.reference,
          amount: amountInMajorUnit,
          currency: request.currency,
          redirect_url: callbackUrl,
          payment_options: 'card,banktransfer,ussd',
          customer: { email: request.email },
          ...(request.metadata
            ? { meta: { ...request.metadata, reference: request.reference } }
            : { meta: { reference: request.reference } }),
          customizations: {
            title: 'SmartPayFresh Payment',
          },
        }),
      });

      const flutterwaveData = await flutterwaveRes.json();

      if (flutterwaveData.status !== 'success') {
        console.error('Flutterwave initialize failed:', flutterwaveData.message);
        return res.status(502).json({
          error: 'Payment provider error',
          detail: flutterwaveData.message,
        });
      }

      console.log('Flutterwave initialized:', request.reference);

      return res.json({
        checkoutUrl: flutterwaveData.data.link,
      });
    }

    return res.status(400).json({ error: `Unsupported processor: ${processor.type}` });
  } catch (err) {
    console.error('POST /initialize error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /verify
 *
 * Body: PaymentResponse
 * Returns: { verified: boolean, message?: string }
 *
 * This matches the SDK's `verify` callback shape.
 */
app.post('/verify', async (req, res) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ error: 'PAYSTACK_SECRET_KEY is not configured' });
    }

    const response = req.body;

    if (!response || !response.processor) {
      return res.status(400).json({ error: 'processor is required' });
    }

    if (response.processor !== 'paystack') {
      return res.status(400).json({ error: `Unsupported processor: ${response.processor}` });
    }

    const reference = response.reference;
    if (!reference) {
      return res.status(400).json({ error: 'reference is required' });
    }

    const verifyRes = await paystackRequest(
      `/transaction/verify/${encodeURIComponent(reference)}`,
      { method: 'GET' }
    );

    const verifyData = await verifyRes.json();

    if (!verifyData.status) {
      return res.status(502).json({
        error: 'Payment provider error',
        detail: verifyData.message,
      });
    }

    const isSuccess = verifyData.data.status === 'success';

    console.log('Paystack verified:', reference, isSuccess ? 'success' : verifyData.data.status);

    return res.json({
      verified: isSuccess,
      message: verifyData.data.gateway_response || verifyData.data.status,
    });
  } catch (err) {
    console.error('POST /verify error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /verify-interswitch
 *
 * Body: { reference: string }
 * Returns: { verified: boolean, message?: string, data?: unknown }
 *
 * Requeries Interswitch server-to-server using the Payment Gateway API.
 */
/**
 * POST /verify-flutterwave
 *
 * Body: PaymentResponse
 * Returns: { verified: boolean, message?: string }
 *
 * Verifies a Flutterwave transaction server-to-server using the transaction_id
 * returned in the callback URL.
 */
app.post('/verify-flutterwave', async (req, res) => {
  try {
    if (!FLUTTERWAVE_SECRET_KEY) {
      return res.status(500).json({ error: 'FLUTTERWAVE_SECRET_KEY is not configured' });
    }

    const response = req.body;

    if (!response || response.processor !== 'flutterwave') {
      return res.status(400).json({ error: 'Invalid Flutterwave response' });
    }

    const transactionId = response.processorReference;
    if (!transactionId) {
      return res.status(400).json({ error: 'processorReference (transaction_id) is required' });
    }

    const verifyRes = await flutterwaveRequest(
      `/v3/transactions/${encodeURIComponent(transactionId)}/verify`,
      { method: 'GET' }
    );

    const verifyData = await verifyRes.json();

    if (verifyData.status !== 'success') {
      return res.status(502).json({
        error: 'Payment provider error',
        detail: verifyData.message,
      });
    }

    const isSuccess = verifyData.data.status === 'successful';

    console.log('Flutterwave verified:', transactionId, isSuccess ? 'success' : verifyData.data.status);

    return res.json({
      verified: isSuccess,
      message: verifyData.data.processor_response || verifyData.data.status,
    });
  } catch (err) {
    console.error('POST /verify-flutterwave error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/verify-interswitch', async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ error: 'reference is required' });
    }

    if (!INTERSWITCH_MERCHANT_CODE || !INTERSWITCH_PAYMENTGATEWAY_API_URL) {
      return res.status(500).json({
        error: 'INTERSWITCH_MERCHANT_CODE and INTERSWITCH_PAYMENTGATEWAY_API_URL are required',
      });
    }

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);

    const query = new URLSearchParams({
      merchantCode: INTERSWITCH_MERCHANT_CODE,
      transactionReference: reference,
      startDate: formatInterswitchDate(start),
      endDate: formatInterswitchDate(end),
      pageSize: '1',
      pageNum: '0',
    });

    const token = await getInterswitchToken();

    const interswitchRes = await fetch(
      `${INTERSWITCH_PAYMENTGATEWAY_API_URL}?${query}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          accept: 'application/json',
        },
      }
    );

    if (!interswitchRes.ok) {
      const err = await interswitchRes.json().catch(() => ({}));
      return res.status(502).json({
        error: 'Payment provider error',
        detail: err.message || interswitchRes.statusText,
      });
    }

    const data = await interswitchRes.json();
    const txn = data.content?.find(
      t => t.transactionReference === reference
    );

    if (!txn) {
      return res.json({ verified: false, message: 'Transaction not found' });
    }

    const isSuccess = txn.status === 'SUCCESS' || txn.responseCode === '00';

    console.log('Interswitch verified:', reference, isSuccess ? 'success' : txn.status);

    return res.json({
      verified: isSuccess,
      message: txn.responseDescription || txn.status,
      data: txn,
    });
  } catch (err) {
    console.error('POST /verify-interswitch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /callback
 *
 * Paystack redirects here after payment. The SDK intercepts this URL
 * in the WebView before this page is reached, but we return a friendly
 * fallback just in case.
 */
app.get('/callback', (req, res) => {
  const { reference, trxref } = req.query;
  console.log('Paystack callback received:', reference || trxref);
  res.json({ status: 'ok', reference: reference || trxref });
});

/**
 * GET /payment-response
 *
 * Interswitch redirects here after payment. The SDK intercepts this URL
 * in the WebView before this page is reached, but we return a friendly
 * fallback just in case.
 */
app.get('/payment-response', (req, res) => {
  const { txnref } = req.query;
  console.log('Interswitch redirect fallback received:', txnref);
  res.json({ status: 'ok', txnref });
});

/**
 * GET /flutterwave-callback
 *
 * Flutterwave redirects here after payment. The SDK intercepts this URL
 * in the WebView before this page is reached, but we return a friendly
 * fallback just in case.
 */
app.get('/flutterwave-callback', (req, res) => {
  const { status, tx_ref, transaction_id } = req.query;
  console.log('Flutterwave callback received:', tx_ref, transaction_id, status);
  res.json({ status: 'ok', tx_ref, transaction_id, payment_status: status });
});

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;
