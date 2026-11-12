# Dashboard do coach (/admin): diagnóstico e proposta enxuta + ações rápidas

**Data:** 12/11/2026 · **Quem:** EZ Design · **Base:** `main` 44563a3 · **Guia:** `docs/design/design-system.md` · **Linguagem:** cards do feed e da tela "Você" (`docs/design/profile`)
**Mockup:** [`dashboard-mockup.html`](dashboard-mockup.html) · **Prévias:** [`img/`](img/)

**Perguntas que a tela responde (princípio do EZ Lead), em ordem:**
1. **Quem precisa de mim?** O bloco principal, com as ações.
2. **O que acontece hoje?** Os treinos agrupados, com amanhã numa linha.
3. **Como vai a semana?** Um número e a barra dos dias.

**Meta:** cabe numa tela em 1440 × 900; no celular, ~1,4 tela com 4 pendências e 2 avisos.

**Ajuste de 12/11 (pedido do usuário: "mais algumas infos de ação rápida para o coach"):** os 3 blocos ficam; entram **ações, nenhum número a mais**. Nada novo no Firestore. Cada ação está marcada como **reaproveita** (o fluxo já existe e só ganha um atalho) ou **novo** (código novo de UI, sem dado novo).

Testado no emulador como `coach@ez.test`, em 1440 px e 390 px, tema escuro. Dados do mockup: fictícios, do seed.

## 1. Diagnóstico

| Desktop | Celular |
|---|---|
| ![](img/atual-desktop-escuro.png) | ![](img/atual-mobile-escuro.png) |

### Principais problemas
1. **"Precisa de atenção" está escondido.**
   - No desktop, fica na coluna lateral.
   - No celular, só aparece depois de ~1.200 px.
   - Não tem ação: para responder a uma nota, o coach precisa achar o atleta no chat.
2. **Os números de cima são inventário** ("6 Atletas · 1 Time · 5 Treinos") e quase não mudam. Cada um tem uma cor própria, fora da paleta.
3. **Repetição:**
   - "Amanhã" e "Atividade de hoje" listam o mesmo treino uma vez por atleta;
   - a faixa de datas repete o Calendário;
   - "Destaques da semana" repete a tabela;
   - "Conclusão geral" e "Tendência" contam a mesma história.
4. **A tabela de atletas é pesada e corta nomes** ("Carl…"). Ela também já existe em Usuários.
5. **O gráfico de tendência fica ilegível** (auditoria C7).

## 2. Proposta enxuta

![Desktop 1440 escuro, uma tela, com ações rápidas](img/proposta-1-desktop.png)
![Celular claro: chips de ação e resposta no card; folha de resultados e lembrete](img/proposta-2-mobile.png)

**Ordem:** cabeçalho (data, saudação, **ações rápidas**) → **semana numa linha** → **precisa de atenção** (desktop: coluna principal) → **hoje** (+ linha de amanhã) → avisos, só quando existem.

### 2.0 Ações rápidas (faixa abaixo da saudação)
- **Desktop:** na linha da saudação, à direita; "Atribuir treino" continua o botão principal (amarelo, por último) e as outras 4 são botões de contorno.
- **Celular:** chips roláveis no topo, com "Atribuir" primeiro. **O botão flutuante sai** (repetiria "Atribuir").

| Ação | O que faz | Status | Onde já existe |
|---|---|---|---|
| Atribuir treino | Abre o modal de atribuição | reaproveita | `assignDialogOpen` em `Dashboard.tsx` |
| Novo treino | Menu com a modalidade → editor | reaproveita | `/admin/workouts/new?type=running\|cycling\|swimming`, `/admin/workouts/strength/new` |
| Aviso no feed | Abre o composer do feed | reaproveita | `useTimelineActions().setCreateOpen(true)` + `CreatePostModal` (no `AdminLayout`). É um post normal: **não existe tipo "aviso" nem fixar no topo** (isso exigiria dado novo; fica de fora). |
| Mensagem ao time | Abre o chat do grupo do time | reaproveita | `ChatService.createOrGetGroupChat(team…)` + `/admin/chat` com `state.openChatId` |
| Convidar atleta | Copia o link de convite; toast "Link de convite do time copiado" | reaproveita | `team.inviteToken` → `/join/:inviteToken`; a cópia já existe em `TeamDetail.tsx:109-114` |

- Com **mais de um time**, "Mensagem ao time" e "Convidar atleta" abrem um menu para escolher o time; com um time só, a ação é direta.

