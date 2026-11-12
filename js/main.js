import { getPokemonPage, getPokemonDetails, getCards, getCardById, formatPrice } from "./api.js";
import { storage } from "./storage.js";

const app = document.querySelector("#app");
const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const title = value => String(value || "").replace(/-/g, " ").replace(/\b\w/g, char => char.toUpperCase());
const money = value => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
let routeToken = 0;
let pokemonPage = 0;
let cardPage = 1;
let pokemonCache = [];
let cardCache = [];

function toast(message) {
  const region = $("#toastRegion");
  if (!region) return;
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  region.append(node);
  setTimeout(() => node.remove(), 3200);
}
function header(kicker, heading, description, action = "") {
  return `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${heading}</h1><p>${description}</p></div>${action}</div>`;
}
function setPage(name) { $("#pageName").textContent = name; }
function loading(message = "Carregando dados...") {
  app.innerHTML = `<div class="loading-state"><div class="loader"></div><p>${esc(message)}</p></div>`;
}
function errorPanel(error, retry) {
  const message = esc(error?.message || "Não foi possível carregar os dados.");
  app.insertAdjacentHTML("beforeend", `<div class="panel"><strong>Não conseguimos carregar esta área.</strong><p>${message}</p><button class="btn btn-primary" id="retryLoad">Tentar novamente</button></div>`);
  $("#retryLoad")?.addEventListener("click", retry, { once: true });
}
function pokemonCard(p) {
  return `<article class="pokemon-card"><div class="pokemon-art"><span class="pokemon-number">#${String(p.id).padStart(4,"0")}</span><img loading="lazy" src="${esc(p.image)}" alt="${esc(p.name)}" onerror="this.style.opacity='.2'"></div><div class="pokemon-info"><h3>${esc(title(p.name))}</h3><div class="tag-row">${(p.types || []).map(type => `<span class="type-tag">${esc(title(type))}</span>`).join("")}</div><button class="text-link" data-pokemon="${esc(p.name)}">Ver detalhes →</button></div></article>`;
}
function cardTile(card) {
  const price = formatPrice(card);
  return `<article class="tcg-card"><div class="tcg-image"><img loading="lazy" src="${esc(card.image)}" alt="${esc(card.name)}"></div><div class="tcg-info"><h3>${esc(card.name)}</h3><p class="card-meta">${esc(card.set)} · #${esc(card.number)}</p><span class="rarity-tag">${esc(card.rarity)}</span><div class="tcg-bottom"><strong>${price !== null ? money(price) : "Sem cotação"}</strong><div class="card-actions"><button class="btn btn-soft btn-small" data-add-card="${esc(card.id)}" title="Adicionar à coleção">＋</button><button class="btn btn-soft btn-small" data-detail-card="${esc(card.id)}">Ver</button></div></div></div></article>`;
}
function empty(message) { return `<div class="empty-state">${esc(message)}</div>`; }

