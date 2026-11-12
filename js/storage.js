const KEYS = {
  collection: "pokevault_collection_v1",
  listings: "pokevault_listings_v1",
  decks: "pokevault_decks_v1",
  profile: "pokevault_profile_v1",
  theme: "pokevault_theme_v1"
};
function read(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    console.warn("PokéVault storage read:", error);
    return fallback;
  }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (error) { console.error("PokéVault storage write:", error); return false; }
}
export const storage = {
  getCollection: () => read(KEYS.collection, []),
  saveCollection: value => write(KEYS.collection, value),
  getListings: () => read(KEYS.listings, []),
  saveListings: value => write(KEYS.listings, value),
  getDecks: () => read(KEYS.decks, []),
  saveDecks: value => write(KEYS.decks, value),
  getProfile: () => read(KEYS.profile, { name: "", region: "", bio: "" }),
  saveProfile: value => write(KEYS.profile, value),
  getTheme: () => read(KEYS.theme, "light"),
  saveTheme: value => write(KEYS.theme, value)
};