### 2.1 Semana numa linha
- **Um número só:** "8 de 14 · 57%", com os treinos feitos sobre os previstos **da semana atual** (seg–dom), sem os antigos.
- **Barra por dia:** 7 colunas com a altura igual à % feita; hoje tem contorno e os dias futuros ficam tracejados.
- **Tocar num dia abre o Calendário do coach nesse dia** (dica no hover: "Abrir qua, 11 nov no Calendário"). **Novo (pequeno):** `/admin/calendar` hoje não lê data da URL; precisa aceitar `?date=AAAA-MM-DD` e chamar `setSelectedDate`/`setCurrentMonth`, que já existem.
- **Dados:** vêm das atribuições já carregadas (`completedAt`, `scheduledDate`). **Nada novo.**

### 2.2 Precisa de atenção (bloco principal)
- Desktop: a coluna da esquerda, a mais larga, com borda `destructive/35`. Celular: logo abaixo da semana.
- Cada atleta tem avatar, nome e **chips com os motivos que o código já calcula** (`attention`, `Dashboard.tsx:176-212`):

| Motivo | Chip | Ações |
|---|---|---|
| `overdue` | "N atrasado(s)", `destructive-ink` | Responder · Ver treino |
| `skipped` | "N não feito(s)", `destructive-ink` | Responder · Ver treino |
| `highEffort` | "esforço 9/10", `--sport-strength` | Responder · Ver treino |
| `note` | "nota" + citação em itálico (1 linha) | Responder · Ver treino |
| `noPlan` | "sem treino nos próximos 7 dias", `warning-ink` | Atribuir |

- **Ações:**
  - **Responder** (**novo**) abre uma **resposta rápida no próprio card**: campo de 1 linha + enviar. Envia no chat do atleta (`ChatService.createOrGetChat` + `sendMessage`, que já existem), fecha o campo e mostra "Enviado · Abrir conversa". Esc ou tocar fora fecha sem enviar; o texto fica como rascunho do chat (`ez-chat-draft-v1:<chatId>`, já existe).
  - **Ver treino** abre a atividade (o `assignmentId` já vem no motivo).
  - **Atribuir** abre o modal com o atleta já escolhido.
- **Ordem:** pelo peso que já existe (overdue 3, skipped 2, highEffort 2, noPlan 2, note 1).
- **Vazio:** uma linha verde, "✓ Todos em dia nos últimos 7 dias".
- "Sem treino nos próximos 7 dias" **continua**, como o usuário pediu.
- **"Marcar como visto" ficou de fora:** não existe campo de "visto" nas atribuições, e guardar só no navegador faria o atleta voltar em outro aparelho. Exige dado novo (um `dismissedAt` por motivo).

### 2.3 Hoje
- **Agrupado por treino:** "Natação: técnica e ritmo · 3 atletas · 1 feito", com o ícone da modalidade e os avatares empilhados. Tocar abre a lista de atletas.
- No título do card: "1 de 3 feitos".
- **Ações por treino (novo, sem dado novo):**
  - **Ver resultados** abre uma folha (celular) ou popover (desktop) com cada atleta: feito ou não, duração, esforço (`rpe`) e nota (`athleteNotes`), e "Ver" para a atividade (`/admin/athletes/:athleteId/activity/:id`, já existe).
  - **Lembrar quem falta (N)** aparece só quando falta alguém. Abre a mesma folha com "Lembrar" por atleta: abre o chat dele com o **texto pronto no campo** ("Oi, Bruno! Hoje tem Natação: técnica e ritmo. Conseguiu encaixar? Se precisar ajustar, me avisa."). **Nada é enviado sozinho**; o coach revisa e envia. Como: grava o rascunho em `ez-chat-draft-v1:<chatId>` e navega com `state.openChatId`. Lembrete individual, não no grupo, para não expor quem não treinou.
- **Amanhã** é **uma linha** no fim do card: "Amanhã: Força B · 3 atletas · Ver".
- **Sem treino hoje:** "Nenhum treino hoje", e a linha de amanhã continua.

### 2.4 Avisos condicionais (1 linha cada, só quando existem)
- **Prova em menos de 14 dias:** "Bruno Teste · Corrida 10 km em 12 dias · Ver".
- **Depoimento pendente:** "1 depoimento para revisar · Revisar".
- Quando não há nenhum, nada aparece. Não há estado vazio nem título de seção.