function home() {
  setPage("Visão geral");
  const collection = storage.getCollection();
  const listings = storage.getListings();
  app.innerHTML = `<section class="hero"><div class="hero-content"><div class="eyebrow">SEU UNIVERSO POKÉMON TCG</div><h1>Explore, colecione<br>e encontre sua próxima carta.</h1><p>Descubra Pokémon, acompanhe cartas e organize seu acervo em um só lugar.</p><div class="hero-actions"><a class="btn btn-primary" href="#cartas">Explorar cartas ↗</a><a class="btn btn-secondary" href="#pokedex">Abrir Pokédex</a></div></div></section>
  <section class="stats-grid"><div class="stat-card"><div class="stat-top">Cartas na coleção</div><div class="stat-value">${collection.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)}</div></div><div class="stat-card"><div class="stat-top">Cartas diferentes</div><div class="stat-value">${collection.length}</div></div><div class="stat-card"><div class="stat-top">Anúncios locais</div><div class="stat-value">${listings.length}</div></div><div class="stat-card"><div class="stat-top">Favoritos</div><div class="stat-value">${collection.filter(item => item.favorite).length}</div></div></section>
  <div class="section-head"><h2>Acesso rápido</h2></div><div class="quick-grid"><a class="quick-card" href="#pokedex"><strong>Pokédex</strong><small>Espécies, tipos e detalhes</small></a><a class="quick-card" href="#cartas"><strong>Catálogo TCG</strong><small>Busque cartas e edições</small></a><a class="quick-card" href="#colecao"><strong>Minha coleção</strong><small>Organize seu acervo</small></a><a class="quick-card" href="#baralhos"><strong>Meus baralhos</strong><small>Monte listas de cartas</small></a></div>
  <div class="section-head"><h2>Pokémon para descobrir</h2><a class="text-link" href="#pokedex">Ver Pokédex →</a></div><div class="content-grid" id="homePokemon"><p>Carregando Pokémon…</p></div>
  <div class="section-head"><h2>Cartas em destaque</h2><a class="text-link" href="#cartas">Ver catálogo →</a></div><div class="content-grid" id="homeCards"><p>Carregando cartas…</p></div>`;
  const token = ++routeToken;
  getPokemonPage({ limit: 4 }).then(data => { if (token === routeToken && $("#homePokemon")) $("#homePokemon").innerHTML = data.results.map(pokemonCard).join(""); }).catch(error => { if (token === routeToken && $("#homePokemon")) $("#homePokemon").innerHTML = empty(error.message); });
  getCards({ pageSize: 4 }).then(data => { if (token === routeToken && $("#homeCards")) $("#homeCards").innerHTML = data.results.map(cardTile).join(""); }).catch(error => { if (token === routeToken && $("#homeCards")) $("#homeCards").innerHTML = empty(error.message); });
}

async function pokedex() {
  setPage("Pokédex");
  app.innerHTML = header("ENCICLOPÉDIA", "Pokédex", "Pesquise Pokémon por nome ou número e filtre por tipo.") +
    `<div class="filter-panel"><input class="field" id="pokeSearch" placeholder="Nome ou número do Pokémon"><select class="field" id="pokeType"><option value="">Todos os tipos</option>${["normal","fire","water","grass","electric","ice","fighting","poison","ground","flying","psychic","bug","rock","ghost","dragon","dark","steel","fairy"].map(type => `<option value="${type}">${title(type)}</option>`).join("")}</select><button class="btn btn-primary" id="pokeFind">Buscar</button></div><p class="result-line" id="pokeCount"></p><div class="content-grid" id="pokemonGrid"></div><div class="pagination"><button class="page-btn" id="pokePrev">← Anterior</button><span id="pokePageLabel"></span><button class="page-btn" id="pokeNext">Próxima →</button></div>`;
  const token = ++routeToken;
  const load = async () => {
    const grid = $("#pokemonGrid"); if (!grid) return;
    grid.innerHTML = "<p>Carregando Pokémon…</p>";
    try {
      const data = await getPokemonPage({ offset: pokemonPage * 24, limit: 24 });
      if (token !== routeToken) return;
      pokemonCache = data.results;
      draw();
      $("#pokePageLabel").textContent = `Página ${pokemonPage + 1}`;
      $("#pokePrev").disabled = pokemonPage === 0;
      $("#pokeNext").disabled = (pokemonPage + 1) * 24 >= data.count;
    } catch (error) { if (token === routeToken) { grid.textContent = error.message; } }
  };
  const draw = () => {
    const query = $("#pokeSearch").value.trim().toLowerCase(), type = $("#pokeType").value;
    const matches = pokemonCache.filter(p => (!query || p.name.includes(query) || String(p.id) === query) && (!type || p.types.includes(type)));
    $("#pokeCount").textContent = `${matches.length} Pokémon nesta página`;
    $("#pokemonGrid").innerHTML = matches.map(pokemonCard).join("") || empty("Nenhum Pokémon encontrado nesta página. Tente outro termo ou avance.");
  };
  $("#pokeFind").onclick = () => { if (pokemonPage !== 0) pokemonPage = 0; load(); };
  $("#pokeSearch").onkeydown = event => { if (event.key === "Enter") { pokemonPage = 0; load(); } };
  $("#pokeType").onchange = draw;
  $("#pokePrev").onclick = () => { if (pokemonPage > 0) { pokemonPage--; load(); } };
  $("#pokeNext").onclick = () => { pokemonPage++; load(); };
  await load();
}

