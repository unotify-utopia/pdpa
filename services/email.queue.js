// services/email.queue.js
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { executeEmailSend } from './email.service.js';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || '';
const QUEUE_NAME = 'email-queue';

let emailQueue = null;
let useRedis = false;

// Fallback in-memory queue for local development
const inMemoryQueue = [];
let isProcessingInMemory = false;

async function processInMemoryQueue() {
  if (isProcessingInMemory || inMemoryQueue.length === 0) return;
  isProcessingInMemory = true;
  
  while (inMemoryQueue.length > 0) {
    // Sort to process highest priority first (lower number = higher priority)
    inMemoryQueue.sort((a, b) => a.priority - b.priority);
    const job = inMemoryQueue.shift();
    
    try {
      console.log(`[InMemoryQueue] Processing email job to: ${job.data.to}`);
      await executeEmailSend(job.data);
      console.log(`[InMemoryQueue] Successfully sent email to: ${job.data.to}`);
    } catch (error) {
      console.error(`[InMemoryQueue] Failed to send email to ${job.data.to}:`, error);
      // Basic retry logic for in-memory (max 3 retries)
      if ((job.attempts || 0) < 3) {
        job.attempts = (job.attempts || 0) + 1;
        // Re-add to queue with lower priority
        job.priority += 10;
        inMemoryQueue.push(job);
        console.log(`[InMemoryQueue] Re-queued job for ${job.data.to} (Attempt ${job.attempts}/3)`);
      }
    }
  }
  
  isProcessingInMemory = false;
}

if (REDIS_URL) {
  try {
    const connection = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('[Redis] Connection failed multiple times. Falling back to in-memory queue.');
          useRedis = false;
          return null; // Stop retrying
        }
        return Math.min(times * 500, 2000);
      }
    });

    connection.on('ready', () => {
      console.log('[Redis] Connected successfully for Email Queue.');
      useRedis = true;
      
      emailQueue = new Queue(QUEUE_NAME, { connection });
      
      const worker = new Worker(QUEUE_NAME, async (job) => {
        console.log(`[BullMQ] Processing email job ${job.id} to: ${job.data.to}`);
        await executeEmailSend(job.data);
      }, { connection, concurrency: 5 });
      
      worker.on('completed', (job) => {
        console.log(`[BullMQ] Email job ${job.id} completed successfully`);
      });
      
      worker.on('failed', (job, err) => {
        console.error(`[BullMQ] Email job ${job.id} failed:`, err.message);
      });
    });
    
    connection.on('error', (err) => {
      console.warn(`[Redis] Connection error: ${err.message}`);
    });

  } catch (error) {
    console.error('[Redis] Setup failed, using in-memory queue:', error.message);
  }
} else {
  console.log('[Email Queue] No REDIS_URL found. Using local In-Memory queue.');
}

/**
 * Enqueue an email to be sent asynchronously.
 * @param {Object} mailOptions - The email options (to, from, subject, html, etc.)
 * @param {number} priority - Priority (1 = highest e.g., OTP, 10 = normal workflow)
 */
export async function enqueueEmail(mailOptions, priority = 10) {
  if (useRedis && emailQueue) {
    await emailQueue.add('send-email', mailOptions, {
      priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000 // Retry after 5s, 10s, 20s...
      },
      removeOnComplete: true,
      removeOnFail: 100 // Keep last 100 failed jobs for debugging
    });
    console.log(`[BullMQ] Enqueued email to ${mailOptions.to} (Priority: ${priority})`);
  } else {
    // Fallback to In-Memory Queue
    inMemoryQueue.push({
      data: mailOptions,
      priority,
      attempts: 0
    });
    console.log(`[InMemoryQueue] Enqueued email to ${mailOptions.to} (Priority: ${priority})`);
    
    // Trigger processing asynchronously
    setTimeout(processInMemoryQueue, 100);
  }
}
