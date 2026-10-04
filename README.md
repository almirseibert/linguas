# Passaporte de Idiomas

App da família para aprender **inglês** e **espanhol da Espanha**, com cerca de 35 minutos por dia, e acompanhar o progresso de todos.
A especificação original está em [passaporte-ingles-especificacao.md](passaporte-ingles-especificacao.md).

## Como o app acelera o aprendizado

A tela “Hoje” monta a sessão diária com 4 blocos:

| Bloco | Técnica | Peça usada |
|---|---|---|
| Revisão (~8 min) | Repetição espaçada de **frases** com áudio nativo | [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) (MIT), o algoritmo FSRS |
| Leitura (~10 min) | Input compreensível: texto gerado com ~95% de palavras conhecidas | Listas de frequência + IA |
| Shadowing (~5 min) | Ouvir um nativo, repetir e comparar com o que o microfone entendeu | Áudio do [Tatoeba](https://tatoeba.org) + Web Speech API |
| Conversa (~10 min) | Produção oral com correção por *recast* | Claude ou Gemini |

O ciclo se fecha sozinho:

- **Frases novas todo dia:** entram até 8 frases nativas por dia na revisão (`NEW_CARDS_PER_DAY`). Cada uma tem **exatamente uma palavra desconhecida** (método i+1), e as palavras mais frequentes vêm primeiro.
- **Erros e palavras viram cartões:** os erros da conversa e as palavras tocadas na leitura entram na revisão.
- **Duas direções de treino:** as frases nativas são treinadas para *entender* (ouvir → significado). As frases de fala são treinadas para *produzir* (português → idioma).
- **Check-in automático:** revisar ou concluir um bloco marca o check-in do dia.
- **Avanço de fase:** a fase avança sozinha quando a pessoa acumula dias completos de prática e vocabulário suficiente.

### Espanhol

O espanhol é sempre o da Espanha (castelhano):

- **IA:** usa *vosotros* e vocabulário peninsular (*ordenador*, *móvil*, *vale*).
- **Voz sintética:** `es-ES`.
- **Áudios nativos:** entram só gravações de quem declara no perfil do Tatoeba ser da Espanha.

Cada membro pode estudar os dois idiomas, cada um com sua fase e seu vocabulário. A troca é pelo seletor EN/ES no topo.

### IA: Claude ou Gemini

- **Padrão da família:** escolhido em *Ajustes*.
- **Por pessoa:** cada membro pode usar outro provedor.
- **Sem chave:** se o provedor escolhido não tiver chave no servidor, o app usa o outro automaticamente.
- **Modelos:** configuráveis no `.env`. O padrão é `claude-opus-5` / `claude-haiku-4-5` e `gemini-2.5-flash`.
- **Custo:** há um limite diário de chamadas por pessoa (`AI_DAILY_LIMIT`).

### Lembrete diário

Cada pessoa ativa o lembrete em *Ajustes* em cada aparelho e escolhe o horário.

- **Quando chega:** só se a pessoa ainda não praticou no dia, no fuso `APP_TZ`.
- **O que diz:** a sequência em jogo, quem da família já praticou e quantos cartões esperam revisão.
- **Chaves de envio (VAPID):** são geradas e guardadas no banco automaticamente se não estiverem no `.env`.
- **iPhone/iPad:** é preciso instalar o app na Tela de Início (Compartilhar → Adicionar à Tela de Início), iOS 16.4 ou mais novo.
- **Identificação:** defina `VAPID_SUBJECT` com um e-mail seu (`mailto:`), que o Safari exige.

## Rodar localmente (sem Docker)

```bash
npm install
cp .env.example .env        # preencha ANTHROPIC_API_KEY e/ou GEMINI_API_KEY
npm run migrate
npm run seed                # fases, frases, textos e recursos (EN + ES)
npm run import:words        # 5.000 palavras mais frequentes por idioma
npm run import:sentences    # ~1.500 frases nativas com áudio por idioma (Tatoeba, alguns minutos)
npm run dev:api             # http://localhost:3001
npm run dev:web             # http://localhost:5173
```

No desenvolvimento local o banco é SQLite (`DB_CLIENT=sqlite`). Em produção é MySQL. Para gerar os ícones de novo depois de mudar o desenho, use `npm run icons`.

## Produção (EasyPanel / Docker)

```bash
docker compose up --build
```

O container aplica as migrações e sobe tudo na porta 3001: a API e o PWA. Os áudios nativos ficam em cache no volume `/data`. Na primeira vez, carregue o conteúdo dentro do container:

```bash
docker compose exec app npm run seed -w apps/api
```

```bash
docker compose exec app npm run import:words -w apps/api
```

```bash
docker compose exec app npm run import:sentences -w apps/api
```

Notificações exigem HTTPS, que o EasyPanel já fornece.

## Estrutura

```
apps/api         Express + Knex (SQLite/MySQL) + IA (Claude/Gemini) + FSRS + Web Push
apps/web         React + Vite + Tailwind + PWA (service worker com push e cache de áudio)
packages/shared  idiomas, tokenização, cobertura lexical, sequência de dias (com testes)
```

## Créditos e licenças

Os detalhes estão em [ATTRIBUTION.md](ATTRIBUTION.md). Em resumo:

- **Frases nativas e gravações:** [Tatoeba](https://tatoeba.org). Os textos são CC BY 2.0 FR. Cada áudio mostra no app o autor e a licença. A maioria é CC BY-NC-ND (**uso não comercial**).
- **Listas de frequência:** [FrequencyWords](https://github.com/hermitdave/FrequencyWords), de Hermit Dave, a partir do OpenSubtitles 2018 (CC BY-SA 4.0).
- **Repetição espaçada:** [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) (MIT).
- **Frases e textos de base:** escritos originalmente para este projeto.
