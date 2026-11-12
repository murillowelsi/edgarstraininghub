# Dashboard do coach (/admin): diagnóstico e proposta

**Data:** 12/11/2026 · **Quem:** EZ Design · **Base:** `main` 44563a3 · **Guia:** `docs/design/design-system.md` · **Linguagem:** cartão do atleta da tela "Você" (`docs/design/profile`) e cards do feed
**Mockup:** [`dashboard-mockup.html`](dashboard-mockup.html) · **Prévias:** [`img/`](img/)

Testado no emulador como `coach@ez.test`, em 1440 px e 390 px, tema escuro.

## 1. Diagnóstico

| Desktop | Celular |
|---|---|
| ![](img/atual-desktop-escuro.png) | ![](img/atual-mobile-escuro.png) |

### Principais problemas
1. **"Precisa de atenção" está escondido.**
   - No desktop, fica na coluna lateral, ao lado de blocos menos importantes.
   - No celular, aparece só depois de ~1.200 px (cartões, conclusão, amanhã, faixa de datas, atividade de hoje).
   - Não tem ação: para responder a uma nota, o coach precisa achar o atleta no chat.
2. **Os números de cima são inventário, não a semana.** "6 Atletas · 1 Time · 5 Treinos" quase não muda. Cada um tem um fundo colorido próprio (amarelo, roxo, laranja, verde) fora da paleta. O que importa (como foi a semana) fica espalhado entre "Conclusão geral 79%", a tendência e a tabela.
3. **Repetição:**
   - "Amanhã" e "Atividade de hoje" listam o mesmo treino 3 vezes, uma linha por atleta;
   - a faixa de datas repete o Calendário;
   - "Destaques da semana" repete a tabela de atletas;
   - "Conclusão geral" e "Tendência" contam a mesma história de jeitos diferentes.
4. **A tabela de atletas é pesada e corta nomes** ("Carl…", "Bru…"). Usa verde cheio para feito, "0/1" para planejado e % em vermelho no meio da semana, como se fosse alarme. A modalidade não aparece.
5. **O gráfico de tendência fica ilegível:** rótulos do eixo Y cortados, pontos soltos e "alvo 80%" por cima da linha. Já apontado na auditoria (C7).

## 2. Proposta

![Desktop](img/proposta-1-desktop.png)
![Celular, escuro e claro](img/proposta-2-mobile.png)

Ordem: **cartão do coach** → **precisa de atenção** → **hoje / amanhã** → atletas nesta semana → provas e depoimentos.

### 2.1 Cartão do coach (padrão do cartão do atleta)
- Saudação com a data e a semana. "Atribuir treino" fica no cartão (no desktop) ou no FAB (no celular).
- **4 números da semana** (seg–dom), em `text-metric-md`:
  - **Conclusão** (% feitos dos previstos até hoje, com barra);
  - **Treinos feitos** x/y;
  - **Atletas que treinaram** x/y;
  - **Horas do time** (soma do `elapsedTime` dos concluídos).
- **Semana dia a dia:** 7 colunas com a % feita por dia; os dias futuros ficam tracejados. Substitui a tendência de 8 semanas no topo.
- **Dados:** todos vêm das atribuições já carregadas (`completedAt`, `scheduledDate`, `elapsedTime`). **Nada novo.** O número "79% geral" atual inclui treinos antigos; a proposta usa só a semana. Confirmar com o usuário qual período ele quer ver (sugestão: semana).

### 2.2 Precisa de atenção (destaque)
- Desktop: a coluna principal, à esquerda, com borda `destructive/35`. Celular: logo abaixo do cartão.
- Cada atleta tem avatar, nome e **chips com os motivos que o código já calcula** (`attention`, `Dashboard.tsx:176-212`):

| Motivo | Chip |
|---|---|
| `overdue` | "N atrasado(s)", em `destructive-ink` |
| `skipped` | "N não feito(s)", em `destructive-ink` |
| `highEffort` | "esforço 9/10", em `--sport-strength` |
| `note` | "nota no treino" + a citação em itálico (1 linha) |
| `noPlan` | "sem treino nos próximos 7 dias", em `warning-ink` |