async function cards() {
  setPage("Cartas TCG");
  app.innerHTML = header("CATÁLOGO", "Cartas Pokémon TCG", "Busque cartas, filtre resultados e adicione itens à sua coleção.") +
    `<div class="filter-panel"><input class="field" id="cardSearch" placeholder="Nome da carta ou Pokémon"><select class="field" id="cardType"><option value="">Todos os tipos</option>${["Colorless","Darkness","Dragon","Fairy","Fighting","Fire","Grass","Lightning","Metal","Psychic","Water"].map(type => `<option>${type}</option>`).join("")}</select><select class="field" id="cardRarity"><option value="">Todas as raridades</option>${["Common","Uncommon","Rare","Rare Holo","Rare Ultra","Rare Secret","Illustration Rare","Special Illustration Rare"].map(rarity => `<option>${rarity}</option>`).join("")}</select><button class="btn btn-primary" id="cardSearchBtn">Pesquisar</button></div><p id="cardCount" class="result-line"></p><div class="content-grid" id="cardGrid"></div><div class="pagination"><button class="page-btn" id="cardPrev">← Anterior</button><span id="cardPageLabel"></span><button class="page-btn" id="cardNext">Próxima →</button></div>`;
  const token = ++routeToken;
  const load = async () => {
    const grid = $("#cardGrid"); grid.innerHTML = "<p>Carregando cartas…</p>";
    try {
      const data = await getCards({ page: cardPage, pageSize: 24, q: $("#cardSearch").value.trim(), type: $("#cardType").value, rarity: $("#cardRarity").value });
      if (token !== routeToken) return;
      cardCache = data.results;
      $("#cardCount").textContent = `${Number(data.total || 0).toLocaleString("pt-BR")} resultados encontrados`;
      grid.innerHTML = data.results.map(cardTile).join("") || empty("Nenhuma carta encontrada.");
      $("#cardPageLabel").textContent = `Página ${cardPage}`;
      $("#cardPrev").disabled = cardPage <= 1;
      $("#cardNext").disabled = cardPage * 24 >= data.total;
    } catch (error) { if (token === routeToken) grid.textContent = error.message; }
  };
  const search = () => { cardPage = 1; load(); };
  $("#cardSearchBtn").onclick = search;
  $("#cardSearch").onkeydown = event => { if (event.key === "Enter") search(); };
  $("#cardType").onchange = search; $("#cardRarity").onchange = search;
  $("#cardPrev").onclick = () => { if (cardPage > 1) { cardPage--; load(); } };
  $("#cardNext").onclick = () => { cardPage++; load(); };
  await load();
}

function collection() {
  setPage("Minha coleção");
  const list = storage.getCollection();
  const count = list.reduce((sum, card) => sum + (Number(card.qty) || 0), 0);
  app.innerHTML = header("ACERVO", "Minha coleção", "Controle quantidades, favoritos e exporte seu acervo.") +
    `<div class="notice">${count} cartas no total · ${list.length} cartas diferentes. Os dados ficam salvos neste navegador.</div><div class="filter-panel"><input class="field" id="collectionSearch" placeholder="Filtrar minha coleção"><button class="btn btn-secondary" id="exportCollection">Exportar coleção</button><label class="btn btn-secondary">Importar backup<input id="importCollection" type="file" accept="application/json" hidden></label></div><div class="content-grid" id="collectionGrid"></div>`;
  const draw = () => {
    const q = $("#collectionSearch").value.toLowerCase();
    const filtered = storage.getCollection().filter(card => card.name.toLowerCase().includes(q) || card.set.toLowerCase().includes(q));
    $("#collectionGrid").innerHTML = filtered.map(card => `<article class="tcg-card"><div class="tcg-image"><img src="${esc(card.image)}" alt="${esc(card.name)}"></div><div class="tcg-info"><h3>${esc(card.name)}</h3><p class="card-meta">${esc(card.set)} · #${esc(card.number)}</p><div class="qty-control"><button data-qty="${esc(card.id)}" data-delta="-1">−</button><strong>${card.qty}</strong><button data-qty="${esc(card.id)}" data-delta="1">＋</button><button data-fav="${esc(card.id)}">${card.favorite ? "★" : "☆"}</button></div><button class="btn btn-danger btn-small" data-remove="${esc(card.id)}">Remover</button></div></article>`).join("") || empty("Sua coleção está vazia. Adicione cartas pelo catálogo.");
  };
  draw(); $("#collectionSearch").oninput = draw;
  $("#exportCollection").onclick = () => {
    const blob = new Blob([JSON.stringify(storage.getCollection(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = "pokevault-colecao.json"; link.click(); URL.revokeObjectURL(url);
  };
  $("#importCollection").onchange = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed) || parsed.some(card => !card.id || !card.name)) throw new Error("Arquivo de backup inválido.");
      storage.saveCollection(parsed.map(card => ({ ...card, qty: Math.max(1, Number(card.qty) || 1), favorite: Boolean(card.favorite) })));
      toast("Coleção importada."); collection();
    } catch (error) { toast(error.message); }
  };
}

