# Passaporte de Inglês — Especificação do Projeto

> Documento de referência para transformar o protótipo (artifact interativo) em um aplicativo online completo. Escrito a partir do que já foi validado com a família e do que já existe funcionando no protótipo.

---

## 1. Visão geral

O Passaporte de Inglês é um app para uma família aprender inglês (falar e entender) no dia a dia, combinando prática individual curta com um momento semanal em conjunto. A mecânica central é um "passaporte" onde cada pessoa registra o que praticou, e a família toda acompanha o progresso de todos no mesmo lugar.

**Protótipo atual:** artifact HTML interativo, com banco de dados compartilhado (`db` capability), usado e validado pela família como prova de conceito. Este documento descreve o que existe hoje e o que falta para virar um app de verdade (com contas, notificações, e independência da plataforma do artifact).

## 2. Problema e objetivo

- Nível atual: básico, com dificuldade para ler frases completas.
- Objetivo: fluência geral no dia a dia (entender e falar), não inglês técnico ou para prova.
- Restrição: 30-45 min/dia somados entre prática individual e em família.
- Motivação adicional: aprender junto, com visibilidade do progresso de todos — não é um app para uma pessoa só.

## 3. Público-alvo

- Uso primário: a própria família do usuário (4 pessoas, adultos/quase-adultos), nível básico.
- Uso potencial secundário (a avaliar depois do MVP pessoal): outras famílias em situação parecida — clientes da Studio Mythos ou público geral, se o projeto evoluir para produto.

## 4. Funcionalidades já validadas no protótipo (MVP conceitual)

| Área | O que existe hoje |
|---|---|
| Plano | 3 fases (Fundação, Expansão, Consolidação), com objetivo e duração de cada uma |
| Rotina diária | 3 blocos de prática individual (~25 min): input fácil, leitura guiada, shadowing |
| Encontro semanal | Formato de "noite de inglês" em família (~45 min): episódio com legenda + conversa depois |
| Material de estudo embutido | Por fase: lista de vocabulário de alta frequência, frases prontas, textos para leitura/shadowing (com botão de copiar) |
| Recursos externos | Lista de ferramentas gratuitas/baratas, com link direto (podcasts, leitura graduada, extensão de legenda, apps de conversa) |
| Identificação | Sem senha — a pessoa digita o nome na primeira visita (guardado localmente no navegador) |
| Check-in diário | 3 marcações por dia: ouviu/leu, praticou fala, participou do encontro em família |
| Progresso da família | Por pessoa: selo por dia dos últimos 7 dias + sequência de dias seguidos ativa |
| Mural da família | Feed compartilhado para postar o que assistiram / frases novas aprendidas |
| Estatísticas gerais | Check-ins da semana, maior sequência ativa, nº de pessoas participando |

## 5. Lacunas para virar um app de verdade

O protótipo roda dentro do ambiente de artifacts do Claude — funcional para uso real, mas com limitações que um app dedicado resolveria:

- **Identificação por nome livre, sem conta real** — hoje qualquer um pode digitar "Almir" duas vezes com grafias diferentes e virar duas pessoas. Precisa de conta/perfil por membro da família.
- **Sem notificação/lembrete diário** — depende de alguém lembrar de abrir a página.
- **Sem app mobile instalável** — hoje é uma página web.
- **Sem histórico de longo prazo estruturado** — o banco do artifact tem um teto de 5.000 documentos no total; um app real precisa de um banco próprio, sem esse limite.
- **Progressão manual** — a fase não muda automaticamente com base no que a pessoa já praticou.
- **Conteúdo fixo** — vocabulário, frases e textos são os mesmos para todos; não há geração de material novo por tema ou nível.

## 6. Funcionalidades futuras (roadmap sugerido)

**Fase 1 — Migração para app próprio**
- Login simples por família (ex.: um código/link de convite por família, cada membro com seu perfil)
- Banco de dados próprio (sem limite de documentos do artifact)
- Notificação diária (push ou WhatsApp, já que a Studio Mythos tem integração própria com Meta Cloud API)
- PWA instalável no celular

**Fase 2 — Aprendizado adaptativo**
- Progressão de fase baseada em uso real (ex.: sugerir avançar de fase após X dias consistentes)
- Mais conteúdo por fase (banco maior de vocabulário, textos e frases, filtrável por tema)
- Histórico visual de progresso (gráfico de semanas, não só streak)

**Fase 3 — Produto (opcional, a avaliar)**
- Multi-família (cada família com seu próprio espaço, isolado)
- Painel do "responsável" para acompanhar todos os membros
- Geração de conteúdo assistida por IA (textos/frases sob medida por interesse de cada família)

## 7. Modelo de dados

### 7.1 Como está hoje (banco do artifact)