- **Ações rápidas:**
  - **Responder** abre o chat com o atleta;
  - **Ver treino** abre a atividade (`assignmentId` já vem no motivo);
  - **Atribuir** abre o modal com o atleta já escolhido.
- **Vazio:** uma linha "✓ Todos em dia nos últimos 7 dias".
- "Marcar como visto" para tirar alguém da lista **⛔ precisa de dado novo** (um `dismissedAt` por motivo). Fica para depois.
- As combinações de motivos no mockup são exemplos.

### 2.3 Hoje e amanhã
- **Agrupar por treino:** uma linha "Natação: técnica e ritmo · 3 atletas · 0 feitos", com o ícone da modalidade e os avatares empilhados. Tocar abre a lista.
- No desktop, Hoje e Amanhã ficam em cards separados; no celular, num só.

### 2.4 Atletas nesta semana
- **Desktop:** tabela com nome inteiro e 7 colunas com o status do dia na **cor da modalidade**:
  - ✓ feito;
  - anel planejado;
  - tracejado vermelho não feito;
  - ponto cinza livre.
  - Na última coluna, "x/y" com uma barra neutra (sem vermelho).
- **Celular:** lista com barra de progresso.
- A tabela ordena por conclusão, então **"Destaques da semana" sai**.

### 2.5 O que sai
- A faixa de datas e "Atividade de hoje" (entram em Hoje e amanhã).
- Os 4 cards de inventário (o número de atletas aparece em "3/6 treinaram").
- "Destaques da semana".
- A tendência de 8 semanas como gráfico grande. Na fase 2, ela pode voltar como um sparkline dentro de "Conclusão".
- "Atividade recente" e "Times" (já estão no Feed e no menu).
- "Status dos depoimentos" vira uma linha "1 depoimento para revisar · Revisar".

## 3. Backlog para o EZ Frontend (em ordem)

**⭐ = maior ganho em ~1 dia** (CD-1 a CD-3).

| ID | Tarefa | Tam. | Arquivos |
|---|---|---|---|
| ⭐ CD-1 | **Precisa de atenção em destaque** (coluna principal no desktop, 2º bloco no celular), chips por motivo, ações Responder / Ver treino / Atribuir, estado vazio. | M | `src/pages/admin/Dashboard.tsx` (bloco `attention`, ~l. 176-215 e o JSX correspondente), `src/components/admin/AttentionList.tsx` (novo) |
| ⭐ CD-2 | **Cartão do coach**: 4 números da semana + semana dia a dia, substituindo os 4 cards de inventário, a "Conclusão geral" e a tendência. Hook `useTeamWeekStats(assignments)`, com teste. | M | `Dashboard.tsx` (cards ~l. 400-480, `LineChart`), `src/hooks/useTeamWeekStats.ts` (novo) |
| ⭐ CD-3 | **Hoje e amanhã agrupados por treino**, substituindo "Amanhã", a faixa de datas e "Atividade de hoje". | P | `Dashboard.tsx` (~l. 490-760) |
| CD-4 | **Tabela de atletas** com status por modalidade e nome inteiro; lista no celular; remover "Destaques da semana". | M | `Dashboard.tsx` |
| CD-5 | **Laterais compactas:** provas (2 linhas), depoimentos em 1 linha; remover "Atividade recente" e "Times" do dashboard. | P | `Dashboard.tsx` |
| CD-6 | Fase 2: sparkline de 8 semanas dentro de "Conclusão" (corrige o C7). | P | `Dashboard.tsx` |
| CD-7 | QA em 1440, 1024 e 390 px, claro e escuro, com e sem pendências (EZ QA). | P | testes do EZ QA |

**Ordem:** CD-1 → CD-2 → CD-3 (≈ 1 dia) → CD-4 → CD-5 → CD-6 → CD-7.

**Decisão para o usuário:** o percentual de conclusão deve olhar só a semana atual (proposta) ou tudo até hoje (atual)?
