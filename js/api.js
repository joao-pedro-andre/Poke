const POKE = "https://pokeapi.co/api/v2";
const TCG = "https://api.pokemontcg.io/v2";

const responseCache = new Map();
const pendingRequests = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function request(url, attempts = 3) {
  const cached = responseCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  if (pendingRequests.has(url)) return pendingRequests.get(url);

  const task = (async () => {
    let lastError;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
        if (!response.ok) {
          const error = new Error(response.status === 429
            ? "A API limitou temporariamente as consultas. Aguarde alguns segundos e tente novamente."
            : response.status >= 500
              ? "O servidor de cartas está temporariamente indisponível."
              : `Não foi possível localizar os dados (HTTP ${response.status}).`);
          error.status = response.status;
          if (response.status < 500 && response.status !== 429) throw error;
          lastError = error;
          const retryAfter = Number(response.headers.get("Retry-After"));
          const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 8000) : Math.min(700 * (2 ** attempt), 4000);
          if (attempt + 1 < attempts) await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        const data = await response.json();
        responseCache.set(url, { data, expiresAt: Date.now() + CACHE_TTL });
        if (responseCache.size > 180) responseCache.delete(responseCache.keys().next().value);
        return data;
      } catch (error) {
        if (Number.isInteger(error.status) && error.status < 500 && error.status !== 429) throw error;
        lastError = error.name === "AbortError" ? new Error("A API demorou para responder. Tente novamente.") : error;
        if (attempt + 1 < attempts) await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastError || new Error("Não foi possível consultar a API.");
  })();

  pendingRequests.set(url, task);
  try { return await task; }
  finally { pendingRequests.delete(url); }
}

async function mapWithConcurrency(items, limit, mapper) {
  const output = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      output[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return output;
}

function normalizePokemon(d) {
  return {
    id: d.id,
    name: d.name,
    image: d.sprites.other?.["official-artwork"]?.front_default || d.sprites.front_default,
    types: d.types.map(item => item.type.name),
    height: d.height,
    weight: d.weight,
    baseExperience: d.base_experience,
    stats: d.stats.map(stat => ({ name: stat.stat.name, value: stat.base_stat }))
  };
}

export async function getPokemonPage({ offset = 0, limit = 24 } = {}) {
  const data = await request(`${POKE}/pokemon?offset=${offset}&limit=${limit}`);
  const results = await mapWithConcurrency(data.results, 8, async pokemon => {
    const details = await request(pokemon.url);
    return normalizePokemon(details);
  });
  return { results, count: data.count };
}

export async function getPokemonDetails(name) {
  const data = await request(`${POKE}/pokemon/${encodeURIComponent(name)}`);
  return {
    ...normalizePokemon(data),
    abilities: data.abilities.map(item => item.ability.name)
  };
}

function escapeQuery(value) {
  return String(value).replace(/[{}[\\]\\\\]/g, "").replace(/"/g, '\\\"').trim();
}

export async function getCards({ page = 1, pageSize = 24, q = "", type = "", rarity = "", set = "" } = {}) {
  const parts = [];
  const safeName = escapeQuery(q);
  const safeSet = escapeQuery(set);
  if (safeName) parts.push(`name:"*${safeName}*"`);
  if (type) parts.push(`types:"${escapeQuery(type)}"`);
  if (rarity) parts.push(`rarity:"${escapeQuery(rarity)}"`);
  if (safeSet) parts.push(`set.name:"*${safeSet}*"`);

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(Math.min(Math.max(Number(pageSize) || 24, 1), 250)),
    orderBy: "-set.releaseDate"
  });
  if (parts.length) params.set("q", parts.join(" AND "));
  const data = await request(`${TCG}/cards?${params}`);
  return { results: data.data.map(normalizeCard), total: data.totalCount };
}

export async function getCardById(id) {
  const data = await request(`${TCG}/cards/${encodeURIComponent(id)}`);
  return normalizeCard(data.data);
}

function normalizeCard(card) {
  return {
    id: card.id,
    name: card.name,
    number: card.number,
    set: card.set?.name || "—",
    setId: card.set?.id,
    rarity: card.rarity || "Não informada",
    types: card.types || [],
    hp: card.hp || "—",
    image: card.images?.large || card.images?.small,
    artist: card.artist || "—",
    releaseDate: card.set?.releaseDate || "—",
    supertype: card.supertype || "",
    subtypes: card.subtypes || [],
    attacks: card.attacks || [],
    weaknesses: card.weaknesses || [],
    resistances: card.resistances || [],
    retreatCost: card.retreatCost || [],
    prices: card.cardmarket?.prices || card.tcgplayer?.prices || null,
    priceSource: card.cardmarket?.prices ? "Cardmarket" : card.tcgplayer?.prices ? "TCGplayer" : null
  };
}

export async function getCardSets() {
  const data = await request(`${TCG}/sets?orderBy=-releaseDate&pageSize=100`);
  return data.data.map(set => set.name);
}

export function formatPrice(card) {
  const prices = card?.prices;
  if (!prices || typeof prices !== "object") return null;

  const preferredKeys = ["market", "averageSellPrice", "trendPrice", "mid", "low"];
  const values = [];
  const visit = value => {
    if (!value || typeof value !== "object") return;
    for (const [key, nested] of Object.entries(value)) {
      if (typeof nested === "number" && Number.isFinite(nested) && nested > 0) {
        values.push({ key, value: nested });
      } else if (nested && typeof nested === "object") {
        visit(nested);
      }
    }
  };
  visit(prices);

  for (const key of preferredKeys) {
    const match = values.find(item => item.key === key);
    if (match) return match.value;
  }
  return values.length ? values[0].value : null;
}
