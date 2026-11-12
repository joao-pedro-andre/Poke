# PokéVault — Pokémon TCG

Aplicação web responsiva em HTML5, CSS3 e JavaScript puro (ES Modules), com identidade visual inspirada em consoles portáteis clássicos.

## Funcionalidades disponíveis nesta versão
- Dashboard com indicadores e atalhos.
- Pokédex conectada à PokéAPI, com paginação, busca e filtro por tipo.
- Catálogo Pokémon TCG com busca, filtros e paginação.
- Visualização detalhada de Pokémon e cartas.
- Coleção local com quantidades, favoritos, pesquisa, exportação e importação de backup JSON.
- Construtor simples de baralhos, com inclusão e remoção de cartas.
- Arena Pokémon com batalhas simplificadas contra IA usando cartas dos baralhos.
- Interface da modalidade online preparada; partidas multiplayer reais aguardam Supabase Auth, PostgreSQL e Realtime.
- Perfil local do treinador.
- Marketplace demonstrativo com criação, pesquisa, ordenação e exclusão de anúncios.
- Tema claro/escuro e layout responsivo.

## Executar localmente
1. Abra a pasta do projeto no VS Code.
2. Inicie um servidor estático (por exemplo, Live Server).
3. Acesse o endereço local exibido pelo servidor.

Não abra `index.html` diretamente por `file://`, pois os módulos ES podem ser bloqueados pelo navegador.

## APIs
- PokéAPI: https://pokeapi.co/
- Pokémon TCG API: https://pokemontcg.io/

A disponibilidade e os limites de requisição dependem dos serviços externos. Não coloque chaves privadas no JavaScript do navegador.

## Arena Pokémon
O modo contra IA é jogável localmente com até três Pokémon selecionados do baralho, ataques e dano baseados nos dados das cartas, HP e condição de vitória. É uma adaptação simplificada, não uma implementação integral das regras oficiais do Pokémon TCG.

A aba Online apresenta a entrada para o multiplayer, mas ainda não cria salas nem sincroniza partidas. Para ativar partidas reais, é necessário conectar um projeto Supabase e configurar autenticação, tabelas, políticas RLS e Realtime.

## Limitações importantes
Esta versão é funcional como aplicação frontend individual, mas ainda não é uma plataforma multiusuário. Perfil, coleção, baralhos e anúncios são armazenados no navegador atual.

Os seguintes recursos ainda exigem backend e configuração de serviços:
- Cadastro, login e recuperação de senha seguros.
- Perfis e coleções sincronizados entre dispositivos.
- Marketplace público, chat entre usuários, avaliações e denúncias.
- Pagamentos, pedidos e histórico de transações.
- Torneios/eventos com inscrições e resultados oficiais.
- Painel administrativo, moderação e permissões por função.

Para isso, recomenda-se integrar Supabase Auth, PostgreSQL, Storage e Row Level Security, com políticas e validações no servidor. Nenhum pagamento ou autenticação real é simulado nesta versão.

## Estrutura
```text
pokevault/
├── index.html
├── README.md
├── css/
│   ├── style.css
│   └── responsive.css
└── js/
    ├── api.js
    ├── main.js
    └── storage.js
```

PokéVault é um projeto independente e não é afiliado à Nintendo, Creatures ou The Pokémon Company. Pokémon e suas marcas pertencem aos respectivos titulares.