function prices() {
  setPage("Preços");
  app.innerHTML = header("MERCADO TCG", "Consulta de preços", "Consulte valores disponíveis nas fontes conectadas.") +
    `<div class="notice">A API pode retornar valores internacionais em moedas diferentes. Eles são referências externas, não cotações garantidas em reais nem preços do mercado brasileiro.</div><div class="filter-panel"><input class="field" id="priceSearch" placeholder="Nome da carta"><button class="btn btn-primary" id="priceSearchBtn">Consultar</button></div><div id="priceResults"></div>`;
  const search = async () => {
    const query = $("#priceSearch").value.trim(); if (!query) return toast("Digite o nome de uma carta.");
    $("#priceResults").textContent = "Consultando…";
    try {
      const data = await getCards({ pageSize: 20, q: query });
      $("#priceResults").innerHTML = data.results.map(card => {
        const value = formatPrice(card);
        return `<div class="panel"><strong>${esc(card.name)} — ${esc(card.set)}</strong><p>${value !== null ? `Valor informado: ${value} (moeda da fonte)` : "Sem cotação disponível"} · Fonte: ${esc(card.priceSource || "não informada")}</p><button class="btn btn-soft btn-small" data-detail-card="${esc(card.id)}">Ver carta</button></div>`;
      }).join("") || empty("Nenhuma carta encontrada.");
    } catch (error) { $("#priceResults").textContent = error.message; }
  };
  $("#priceSearchBtn").onclick = search;
  $("#priceSearch").onkeydown = event => { if (event.key === "Enter") search(); };
}

function market() {
  setPage("Marketplace");
  app.innerHTML = header("NEGOCIAÇÃO", "Marketplace", "Crie e organize anúncios demonstrativos neste dispositivo.", '<button class="btn btn-primary" id="newListing">＋ Criar anúncio</button>') +
    `<div class="notice">Modo demonstração: anúncios salvos apenas no seu navegador. Não há usuários, pagamentos, chat ou intermediação real.</div><div class="filter-panel"><input class="field" id="marketSearch" placeholder="Pesquisar anúncios"><select class="field" id="marketSort"><option value="new">Mais recentes</option><option value="low">Menor preço</option><option value="high">Maior preço</option></select></div><div id="marketList" class="market-list"></div>`;
  const draw = () => {
    const query = $("#marketSearch").value.toLowerCase();
    let items = storage.getListings().filter(item => item.name.toLowerCase().includes(query));
    if ($("#marketSort").value === "low") items.sort((a,b) => a.price-b.price);
    if ($("#marketSort").value === "high") items.sort((a,b) => b.price-a.price);
    $("#marketList").innerHTML = items.map(item => `<article class="market-card"><div></div><div><h3>${esc(item.name)}</h3><div class="market-price">${money(item.price)}</div><p>${esc(item.description || "Sem descrição")}</p><small>${new Date(item.createdAt).toLocaleDateString("pt-BR")}</small><p><button class="btn btn-danger btn-small" data-delete-listing="${esc(item.id)}">Excluir anúncio</button></p></div></article>`).join("") || empty("Nenhum anúncio. Crie o primeiro!");
  };
  draw(); $("#marketSearch").oninput = draw; $("#marketSort").onchange = draw;
  $("#newListing").onclick = () => {
    const name = prompt("Nome da carta ou produto:");
    if (!name?.trim()) return;
    const price = Number(prompt("Preço em reais (ex.: 35,90):")?.replace(",", "."));
    if (!Number.isFinite(price) || price <= 0) return toast("Informe um preço válido.");
    const description = prompt("Descrição do anúncio:") || "";
    const items = storage.getListings();
    items.unshift({ id: crypto.randomUUID(), name: name.trim(), price, description, createdAt: Date.now() });
    storage.saveListings(items); draw(); toast("Anúncio salvo neste dispositivo.");
  };
}

