import { getCardById, getCards } from "./api.js";

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
      <div class="arena-rules"><h3>Como funciona</h3><ul><li>Cada lado usa até três Pokémon.</li><li>Escolha o Pokémon ativo, ataque ou troque para outro Pokémon disponível.</li><li>O dano é aplicado aos pontos de vida do oponente.</li><li>Vence quem nocautear os três Pokémon adversários.</li></ul><small>Modo de batalha simplificado, inspirado no TCG; não representa todas as regras oficiais, energias ou condições especiais.</small></div>`;
    $("#startBattle", content)?.addEventListener("click", startBattle);
  }

  async function startBattle() {
    const deck = storage.getDecks().find(item => item.id === $("#arenaDeck", content).value);
    if (!deck?.cards?.length) return toast("Adicione cartas ao baralho antes de jogar.");
    const selected = deck.cards.filter(item => Number(item.qty)>0 && (!item.supertype || item.supertype==="Pokémon")).slice(0,30);
    const difficulty = $("#arenaDifficulty", content).value;
    const start = $("#startBattle", content); start.disabled = true; start.textContent = "Preparando seu time…";
    try {
      const playerCards = [];
      let failed = 0;
      for(let index=0;index<selected.length && playerCards.length<3;index+=4) {
        const batch=await Promise.allSettled(selected.slice(index,index+4).map(async item => {
          const details=item.hp && item.image ? item : await getCardById(item.id);
          return makeFighter(details);
        }));
        for(const result of batch) {
          if(result.status==="fulfilled" && result.value) playerCards.push(result.value);
          else failed++;
        }
      }
      if(!playerCards.length) throw new Error("Não encontrei Pokémon válidos nesse baralho. Adicione cartas de Pokémon com HP e imagem.");
      if(failed) toast(`${failed} carta(s) foram ignoradas porque não possuem dados suficientes ou falharam na API.`);
      const opponentCards=await buildOpponent(playerCards,difficulty);
      const state={player:playerCards.slice(0,3),cpu:opponentCards,playerActive:0,cpuActive:0,turn:"player",over:false,log:["A batalha começou! Escolha um ataque ou troque seu Pokémon ativo."],difficulty,turnNumber:1};
      drawBattle(state);
    } catch(error) {
      toast(error.message || "Erro ao preparar a batalha.");
      start.disabled=false; start.textContent="Iniciar batalha →";
    }
  }

  function makeFighter(card) {
    const hp=Number.parseInt(card?.hp,10);
    if(!card?.id || !card?.name || !Number.isFinite(hp) || hp<=0 || !card.image) return null;
    const attacks=(card.attacks||[]).map(attack=>({name:attack.name||"Ataque",damage:parseDamage(attack.damage),text:attack.text||"",cost:Array.isArray(attack.cost)?attack.cost:[]})).slice(0,4);
    if(!attacks.length) attacks.push({name:"Investida",damage:20,text:"Ataque básico",cost:[]});
    return {id:card.id,name:card.name,image:card.image,hp,maxHp:hp,attacks,types:card.types||[],weaknesses:card.weaknesses||[],resistances:card.resistances||[]};
  }
  function parseDamage(value) {
    const match=String(value||"20").replace(/,/g,"").match(/\d+/);
    return Math.max(10,Math.min(250,Number(match?.[0]||20)));
  }
  function calculateDamage(attacker, defender, baseDamage) {
    const type=attacker.types?.[0];
    if(!type) return baseDamage;
    const weakness=(defender.weaknesses||[]).find(item=>item.type===type);
    if(weakness) {
      const value=String(weakness.value||"");
      if(/×2|x2/i.test(value)) return baseDamage*2;
      return baseDamage+parseDamage(value);
    }
    const resistance=(defender.resistances||[]).find(item=>item.type===type);
    if(resistance) return Math.max(10,baseDamage-parseDamage(resistance.value));
    return baseDamage;
  }
  async function buildOpponent(playerCards,difficulty) {
    try {
      const result=await getCards({page:1,pageSize:100});
      const available=(result.results||[]).filter(card=>card.hp&&card.image&&card.attacks?.length&&!playerCards.some(own=>own.id===card.id));
      for(let i=available.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [available[i],available[j]]=[available[j],available[i]]; }
      const realCards=available.map(makeFighter).filter(Boolean).slice(0,3);
      if(realCards.length) return realCards;
    } catch(error) { console.warn("Arena: usando adversários locais porque a API não respondeu.",error); }
    return [
      {id:"cpu-pikachu",name:"Pikachu",hp:60,maxHp:60,image:"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",attacks:[{name:"Choque elétrico",damage:25,text:"",cost:[]}]},
      {id:"cpu-charizard",name:"Charizard",hp:120,maxHp:120,image:"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png",attacks:[{name:"Chama",damage:40,text:"",cost:[]}]},
      {id:"cpu-blastoise",name:"Blastoise",hp:110,maxHp:110,image:"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png",attacks:[{name:"Jato d'água",damage:35,text:"",cost:[]}]}
    ];
  }
  function drawBattle(state) {
    const fighter=(card,active)=>`
      <div class="fighter ${active?"active":""}"><div class="fighter-image"><img loading="lazy" src="${esc(card.image)}" alt="${esc(card.name)}"></div><div class="fighter-info"><strong>${esc(card.name)}</strong><span>${card.hp} / ${card.maxHp} HP</span><div class="hp-track"><i style="width:${Math.max(0,card.hp/card.maxHp*100)}%"></i></div>${card.hp<=0?'<em>Nocauteado</em>':""}</div></div>`;
    const p=state.player[state.playerActive], c=state.cpu[state.cpuActive];
    const playerAlive=state.player.filter(x=>x.hp>0).length, cpuAlive=state.cpu.filter(x=>x.hp>0).length;
    if(playerAlive===0||cpuAlive===0) state.over=true;
    const status=state.over?(cpuAlive===0?"VITÓRIA! Você venceu a batalha!":"FIM DE JOGO — a IA venceu."):state.turn==="player"?"Seu turno: escolha uma ação.":"Turno da IA…";
    content.innerHTML=`
      <div class="battle-top"><div><span class="arena-pill">BATALHA EM ANDAMENTO</span><h2>${esc(status)}</h2></div><button class="btn btn-secondary btn-small" id="leaveBattle">Sair da partida</button></div>
      <div class="battle-board"><section class="battle-side opponent"><h3>Treinador rival · IA</h3><div class="fighter-grid">${state.cpu.map((card,i)=>fighter(card,i===state.cpuActive)).join("")}</div></section>
      <div class="battle-center"><span>VS</span><small>Turno ${state.turnNumber||1}</small></div>
      <section class="battle-side"><h3>Seu time</h3><div class="fighter-grid">${state.player.map((card,i)=>fighter(card,i===state.playerActive)).join("")}</div></section></div>
      <div class="arena-panel"><h3>Pokémon ativo: ${esc(p?.name||"—")}</h3><p>Adversário: ${esc(c?.name||"—")}</p>
      <div class="attack-list">${(p?.attacks||[]).map((attack,i)=>`<button class="attack-button" data-attack="${i}" ${state.over||state.turn!=="player"||!p||p.hp<=0||!c?"disabled":""}><strong>${esc(attack.name)}</strong><span>${attack.damage} de dano</span>${attack.cost.length?`<small>${esc(attack.cost.join(" · "))}</small>`:""}${attack.text?`<small>${esc(attack.text)}</small>`:""}</button>`).join("")||"<p>Sem ataques disponíveis. Troque o Pokémon ativo.</p>"}</div>
      <div class="deck-actions"><button class="btn btn-secondary" id="passTurn" ${state.over||state.turn!=="player"?"disabled":""}>Passar turno</button>${state.player.map((card,i)=>i!==state.playerActive&&card.hp>0?`<button class="btn btn-soft btn-small" data-switch="${i}" ${state.over||state.turn!=="player"?"disabled":""}>Trocar para ${esc(card.name)}</button>`:"").join("")}</div></div>
      <div class="arena-log"><h3>Histórico da partida</h3>${state.log.slice(-10).reverse().map(line=>`<p>${esc(line)}</p>`).join("")}</div>
      ${state.over?'<button class="btn btn-primary" id="newBattle">Nova batalha</button>':""}`;
    $("#leaveBattle",content).onclick=renderCpuSetup;
    $("#newBattle",content)?.addEventListener("click",renderCpuSetup);
    $("#passTurn",content).onclick=()=>runCpuTurn(state);
    content.querySelectorAll("[data-switch]").forEach(button=>button.onclick=()=>{
      if(state.turn!=="player"||state.over)return;
      state.playerActive=Number(button.dataset.switch);
      state.log.push(`Você trocou para ${state.player[state.playerActive].name}.`);
      runCpuTurn(state);
    });
    content.querySelectorAll("[data-attack]").forEach(button=>button.onclick=()=>{
      const attack=p?.attacks[Number(button.dataset.attack)];
      if(!attack||!c||state.over||state.turn!=="player")return;
      const damage=calculateDamage(p,c,attack.damage);
      c.hp=Math.max(0,c.hp-damage);
      state.log.push(`${p.name} usou ${attack.name}: ${damage} de dano em ${c.name}.`);
      if(c.hp<=0){state.log.push(`${c.name} foi nocauteado!`);state.cpuActive=state.cpu.findIndex(x=>x.hp>0);}
      if(state.cpu.every(x=>x.hp<=0)){drawBattle(state);return;}
      runCpuTurn(state);
    });
  }
  async function runCpuTurn(state) {
    if(state.over||state.turn==="cpu")return;
    state.turn="cpu";drawBattle(state);await sleep(450);
    const target=state.player[state.playerActive], attacker=state.cpu[state.cpuActive];
    if(!attacker||!target){state.turn="player";drawBattle(state);return;}
    const attack=attacker.attacks.reduce((best,current)=>current.damage>best.damage?current:best,attacker.attacks[0]);
    const baseDamage=Math.max(10,attack.damage+(state.difficulty==="hard"?10:0));
    const damage=calculateDamage(attacker,target,baseDamage);
    target.hp=Math.max(0,target.hp-damage);
    state.log.push(`IA: ${attacker.name} usou ${attack.name} e causou ${damage} de dano.`);
    if(target.hp<=0){
      state.log.push(`${target.name} foi nocauteado!`);
      const next=state.player.findIndex(x=>x.hp>0);
      if(next>=0){state.playerActive=next;state.log.push(`${state.player[next].name} entrou em campo.`);}
    }
    if(state.cpu.every(x=>x.hp<=0)||state.player.every(x=>x.hp<=0))state.over=true;
    state.turnNumber=(state.turnNumber||1)+1;
    state.turn="player";drawBattle(state);
  }
}
