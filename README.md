# PokéVault — Pokémon TCG Platform

Aplicação frontend responsiva em HTML5, CSS3 e JavaScript puro (ES Modules).

## Executar localmente
1. Extraia a pasta do projeto.
2. Abra a pasta no VS Code.
3. Inicie um servidor estático (ex.: extensão Live Server).
4. Acesse o endereço local exibido pelo servidor.

> Não abra `index.html` diretamente por `file://`, pois os módulos ES podem ser bloqueados pelo navegador.

## Funcionalidades desta versão
- Dashboard com atalhos e indicadores da coleção local.
- Pokédex conectada à PokéAPI, com busca por nome/número e filtro por tipo.
- Catálogo de cartas Pokémon TCG com busca e filtros por tipo/raridade.
- Detalhes de Pokémon e cartas.
- Consulta de preços apenas quando a fonte retorna dados.
- Coleção pessoal com quantidade, favoritos e remoção.
- Marketplace demonstrativo com criação, busca, ordenação e exclusão de anúncios.
- Tema claro/escuro persistido no LocalStorage.
- Layout responsivo para desktop e dispositivos móveis.

## APIs
- PokéAPI: https://pokeapi.co/
- Pokémon TCG API: https://pokemontcg.io/

O projeto não inclui chave privada. Se a API de cartas passar a exigir chave ou limitar requisições, configure um proxy/backend; nunca coloque segredos no JavaScript do navegador.

## Persistência e segurança
LocalStorage é usado apenas para preferências, coleção e anúncios de demonstração no dispositivo atual. Não armazene senhas ou dados sensíveis nele.

Login seguro, papéis administrativos, fórum multiusuário, sincronização, upload privado e pagamentos exigem backend. Para a próxima etapa, recomenda-se Supabase Auth + PostgreSQL + Storage + Row Level Security. Valide permissões no servidor, não apenas ocultando botões no frontend.

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

## Observações
PokéVault é um projeto independente e não é afiliado à Nintendo, Creatures ou The Pokémon Company. Pokémon e suas marcas pertencem aos respectivos titulares.