function decks() {
  setPage("Meus baralhos");
  const list = storage.getDecks();
  app.innerHTML = header("CONSTRUÇÃO", "Meus baralhos", "Monte listas e acompanhe a quantidade de cartas de cada deck.", '<button class="btn btn-primary" id="newDeck">＋ Novo baralho</button>') +
    `<div class="notice">Construtor de listas em modo local. A validação de regras oficiais e legalidade de torneios ainda não está integrada.</div><div id="deckList" class="market-list"></div>`;
  const draw = () => {
    const decks = storage.getDecks();
    $("#deckList").innerHTML = decks.map(deck => `<article class="panel"><h3>${esc(deck.name)}</h3><p>${deck.cards.length} tipos de cartas · ${deck.cards.reduce((sum, card) => sum + card.qty, 0)} cartas</p><button class="btn btn-soft btn-small" data-edit-deck="${esc(deck.id)}">Adicionar carta</button> <button class="btn btn-danger btn-small" data-delete-deck="${esc(deck.id)}">Excluir</button><div>${deck.cards.map(card => `<p>${esc(card.name)} × ${card.qty} <button class="page-btn" data-deck-remove="${esc(deck.id)}" data-card-id="${esc(card.id)}">−</button></p>`).join("")}</div></article>`).join("") || empty("Você ainda não criou um baralho.");
  };
  draw();
  $("#newDeck").onclick = () => {
    const name = prompt("Nome do baralho:")?.trim(); if (!name) return;
    const decks = storage.getDecks(); decks.push({ id: crypto.randomUUID(), name, cards: [] }); storage.saveDecks(decks); draw();
  };
}

function profile() {
  setPage("Perfil");
  const saved = storage.getProfile();
  app.innerHTML = header("TREINADOR", "Meu perfil", "Personalize seu nome e suas preferências locais.") +
    `<div class="panel"><div class="form-grid"><label class="form-group">Nome de treinador<input class="field" id="profileName" maxlength="40" value="${esc(saved.name)}"></label><label class="form-group">Região favorita<input class="field" id="profileRegion" maxlength="40" value="${esc(saved.region)}"></label><label class="form-group full">Sobre você<textarea class="field" id="profileBio" rows="4" maxlength="300">${esc(saved.bio)}</textarea></label></div><button class="btn btn-primary" id="saveProfile">Salvar perfil</button><p class="muted">Perfil local, sem conta ou sincronização online.</p></div>`;
  $("#saveProfile").onclick = () => {
    storage.saveProfile({ name: $("#profileName").value.trim(), region: $("#profileRegion").value.trim(), bio: $("#profileBio").value.trim() });
    updateProfileLabel(); toast("Perfil salvo.");
  };
}
function about() {
  setPage("Sobre a plataforma");
  app.innerHTML = header("SOBRE", "PokéVault", "Uma central independente para fãs e colecionadores.") +
    `<div class="panel"><h3>O que já está disponível</h3><p>Pokédex, catálogo de cartas, detalhes, consulta de preços retornados pelas APIs, coleção, favoritos, backup e importação, construtor simples de baralhos, perfil local e marketplace demonstrativo.</p><h3>O que exige backend para ser real</h3><p>Cadastro e login seguros, perfis multiusuário, sincronização na nuvem, marketplace público, chat, avaliações, moderação, torneios com inscrições, pagamentos e painel administrativo. Esses recursos não podem ser simulados como se fossem operações reais.</p><h3>Fontes de dados</h3><p>PokéAPI e Pokémon TCG API. Disponibilidade e limites dependem dos serviços externos.</p></div>`;
}