```
checkins/{memberSlug}_{date}
  member: string
  date: string (YYYY-MM-DD)
  input: boolean
  speak: boolean
  family: boolean
  ts: number (epoch ms)

family_log/{autoId}
  member: string
  note: string
  date: string (YYYY-MM-DD)
  ts: number (epoch ms)
```

### 7.2 Proposta para o app próprio (relacional, MySQL — mesma base já usada no monorepo da Studio Mythos)

```sql
families (id, name, invite_code, created_at)

members (id, family_id FK, name, avatar_color, created_at)

checkins (
  id, member_id FK, date, 
  did_input BOOLEAN, did_speak BOOLEAN, did_family BOOLEAN,
  created_at
)
UNIQUE(member_id, date)

family_log (id, family_id FK, member_id FK, note, date, created_at)

phases (id, "order", name, description, week_start, week_end)

content_items (
  id, phase_id FK, type ENUM('vocab','phrase','text'),
  category, content_en, content_pt, created_at
)

resources (id, category, name, url, description, "order")
```

Essa estrutura já resolve as lacunas de identidade (membro pertence a uma família, sem ambiguidade de nome) e abre espaço para conteúdo dinâmico (tabela `content_items` em vez de HTML fixo).

## 8. Estrutura pedagógica (conteúdo já escrito, pronto para virar seed data)

| Fase | Semanas | Foco | Conteúdo já existente |
|---|---|---|---|
| 1 — Fundação | 1-4 | Entender mais do que falar | 50 palavras de alta frequência (5 categorias), 9 frases de sobrevivência, 1 texto de shadowing |
| 2 — Expansão | 5-12 | Começar a produzir | 1 texto de leitura guiada (3 parágrafos), 9 frases para o jantar, roteiro de áudio ("conte seu dia") |
| 3 — Consolidação | 13+ | Conversa real | 8 perguntas para parceiro de conversa, 1 texto em ritmo natural (3 parágrafos) |

Base científica documentada no protótipo: hipótese do input compreensível (Krashen) para a Fase 1, hipótese do output (Swain) para justificar a produção forçada a partir da Fase 2, shadowing como reforço de pronúncia do início ao fim.

Todo esse conteúdo já está escrito em inglês simples, original (não copiado de terceiros) — pode ser exportado do HTML do protótipo direto para as tabelas `content_items` acima.

## 9. Identidade visual

**Protótipo atual — identidade própria "Passaporte"** (não usa o Voltage Obsidian, porque é um projeto pessoal/família, não um entregável de cliente):

- Fundo: `#F3F5EC` (claro) / `#121A15` (escuro)
- Superfície: `#FFFFFF` / `#1B241C`
- Tinta (texto): `#1C2B20` / `#E8EDE2`
- Acento primário (verde-folha): `#2F6F4E` / `#59A97E`
- Acento secundário (ocre): `#C97C1D` / `#E3A544`
- Tipografia: Bricolage Grotesque (títulos), Karla (texto), IBM Plex Mono (números e dados)
- Metáfora visual: passaporte/carimbo — selos diários em formato de quadrado por dia da semana

**Alternativa a decidir:** se este projeto virar um produto da Studio Mythos (não só uso familiar), faz sentido reaproveitar o **Voltage Obsidian** (fundo `#0A0E1A`, acento voltage `#22D3EE`, navy `#011F41`, fontes Inter/Fraunces/JetBrains Mono) para ficar consistente com o resto do portfólio. Decisão fica para quando (e se) o escopo mudar de "app da família" para "produto".

## 10. Stack técnica sugerida

Reaproveitando o que a Studio Mythos já usa no monorepo (`almirseibert/studiomythos`), para não introduzir uma stack nova:

- **Frontend:** React 18 + Vite + Tailwind
- **Backend:** Node/Express + MySQL
- **Deploy:** EasyPanel via Docker (mesma infraestrutura já em uso)
- **Notificações:** reaproveitar a integração já existente com Meta Cloud API (WhatsApp) para lembrete diário, como alternativa/complemento a push notification
- **Autenticação:** simples — código de convite por família é suficiente para o escopo atual; não precisa de OAuth completo a menos que vire produto multi-cliente

Esse app pode nascer como um módulo novo dentro do monorepo existente, ou como um repositório separado que reaproveita os mesmos padrões — a decidir conforme o tempo disponível.

## 11. Próximos passos sugeridos

1. Validar por mais algumas semanas o uso do protótipo atual (artifact) com a família — confirmar que a mecânica (fases, check-in, mural) realmente engaja antes de investir em app próprio.
2. Definir se o projeto fica pessoal ou vira produto (isso muda decisões de identidade visual e arquitetura multi-família).
3. Migrar o conteúdo pedagógico (seção 8) para o modelo de dados relacional (seção 7.2).
4. Implementar autenticação simples por família.
5. Portar a interface do protótipo para React/Tailwind, mantendo a mecânica validada.
