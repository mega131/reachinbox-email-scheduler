import { redis } from './redis.js';

const RATE_LIMIT_LUA_SCRIPT = `
-- KEYS[1]: Hourly limit key (e.g. sender:{id}:hourly:{window})
-- KEYS[2]: Last send timestamp key (e.g. sender:{id}:last_send_ts)
-- ARGV[1]: Hourly limit quota
-- ARGV[2]: Minimum inter-send delay in ms
-- ARGV[3]: Current timestamp in ms

local hourlyKey = KEYS[1]
local lastTsKey = KEYS[2]
local hourlyLimit = tonumber(ARGV[1])
local minDelayMs = tonumber(ARGV[2])
local nowMs = tonumber(ARGV[3])

-- 1. Check Hourly Limit Quota
local currentCount = tonumber(redis.call('GET', hourlyKey) or '0')
if currentCount >= hourlyLimit then
  return { 0, currentCount, 0 }
end

-- 2. Coordinate Minimum Inter-Send Delay
local lastTs = tonumber(redis.call('GET', lastTsKey) or '0')
local waitNeededMs = 0
local nextAllowedTs = lastTs + minDelayMs

if nowMs < nextAllowedTs then
  waitNeededMs = nextAllowedTs - nowMs
  -- Reserve the slot for this send so concurrent workers do not collide
  redis.call('SET', lastTsKey, tostring(nextAllowedTs), 'PX', 3600000)
else
  redis.call('SET', lastTsKey, tostring(nowMs), 'PX', 3600000)
end

-- 3. Atomically increment hourly quota
local newCount = redis.call('INCR', hourlyKey)
if newCount == 1 then
  redis.call('EXPIRE', hourlyKey, 7200) -- 2-hour TTL
end

-- Returns [allowed (1 or 0), currentCount, waitNeededMs]
return { 1, newCount, waitNeededMs }
`;

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  waitNeededMs: number;
  windowHour: string;
  nextWindowTimestamp: number;
}

export async function checkAndReserveSendSlot(params: {
  senderId: string;
  hourlyLimit: number;
  minDelayMs: number;
}): Promise<RateLimitCheckResult> {
  const { senderId, hourlyLimit, minDelayMs } = params;
  const now = new Date();
  const nowMs = now.getTime();

  // Consistent hourly window key: YYYY-MM-DD-HH
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hour = String(now.getUTCHours()).padStart(2, '0');
  const windowHour = `${year}-${month}-${day}T${hour}:00:00Z`;

  // Start of next hour window
  const nextHourDate = new Date(Date.UTC(year, now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1, 0, 5));
  const nextWindowTimestamp = nextHourDate.getTime();

  const hourlyKey = `rate:sender:${senderId}:hourly:${year}${month}${day}${hour}`;
  const lastTsKey = `rate:sender:${senderId}:last_send_ts`;

  const rawResult = (await redis.eval(
    RATE_LIMIT_LUA_SCRIPT,
    2,
    hourlyKey,
    lastTsKey,
    String(hourlyLimit),
    String(minDelayMs),
    String(nowMs)
  )) as [number, number, number];

  const allowed = rawResult[0] === 1;
  const currentCount = rawResult[1];
  const waitNeededMs = rawResult[2];

  return {
    allowed,
    currentCount,
    waitNeededMs,
    windowHour,
    nextWindowTimestamp
  };
}
