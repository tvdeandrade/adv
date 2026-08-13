import { Redis } from "@upstash/redis";
import type { TravelRequest } from "./types";

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN não configurados. Veja o README para configurar o banco de dados (Upstash)."
    );
  }
  return new Redis({ url, token });
}

const INDEX_KEY = "requests:index";

function requestKey(id: string) {
  return `request:${id}`;
}

export async function saveRequest(req: TravelRequest): Promise<void> {
  const redis = getRedis();
  await redis.set(requestKey(req.id), req);
  await redis.sadd(INDEX_KEY, req.id);
}

export async function getRequest(id: string): Promise<TravelRequest | null> {
  const redis = getRedis();
  const data = await redis.get<TravelRequest>(requestKey(id));
  return data ?? null;
}

export async function listRequests(): Promise<TravelRequest[]> {
  const redis = getRedis();
  const ids = await redis.smembers(INDEX_KEY);
  if (!ids.length) return [];
  const items = await Promise.all(ids.map((id) => redis.get<TravelRequest>(requestKey(id))));
  return items
    .filter((item): item is TravelRequest => Boolean(item))
    .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
}