async function showPokemon(name) {
  const token = ++routeToken; loading("Carregando detalhes do Pokémon…");
  try {
    const pokemon = await getPokemonDetails(name); if (token !== routeToken) return;
    setPage("Detalhes Pokémon");
    app.innerHTML = header("POKÉDEX", title(pokemon.name), `Pokémon #${pokemon.id}`) +
      `<div class="detail-layout panel"><img class="detail-image" src="${esc(pokemon.image)}" alt="${esc(pokemon.name)}"><div><h2>#${pokemon.id} ${esc(title(pokemon.name))}</h2><p>Tipos: ${pokemon.types.map(title).join(", ")}</p><p>Altura: ${pokemon.height/10} m · Peso: ${pokemon.weight/10} kg</p><p>Habilidades: ${pokemon.abilities.map(title).join(", ")}</p><h3>Atributos base</h3>${pokemon.stats.map(stat => `<p>${esc(title(stat.name))}: <strong>${stat.value}</strong></p>`).join("")}<a class="btn btn-secondary" href="#pokedex">← Voltar à Pokédex</a></div></div>`;
  } catch (error) { if (token === routeToken) { app.innerHTML = empty(error.message) + '<a class="btn btn-secondary" href="#pokedex">Voltar</a>'; } }
}
async function showCard(id) {
  const token = ++routeToken; loading("Carregando carta…");
  try {
    const card = await getCardById(id); if (token !== routeToken) return;
    setPage("Detalhes da carta");
    app.innerHTML = header("CARTA TCG", card.name, card.set) +
      `<div class="detail-layout panel"><img class="detail-image" src="${esc(card.image)}" alt="${esc(card.name)}"><div><h2>${esc(card.name)}</h2><p>${esc(card.set)} · #${esc(card.number)}</p><p>Raridade: ${esc(card.rarity)}</p><p>HP: ${esc(card.hp)}</p><p>Artista: ${esc(card.artist)}</p><p>Preço informado: ${formatPrice(card) ?? "Não disponível"} (${esc(card.priceSource || "sem fonte")})</p><button class="btn btn-primary" data-add-card="${esc(card.id)}">＋ Adicionar à coleção</button> <a class="btn btn-secondary" href="#cartas">Voltar ao catálogo</a></div></div>`;
  } catch (error) { if (token === routeToken) app.innerHTML = empty(error.message) + '<a class="btn btn-secondary" href="#cartas">Voltar</a>'; }
}
function addCollection(card) {
  const items = storage.getCollection(), existing = items.find(item => item.id === card.id);
  if (existing) existing.qty = (Number(existing.qty) || 1) + 1;
  else items.push({ ...card, qty: 1, favorite: false });
  storage.saveCollection(items); toast("Carta adicionada à coleção.");
}
function updateProfileLabel() {
  const profile = storage.getProfile();
  const name = $(".mini-profile strong");
  const avatar = $(".mini-profile .avatar");
  if (name) name.textContent = profile.name || "Treinador";
  if (avatar) avatar.textContent = (profile.name || "P").slice(0,1).toUpperCase();
}
function navigate() {
  const route = location.hash.slice(1) || "inicio";
  document.querySelectorAll("[data-route]").forEach(link => link.classList.toggle("active", link.dataset.route === route));
  $("#sidebar")?.classList.remove("open");
  const routes = { inicio: home, pokedex, cartas: cards, precos: prices, colecao: collection, mercado: market, baralhos: decks, perfil: profile, sobre: about };
  (routes[route] || home)();
}
document.addEventListener("click", async event => {
  const pokemon = event.target.closest("[data-pokemon]"); if (pokemon) return showPokemon(pokemon.dataset.pokemon);
  const detail = event.target.closest("[data-detail-card]"); if (detail) return showCard(detail.dataset.detailCard);
  const add = event.target.closest("[data-add-card]");
  if (add) { try { addCollection(await getCardById(add.dataset.addCard)); } catch (error) { toast(error.message); } return; }
  const quantity = event.target.closest("[data-qty]");
  if (quantity) {
    const items = storage.getCollection(), card = items.find(item => item.id === quantity.dataset.qty);
    if (card) card.qty = (Number(card.qty) || 1) + Number(quantity.dataset.delta);
    storage.saveCollection(items.filter(item => item.qty > 0)); collection(); return;
  }
  const favorite = event.target.closest("[data-fav]");
  if (favorite) { const items = storage.getCollection(), card = items.find(item => item.id === favorite.dataset.fav); if (card) card.favorite = !card.favorite; storage.saveCollection(items); collection(); return; }
  const remove = event.target.closest("[data-remove]");
  if (remove) { storage.saveCollection(storage.getCollection().filter(item => item.id !== remove.dataset.remove)); collection(); return; }
  const deleteListing = event.target.closest("[data-delete-listing]");
  if (deleteListing) { storage.saveListings(storage.getListings().filter(item => item.id !== deleteListing.dataset.deleteListing)); market(); return; }
  const deleteDeck = event.target.closest("[data-delete-deck]");
  if (deleteDeck) { storage.saveDecks(storage.getDecks().filter(deck => deck.id !== deleteDeck.dataset.deleteDeck)); decks(); return; }
  const editDeck = event.target.closest("[data-edit-deck]");
  if (editDeck) {
    const query = prompt("Nome da carta para adicionar ao baralho:")?.trim(); if (!query) return;
    try {
      const result = await getCards({ pageSize: 5, q: query });
      if (!result.results.length) return toast("Carta não encontrada.");
      const chosen = result.results[0], items = storage.getDecks(), deck = items.find(item => item.id === editDeck.dataset.editDeck);
      const existing = deck.cards.find(card => card.id === chosen.id);
      if (existing) existing.qty++; else deck.cards.push({ id: chosen.id, name: chosen.name, qty: 1 });
      storage.saveDecks(items); decks(); toast(`${chosen.name} adicionado.`);
    } catch (error) { toast(error.message); }
    return;
  }
  const removeDeckCard = event.target.closest("[data-deck-remove]");
  if (removeDeckCard) {
    const items = storage.getDecks(), deck = items.find(item => item.id === removeDeckCard.dataset.deckRemove);
    const card = deck?.cards.find(item => item.id === removeDeckCard.dataset.cardId);
    if (card && --card.qty <= 0) deck.cards = deck.cards.filter(item => item.id !== card.id);
    storage.saveDecks(items); decks();
  }
});
function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next; storage.saveTheme(next);
}
$("#themeToggle")?.addEventListener("click", toggleTheme);
$("#topTheme")?.addEventListener("click", toggleTheme);
$("#mobileMenu")?.addEventListener("click", () => $("#sidebar")?.classList.toggle("open"));
$("#globalSearch")?.addEventListener("keydown", event => {
  if (event.key === "Enter" && event.target.value.trim()) {
    const query = event.target.value.trim(); location.hash = "#cartas";
    setTimeout(() => { const input = $("#cardSearch"); if (input) { input.value = query; $("#cardSearchBtn")?.click(); } }, 100);
  }
});
document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { $("#globalSearch")?.focus(); event.preventDefault(); }
});
window.addEventListener("error", event => {
  console.error("PokéVault:", event.error || event.message);
  if (app && !app.innerHTML.trim()) app.innerHTML = '<div class="panel"><h2>Erro ao iniciar a PokéVault</h2><p>Atualize a página. Se continuar, abra o console do navegador e envie a mensagem de erro.</p></div>';
});
window.addEventListener("unhandledrejection", event => { console.error("PokéVault:", event.reason); });
try {
  document.documentElement.dataset.theme = storage.getTheme();
  updateProfileLabel();
  window.addEventListener("hashchange", navigate);
  navigate();
} catch (error) {
  console.error("Falha na inicialização:", error);
  app.innerHTML = `<div class="panel"><h2>Não foi possível iniciar a PokéVault</h2><p>${esc(error.message)}</p><button class="btn btn-primary" onclick="location.reload()">Recarregar</button></div>`;
}