### 2.5 O que saiu (e por quê)
| Saiu | Por quê |
|---|---|
| 3 dos 4 números (treinos feitos, atletas que treinaram, horas do time) e os cards de inventário | Não levam a uma decisão. "8 de 14 · 57%" e a lista de atenção já dizem se a semana vai bem e quem está fora. |
| "Conclusão geral 79%" com treinos antigos | Misturava períodos; agora só conta a semana atual. |
| Gráfico de tendência de 8 semanas | Ilegível (C7) e não leva a uma ação hoje. A barra dos dias responde "como vai a semana". |
| Tabela "Atletas nesta semana" e "Destaques da semana" | Já existem em Usuários; quem precisa de ação aparece em "Precisa de atenção". |
| Bloco "Amanhã" | Virou uma linha no fim de "Hoje". |
| Faixa de datas e "Atividade de hoje" | A faixa repete o Calendário; a atividade de hoje entrou em "Hoje", agrupada. |
| "Próximas provas" fixo | Só vira aviso quando há prova em menos de 14 dias. |
| "Status dos depoimentos" | Só vira aviso quando há depoimento pendente. |
| "Atividade recente" e "Times" | Já estão no Feed e no menu. |

### 2.6 Dados e decisões
- **Nada novo** no Firestore para esta versão.
- Fica para depois: "marcar como visto" para tirar alguém da lista de atenção. **⛔ Precisa de dado novo** (um `dismissedAt` por motivo).

## 3. Backlog para o EZ Frontend (em ordem)

**⭐ = maior ganho em ~1 dia** (CD-1 a CD-4).

| ID | Tarefa | Tam. | Arquivos |
|---|---|---|---|
| ⭐ CD-1 | **Precisa de atenção como bloco principal:** coluna principal no desktop e 2º bloco no celular; chips por motivo; **resposta rápida no card** (campo + enviar no chat); Ver treino; Atribuir; estado vazio. | M | `src/pages/admin/Dashboard.tsx` (bloco `attention`, ~l. 176-215, e o JSX), `src/components/admin/AttentionList.tsx` (novo), `src/services/chat.ts` (só uso) |
| ⭐ CD-2 | **Semana numa linha:** "x de y · %" só da semana atual + barra por dia; **tocar no dia abre `/admin/calendar?date=`** (Calendar passa a ler `date`). Hook `useTeamWeekStats(assignments)`, com teste. | P | `Dashboard.tsx`, `src/hooks/useTeamWeekStats.ts` (novo), `src/pages/admin/Calendar.tsx` |
| ⭐ CD-3 | **Ações rápidas:** faixa no desktop e chips roláveis no celular (Atribuir, Novo treino, Aviso no feed, Mensagem ao time, Convidar atleta), todas com fluxos que já existem; menu de time quando houver mais de um; remover o botão flutuante. | P | `Dashboard.tsx`, `src/components/admin/QuickActions.tsx` (novo), `src/contexts/TimelineActionsContext.tsx` (só uso) |
| ⭐ CD-4 | **Remover o que saiu:** cards de inventário, "Conclusão geral", tendência (`LineChart`), tabela de atletas, "Destaques", faixa de datas, "Atividade de hoje", "Atividade recente", "Times", bloco "Amanhã". | P | `Dashboard.tsx` (~l. 400-760) |
| CD-5 | **Hoje agrupado por treino** + linha "Amanhã" + **Ver resultados / Lembrar quem falta** (folha com rpe e nota; "Lembrar" abre o chat com o texto no campo, sem envio automático). | M | `Dashboard.tsx`, `src/components/admin/TodayWorkoutSheet.tsx` (novo), `src/components/chat/ChatWindow.tsx` (rascunho já existe) |
| CD-6 | **Avisos condicionais:** prova em menos de 14 dias e depoimento pendente, uma linha cada, nada quando não existem. | P | `Dashboard.tsx` |
| CD-7 | QA: 1440 × 900 sem rolar; 390 px em ~1,4 tela com 4 pendências e 2 avisos; claro e escuro; com 0 pendências, 0 treinos hoje, 0 avisos, 1 e 2 times; resposta rápida (enviar, Esc, erro de rede); lembrete não envia sozinho (EZ QA). | P | testes do EZ QA |

**Ordem:** CD-1 → CD-2 → CD-3 → CD-4 (≈ 1 dia) → CD-5 → CD-6 → CD-7.

**Fora (exige dado novo):** "Marcar como visto" (`dismissedAt` por motivo) e aviso fixado no feed (tipo/pin no post).

O backlog anterior (cartão com 4 números, tabela de atletas, sparkline de 8 semanas) foi **substituído** por este.
