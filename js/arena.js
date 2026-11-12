import { getCardById } from "./api.js";

const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export function renderArena(app, storage, toast) {
  app.innerHTML = `
    <div class="page-heading"><div><div class="eyebrow">BATALHAS</div><h1>Arena Pokémon</h1><p>Use seus baralhos para enfrentar a IA ou prepare-se para duelar online.</p></div></div>
    <div class="arena-tabs"><button class="arena-tab active" data-mode="cpu">⚔ Contra IA</button><button class="arena-tab" data-mode="online">◎ Online</button></div>
    <section id="arenaContent"></section>`;
  const content = $("#arenaContent", app);
  app.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click", () => {
    app.querySelectorAll("[data-mode]").forEach(item => item.classList.toggle("active", item === button));
    button.dataset.mode === "cpu" ? renderCpuSetup() : renderOnline();
  }));
  renderCpuSetup();

  function renderOnline() {
    const decks = storage.getDecks();
    content.innerHTML = `
      <div class="arena-panel"><span class="arena-pill">MULTIPLAYER</span><h2>Desafie outros treinadores</h2>
      <p>O modo online está preparado para receber salas, convites e partidas sincronizadas em tempo real.</p>
      <div class="arena-status"><strong>Integração online pendente</strong><span>Para publicar partidas reais, precisamos conectar o projeto Supabase com autenticação, banco de dados, políticas de segurança e Realtime.</span></div>
      <p>Seus baralhos atuais já poderão ser usados nessa modalidade. Você não precisa recriá-los.</p>
      <button class="btn btn-primary" id="onlineReady">Configurar multiplayer</button></div>`;
    $("#onlineReady", content).onclick = () => toast("Preciso conectar o projeto Supabase para habilitar salas online reais. Você já tem um projeto Supabase criado para a PokéVault?");
  }

  function renderCpuSetup() {
    const decks = storage.getDecks();
    content.innerHTML = `
      <div class="arena-panel"><span class="arena-pill">MODO SOLO</span><h2>Batalha contra a inteligência artificial</h2>
      <p>Escolha um dos seus baralhos. A partida usa os Pokémon e ataques cadastrados nas cartas do deck.</p>
      ${decks.length ? `
        <div class="arena-setup"><label class="form-group">Seu baralho<select class="field" id="arenaDeck">${decks.map(deck => `<option value="${esc(deck.id)}">${esc(deck.name)} · ${deck.cards.reduce((n,c)=>n+(Number(c.qty)||1),0)} cartas</option>`).join("")}</select></label>
        <label class="form-group">Dificuldade<select class="field" id="arenaDifficulty"><option value="normal">Treinador</option><option value="hard">Líder de ginásio</option></select></label></div>
        <button class="btn btn-primary" id="startBattle">Iniciar batalha →</button>
      ` : `<div class="empty-state">Você ainda não tem baralhos. Crie um em <a class="text-link" href="#baralhos">Meus baralhos</a> para entrar na Arena.</div>`}</div>
      <div class="arena-rules"><h3>Como funciona</h3><ul><li>Cada lado começa com três Pokémon.</li><li>Escolha um Pokémon ativo e use um dos ataques disponíveis na carta.</li><li>O dano é aplicado aos pontos de vida do oponente.</li><li>Vence quem nocautear os três Pokémon adversários.</li></ul><small>Modo de batalha simplificado, inspirado no TCG; não representa todas as regras oficiais, energias ou condições especiais.</small></div>`;
    $("#startBattle", content)?.addEventListener("click", startBattle);
  }

  async function startBattle() {
    const deck = storage.getDecks().find(item => item.id === $("#arenaDeck", content).value);
    if (!deck?.cards?.length) return toast("Adicione cartas ao baralho antes de jogar.");
    const selected = deck.cards.slice(0, 3);
    const difficulty = $("#arenaDifficulty", content).value;
    const start = $("#startBattle", content); start.disabled = true; start.textContent = "Preparando cartas…";
    try {
      const playerCards = await Promise.all(selected.map(async item => {
        const card = await getCardById(item.id);
        return makeFighter(card);
      }));
      if (!playerCards.length) throw new Error("Não foi possível carregar as cartas do baralho.");
      const opponentCards = await buildOpponent(playerCards, difficulty);
      const state = { player: playerCards, cpu: opponentCards, playerActive: 0, cpuActive: 0, turn: "player", over: false, log: ["A batalha começou! Seu turno."], difficulty };
      drawBattle(state);
    } catch (error) {
      toast(error.message || "Erro ao preparar a batalha.");
      start.disabled = false; start.textContent = "Iniciar batalha →";
    }
  }

  function makeFighter(card) {
    const hp = Math.max(30, parseInt(card.hp, 10) || 60);
    return { id: card.id, name: card.name, image: card.image, hp, maxHp: hp, attacks: (card.attacks || []).map(attack => ({ name: attack.name, damage: parseDamage(attack.damage), text: attack.text || "" })).slice(0,3) };
  }
  function parseDamage(value) {
    const match = String(value || "20").match(/\d+/);
    return Math.max(10, Math.min(250, Number(match?.[0] || 20)));
  }
  async function buildOpponent(playerCards, difficulty) {
    const pool = ["Pikachu","Charizard","Blastoise","Venusaur","Gengar","Dragonite","Lucario","Mewtwo","Gardevoir","Greninja","Arcanine","Machamp"];
    const chosen = pool.sort(() => Math.random() - .5).slice(0,3);
    return chosen.map((name, index) => {
      const hp = 70 + Math.floor(Math.random()*50);
      return { id: "cpu-"+index, name, image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/"+(Math.floor(Math.random()*150)+1)+".png", hp, maxHp: hp, attacks: [{ name: difficulty === "hard" ? "Golpe poderoso" : "Investida", damage: difficulty === "hard" ? 35 : 25 }] };
    });
  }
  function drawBattle(state) {
    const fighter = (card, active, side) => `
      <div class="fighter ${active ? "active" : ""}"><div class="fighter-image"><img src="${esc(card.image)}" alt="${esc(card.name)}"></div><div class="fighter-info"><strong>${esc(card.name)}</strong><span>${card.hp} / ${card.maxHp} HP</span><div class="hp-track"><i style="width:${Math.max(0,card.hp/card.maxHp*100)}%"></i></div>${card.hp<=0 ? '<em>Nocauteado</em>' : ""}</div></div>`;
    const p = state.player[state.playerActive], c = state.cpu[state.cpuActive];
    const playerAlive = state.player.filter(x=>x.hp>0).length, cpuAlive = state.cpu.filter(x=>x.hp>0).length;
    if (playerAlive === 0 || cpuAlive === 0) state.over = true;
    const status = state.over ? (cpuAlive === 0 ? "VITÓRIA! Você venceu a batalha!" : "FIM DE JOGO — a IA venceu.") : state.turn === "player" ? "Seu turno: escolha um ataque." : "Turno da IA…";
    content.innerHTML = `
      <div class="battle-top"><div><span class="arena-pill">BATALHA EM ANDAMENTO</span><h2>${esc(status)}</h2></div><button class="btn btn-secondary btn-small" id="leaveBattle">Sair da partida</button></div>
      <div class="battle-board"><section class="battle-side opponent"><h3>Treinador rival · IA</h3><div class="fighter-grid">${state.cpu.map((card,i)=>fighter(card,i===state.cpuActive)).join("")}</div></section>
      <div class="battle-center"><span>VS</span><small>Turno ${Math.floor((state.log.length+1)/2)}</small></div>
      <section class="battle-side"><h3>Seu time</h3><div class="fighter-grid">${state.player.map((card,i)=>fighter(card,i===state.playerActive)).join("")}</div></section></div>
      <div class="arena-panel"><h3>Pokémon ativo: ${esc(p?.name || "—")}</h3><p>Adversário: ${esc(c?.name || "—")}</p><div class="attack-list">${(p?.attacks || []).map((attack,i)=>`<button class="attack-button" data-attack="${i}" ${state.over || state.turn!=="player" || !p || p.hp<=0 ? "disabled":""}><strong>${esc(attack.name)}</strong><span>${attack.damage} de dano</span></button>`).join("") || "<p>Esta carta não possui ataques cadastrados. Passe a vez.</p>"}</div><button class="btn btn-secondary" id="passTurn" ${state.over || state.turn!=="player" ? "disabled":""}>Passar turno</button></div>
      <div class="arena-log"><h3>Histórico da partida</h3>${state.log.slice(-8).reverse().map(line=>`<p>${esc(line)}</p>`).join("")}</div>
      ${state.over ? '<button class="btn btn-primary" id="newBattle">Nova batalha</button>' : ""}`;
    $("#leaveBattle",content).onclick = renderCpuSetup;
    $("#newBattle",content)?.addEventListener("click",renderCpuSetup);
    $("#passTurn",content).onclick = () => runCpuTurn(state);
    content.querySelectorAll("[data-attack]").forEach(button => button.onclick = () => {
      const attack = p.attacks[Number(button.dataset.attack)];
      if (!attack || state.over || state.turn!=="player") return;
      c.hp = Math.max(0,c.hp-attack.damage);
      state.log.push(`${p.name} usou ${attack.name}: ${attack.damage} de dano em ${c.name}.`);
      if (c.hp<=0) { state.log.push(`${c.name} foi nocauteado!`); state.cpuActive = state.cpu.findIndex(x=>x.hp>0); }
      if (state.cpu.every(x=>x.hp<=0)) { drawBattle(state); return; }
      runCpuTurn(state);
    });
  }
  async function runCpuTurn(state) {
    if (state.over) return;
    state.turn = "cpu"; drawBattle(state); await sleep(650);
    const target = state.player[state.playerActive];
    const attacker = state.cpu[state.cpuActive];
    if (!attacker || !target) return;
    const attack = attacker.attacks[0];
    const damage = Math.max(10, attack.damage + (state.difficulty==="hard" ? 10 : 0));
    target.hp = Math.max(0,target.hp-damage);
    state.log.push(`IA: ${attacker.name} usou ${attack.name} e causou ${damage} de dano.`);
    if (target.hp<=0) {
      state.log.push(`${target.name} foi nocauteado!`);
      state.playerActive = state.player.findIndex(x=>x.hp>0);
    }
    state.turn = "player";
    drawBattle(state);
  }
}
