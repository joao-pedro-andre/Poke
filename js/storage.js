const KEYS={collection:"pokevault_collection_v1",listings:"pokevault_listings_v1",theme:"pokevault_theme_v1"};
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function write(key,value){localStorage.setItem(key,JSON.stringify(value))}
export const storage={
 getCollection:()=>read(KEYS.collection,[]), saveCollection:v=>write(KEYS.collection,v),
 getListings:()=>read(KEYS.listings,[]), saveListings:v=>write(KEYS.listings,v),
 getTheme:()=>read(KEYS.theme,"light"), saveTheme:v=>write(KEYS.theme,v)
};