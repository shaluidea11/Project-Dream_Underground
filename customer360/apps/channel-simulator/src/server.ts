import Fastify from 'fastify';
import cors from '@fastify/cors';
import * as dotenv from 'dotenv';

dotenv.config();

const app = Fastify({ logger: true });
app.register(cors, { origin: true });

interface SendPayload {
  recipient: string;
  channel: 'whatsapp' | 'sms' | 'email' | 'rcs';
  message: string;
  campaignId: string;
  communicationId: string;
}

const PROBABILITIES = {
  whatsapp: { delivered: 0.92, opened: 0.70, clicked: 0.25, converted: 0.08 },
  sms:      { delivered: 0.88, opened: 0.60, clicked: 0.15, converted: 0.05 },
  email:    { delivered: 0.85, opened: 0.35, clicked: 0.20, converted: 0.06 },
  rcs:      { delivered: 0.90, opened: 0.65, clicked: 0.22, converted: 0.07 },
};

// Delay scale: set to e.g. 0.1 in dev env to speed up delays by 10x
const delayScale = parseFloat(process.env.SIMULATOR_DELAY_SCALE || '1.0');
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms * delayScale));

app.get('/health', async () => {
  return { status: 'ok', service: 'channel-simulator' };
});

app.post('/send', async (request, reply) => {
  const payload = request.body as SendPayload;

  if (!payload.recipient || !payload.channel || !payload.campaignId || !payload.communicationId) {
    return reply.status(400).send({ error: 'Missing required payload fields' });
  }

  // Process asynchronously (fire-and-forget for client)
  simulateDelivery(payload).catch((err) => {
    app.log.error(`Simulation error for ${payload.communicationId}: ${err.message}`);
  });

  return reply.status(202).send({ status: 'queued' });
});

async function fireCallback(payload: {
  campaignId: string;
  communicationId: string;
  status: string;
}) {
  const url = process.env.CRM_CALLBACK_URL || process.env.CALLBACK_URL || 'http://localhost:3001/api/callbacks/delivery';
  const secret = process.env.SIMULATOR_SECRET || process.env.CHANNEL_SIMULATOR_SECRET || 'dev-secret';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Simulator-Secret': secret,
      },
      body: JSON.stringify({
        campaignId: payload.campaignId,
        communicationId: payload.communicationId,
        status: payload.status,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      console.error(`Callback failed for ${payload.communicationId} with status ${res.status}`);
    }
  } catch (err: any) {
    console.error(`Callback network error for ${payload.communicationId}: ${err.message}`);
  }
}

async function simulateDelivery(payload: SendPayload) {
  const channel = payload.channel.toLowerCase() as keyof typeof PROBABILITIES;
  const rates = PROBABILITIES[channel] || PROBABILITIES.whatsapp;

  // 1. Initial send delay (2-5s)
  await delay(Math.floor(Math.random() * 3000) + 2000);

  const isDelivered = Math.random() < rates.delivered;
  if (!isDelivered) {
    await fireCallback({
      campaignId: payload.campaignId,
      communicationId: payload.communicationId,
      status: 'failed',
    });
    return;
  }

  // Fire delivered callback
  await fireCallback({
    campaignId: payload.campaignId,
    communicationId: payload.communicationId,
    status: 'delivered',
  });

  // 2. Opened check
  const isOpened = Math.random() < rates.opened;
  if (!isOpened) return;

  await delay(30000); // 30s
  await fireCallback({
    campaignId: payload.campaignId,
    communicationId: payload.communicationId,
    status: 'opened',
  });

  // 3. Clicked check
  const isClicked = Math.random() < rates.clicked;
  if (!isClicked) return;

  await delay(60000); // 60s
  await fireCallback({
    campaignId: payload.campaignId,
    communicationId: payload.communicationId,
    status: 'clicked',
  });

  // 4. Converted check
  const isConverted = Math.random() < rates.converted;
  if (!isConverted) return;

  await delay(60000); // 60s
  await fireCallback({
    campaignId: payload.campaignId,
    communicationId: payload.communicationId,
    status: 'converted',
  });
}

const start = async () => {
  try {
    await app.listen({ port: parseInt(process.env.PORT || '3002'), host: '0.0.0.0' });
    console.log('Channel Simulator running on port 3002');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
