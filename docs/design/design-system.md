# EZ Design System: guia de acabamento visual

**Versão:** 1.0 · 12/11/2026 · **Dono:** EZ Design · **Quem implementa:** EZ Frontend
**Base:** `src/index.css`, `tailwind.config.ts`, `src/components/ui` (shadcn), `src/components/glass`, auditorias em `docs/ux-audit/` (18/10) e a auditoria do site público de 12/11 (`docs/ux-audit/2026-11-12-public-site.md`).
**Backlog para implementar:** `docs/design/backlog-frontend.md`.

Este guia mantém a identidade atual: amarelo primário, navy escuro, Inter e Montserrat, vidro só no chrome flutuante. Ele não cria uma identidade nova. Ele fixa as regras para o app parecer um produto só, do site ao portal do coach e à PWA do atleta.

---

## 0. Princípios

1. **Uma coisa por vez no celular.** Uma ação principal por tela e o resto em menus. O atleta usa o app na academia, com pressa e com a mão suada.
2. **Nada some em silêncio.** Toda carga tem um esqueleto. Todo erro tem uma mensagem e uma ação. Toda ação tem uma resposta em até 100 ms.
3. **Um idioma por vez.** Nenhum texto fixo no JSX. Datas e números sempre no formato do idioma.
4. **Números são o produto.** Carga, pace, tempo e reps usam dígitos tabulares e unidades consistentes, e ficam em destaque.
5. **O amarelo é sinal, não decoração.** Ele marca a ação principal, o item ativo e o progresso. Em fundo claro, nunca use o amarelo puro como cor de texto.

---

## 1. Cor

### 1.1 O que fica
| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--primary` | `48 96% 45%` | igual | ação principal, item ativo, progresso, anel do timer |
| `--primary-foreground` | `222 47% 11%` (navy) | igual | texto **sobre** amarelo (contraste ≈ 9:1) |
| `--background` | branco | `222 47% 11%` | fundo da página |
| `--card` | branco | `222 47% 13%` | superfície de card |
| `--secondary` (laranja) | `25 95% 53%` | igual | **só decorativo** (barras, gráficos). Nunca com texto branco (≈ 2,8:1) |

### 1.2 O que entra (novos tokens)
Adicione em `:root` e `.dark` (`src/index.css`) e mapeie em `tailwind.config.ts > theme.extend.colors`.

| Token | Claro | Escuro | Tailwind | Uso |
|---|---|---|---|---|
| `--primary-ink` | `40 95% 30%` | `48 96% 45%` | `text-primary-ink` | texto amarelo/dourado legível: links, palavra em destaque, números em destaque. No claro dá ≈ 5:1 sobre branco |
| `--surface-2` | `210 40% 98%` | `222 40% 16%` | `bg-surface-2` | popover, menu, sheet sobre card (elevação no escuro) |
| `--surface-inverse` | `222 47% 11%` | `222 47% 8%` | `bg-surface-inverse` | rodapé e faixas navy fixas nos dois temas |
| `--success` / `--success-ink` | `142 76% 36%` / `142 72% 29%` | `142 76% 36%` / `142 69% 58%` | `bg-success`, `text-success-ink` | concluído, PR, salvo |
| `--warning` / `--warning-ink` | `38 92% 50%` / `26 90% 37%` | `38 92% 50%` / `43 96% 56%` | `bg-warning`, `text-warning-ink` | parcial, atrasado, sem conexão |
| `--info` / `--info-ink` | `199 89% 48%` / `201 96% 32%` | `199 89% 48%` / `198 93% 60%` | `bg-info`, `text-info-ink` | extra, dica |
| `--destructive-ink` | `0 72% 51%` | `0 91% 71%` | `text-destructive-ink` | texto de erro, item "Excluir" no menu |

Os valores seguem a paleta padrão do Tailwind (green, amber, sky e red, tons 400, 600 e 700). Os contrastes são aproximados: confira com um verificador antes do merge.

### 1.3 Cores de modalidade
Hoje cada tela escolhe as suas: o calendário do coach pinta **por atleta** (azul, laranja, verde) e a legenda diz que são **tipos de treino**; os KPIs do dashboard usam roxo, que não existe na paleta. Fixe **uma cor por modalidade**, só em ícone, barra fina e fundo do ícone (`/15`). Nunca em texto longo.

| Modalidade | Token | Valor | Ícone |
|---|---|---|---|
| Corrida | `--sport-run` | `217 91% 60%` (blue-500) | `RunIcon` |
| Bike | `--sport-bike` | `142 71% 45%` (green-500) | `Bike` |
| Natação | `--sport-swim` | `188 86% 53%` (cyan-400) | `SwimIcon` |
| Força | `--sport-strength` | `25 95% 53%` (= `secondary`) | `Dumbbell` |
| Outro / extra | `--sport-other` | `215 16% 47%` (muted-foreground) | `Activity` |

As pessoas (atletas) não ganham cor: são identificadas por avatar e nome. Os KPIs do dashboard ficam neutros (`bg-card`), com o ícone em `text-muted-foreground` e o número em destaque.

### 1.4 Regras
- **Texto sobre amarelo é sempre navy** (`text-primary-foreground`). `text-white` sobre `bg-primary` é proibido: dá ≈ 1,9:1.
- **Amarelo como texto:** no escuro, use `text-primary`. No claro, use `text-primary-ink`, ou o "marca-texto": texto navy com uma faixa amarela atrás (`bg-gradient-to-t from-primary/40 from-35% to-transparent to-35%`). O marca-texto mantém a identidade sem perder contraste.
- **Status nunca só por cor:** use ícone + texto + cor (ver 8.6).
- **Fundo "soft"** para badges e linhas: `bg-success/12`, `bg-warning/15`, `bg-destructive/12`, com texto `*-ink`.
- `destructive` no escuro (`0 63% 31%`) serve só como fundo de botão. Como texto, use `destructive-ink`.
- Remova `brand.*` do `tailwind.config.ts` (4 usos) e troque por tokens semânticos.

---

## 2. Tipografia

**Famílias:** Montserrat (`font-display`) só para títulos de página e de seção e para números grandes. Inter (`font-sans`) para todo o resto, incluindo títulos de card.
Hoje `h1…h6` recebem Montserrat bold na base. **Mude para:** `h1, h2` com `font-display`, e `h3…h6` com `font-sans font-semibold`.

### 2.1 Escala
Configure em `tailwind.config.ts > theme.extend.fontSize` com `[size, { lineHeight, letterSpacing, fontWeight }]`.

| Token (classe) | Tamanho / altura | Peso | Família | Uso |
|---|---|---|---|---|
| `text-display-xl` | 56 / 60 px (3.5rem / 1.07) · tracking −0.02em | 800 | display | hero do site (≥ lg) |
| `text-display-lg` | 40 / 44 | 700 | display | hero no mobile, título de seção ≥ md |
| `text-display-md` | 32 / 38 | 700 | display | título de seção do site no mobile |
| `text-title-lg` | 24 / 30 | 700 | display | título da página (desktop do coach, telas raiz do atleta) |
| `text-title-md` | 20 / 26 | 600 | sans | título de sheet ou diálogo, cabeçalho de grupo |
| `text-title-sm` | 17 / 22 | 600 | sans | título na barra superior, título de card |
| `text-body-lg` | 18 / 28 | 400 | sans | parágrafo de abertura do site |
| `text-body` | 16 / 24 | 400 | sans | texto padrão; inputs no mobile (evita o zoom do iOS) |
| `text-body-sm` | 14 / 20 | 400 | sans | texto secundário, células de tabela |
| `text-caption` | 12 / 16 | 500 | sans | metadados (data · duração), legenda de eixo |
| `text-overline` | 11 / 16 · tracking 0.08em · maiúsculas | 600 | sans | rótulo de seção ("ESTA SEMANA"), selo |
| `text-metric-xl` | 48 / 52 · `tabular-nums` | 700 | display | timer de descanso, tempo total |
| `text-metric-lg` | 32 / 36 · `tabular-nums` | 700 | display | KPI do dashboard, carga do PR |
| `text-metric-md` | 20 / 24 · `tabular-nums` | 600 | sans | números em card (km, kg, pace) |

Regras:
- Toda tela tem **um** `h1`. Os níveis não pulam (`h1 → h2 → h3`).
- Timers, cargas, paces e contadores sempre com `tabular-nums`: os dígitos não "pulam" quando o número muda.
- **Sem fonte monoespaçada na interface.** Hoje as linhas "0min / 33min" dos cards de atleta usam `font-mono`, uma terceira família. Use Inter com `tabular-nums`.
- Comprimento de linha de texto corrido: `max-w-prose` (≈ 65 caracteres).
- Corte: títulos de card com `line-clamp-2` (resolve o 4.1 de 18/10). Metadados com `truncate`.
- Use no máximo 3 tamanhos por tela de app.

---

## 3. Espaçamento e layout

Base de **4 px** (a escala padrão do Tailwind). Use só estes passos: `1 (4) · 2 (8) · 3 (12) · 4 (16) · 5 (20) · 6 (24) · 8 (32) · 10 (40) · 12 (48) · 16 (64) · 20 (80)`. Valores arbitrários (`p-[13px]`) só com justificativa no PR.

| Uso | Valor | Classe |
|---|---|---|
| Margem lateral da página | 16 mobile · 24 md · 32 lg | `px-4 md:px-6 lg:px-8` (crie `.page-x`) |
| Espaço entre o cabeçalho da página e o conteúdo | 16 mobile · 24 md | `mt-4 md:mt-6` |
| Entre blocos de uma tela | 24 | `space-y-6` |
| Entre itens de lista em cards | 8 | `space-y-2` |
| Padding interno de card | 16 mobile · 20 md | `p-4 md:p-5` |
| Entre rótulo e campo | 6 | `space-y-1.5` (já usado) |
| Entre campos de formulário | 16 | `space-y-4` |
| Seção do site público | 48 mobile · 80 desktop | `.section` = `py-12 md:py-20` (hoje `py-16 md:py-24` + `.section-modern` = até 200 px entre seções) |

**Largura do conteúdo:**
- PWA do atleta: coluna única, `max-w-2xl mx-auto` no tablet e no desktop.
- Portal do coach: `max-w-7xl`; editores com painel lateral de 360–400 px.
- Site: `max-w-6xl` para grades e `max-w-prose` para texto.

**Breakpoints:** os padrões do Tailwind. `md` (768) é onde o coach troca a barra inferior pelo layout de desktop.

**Áreas seguras:** barra superior, barra de abas, sheets e FAB usam `env(safe-area-inset-*)`, como já é feito no `AdminPageHeader`.

**Camadas (z-index):** crie tokens e pare de usar `z-50` em tudo.
| Token | Valor | Uso |
|---|---|---|
| `z-sticky` | 10 | cabeçalho de lista ou grupo |
| `z-fab` | 30 | FAB |
| `z-chrome` | 40 | barra superior, barra de abas, barra da sessão |
| `z-overlay` | 50 | sheet, dialog, drawer |
| `z-toast` | 100 | toasts |

---

## 4. Raios

`--radius` continua `0.75rem` (12 px). Use **um raio por tipo de componente**:

| Classe | px | Componentes |
|---|---|---|
| `rounded-sm` | 8 | badge, chip pequeno, checkbox, miniatura |
| `rounded-md` | 10 | botão, input, select, segmented control |
| `rounded-lg` | 12 | card de lista, menu, popover, toast |
| `rounded-2xl` | 16 | card de destaque (Hoje, resumo do treino), dialog |
| `rounded-3xl` | 24 | sheet (cantos de cima), mídia no site |
| `rounded-full` | — | avatar, FAB, botão de vidro circular, pílula de status |

Não use `rounded-xl` (12 px no Tailwind = igual a `lg`, o que gera dúvida). Elementos aninhados: o raio interno é o raio externo menos o padding (por exemplo, um card `2xl` com `p-1` leva uma imagem `rounded-[12px]`).

---

## 5. Elevação e sombra

| Nível | Claro | Escuro | Uso |
|---|---|---|---|
| **e0** plano | borda `border-border` | borda `border-border` | lista sobre o fundo, tabela |
| **e1** card | `shadow-sm` + borda | `bg-card` + borda, sem sombra | card de lista |
| **e2** flutuante | `shadow-md` | `bg-surface-2` + `shadow-md` | dropdown, popover, tooltip, toast |
| **e3** modal | `shadow-xl` | `bg-surface-2` + `shadow-xl` | sheet, dialog |
| **glass** | `.glass` | `.dark .glass` | **só** o chrome flutuante: barra superior, barra de abas, barra da sessão, FAB |

Regras:
- No escuro, a sombra quase não aparece. A elevação vem da superfície mais clara (`card` → `surface-2`).
- **Hover sem `scale`:** tire o `scale-105` de `.card-modern:hover` e de `.btn-primary:hover`. Use `border-primary/30` e um nível de sombra a mais. O `scale` no hover desfoca o texto e "empurra" a grade.
- `--shadow-glow` só no anel do timer de descanso ativo e no FAB principal. Não use em cards.
- Vidro: nunca em card de lista nem atrás de texto longo. Em barras com texto, confira o contraste sobre o pior fundo (foto clara no feed). Se não passar de 4,5:1, aumente a opacidade do fundo do `.glass` naquela barra.

---

## 6. Movimento

### 6.1 Tokens
Crie em `:root` e no `tailwind.config.ts` (`transitionDuration`, `transitionTimingFunction`):

| Token | Valor | Uso |
|---|---|---|
| `duration-instant` | 100 ms | press, troca de cor de ícone |
| `duration-fast` | 150 ms | hover, fade de conteúdo, troca de aba |
| `duration-base` | 200 ms | toast, popover, dialog, expandir card |
| `duration-moderate` | 280 ms | sheet, push de tela no mobile |
| `duration-slow` | 400 ms | celebração (fim do treino), gráficos entrando |
| `ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | entrada e movimento na tela |
| `ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | saída (dura 70% da entrada) |
| spring (motion) | `{ type: "spring", stiffness: 500, damping: 32 }` | arrastar, reordenar, sheet seguindo o dedo |

As animações de entrada do site (`fade-in`, `slide-up`, 0,6 s) passam para 350 ms, uma vez por elemento, com deslocamento máximo de 16 px.

### 6.2 Transições entre telas
| Contexto | Transição |
|---|---|
| Atleta, avançar (lista → detalhe) | entrada: `x 24px → 0` + fade, 280 ms `ease-standard`. A tela de trás faz fade até 0,6 |
| Atleta, voltar | o inverso, 200 ms `ease-exit` |
| Trocar aba na barra inferior | crossfade de 150 ms, sem deslize (as abas são irmãs, não uma pilha) |
| Sheet ou drawer | sobe de baixo, 280 ms. Ao fechar, 200 ms. Pode ser arrastado (vaul já faz) |
| Dialog | fade + `scale 0.96 → 1`, 200 ms |
| Coach (desktop) | fade de 150 ms no conteúdo. A navegação lateral não anima |
| Sessão de força: abrir o próximo exercício | expandir altura, 200 ms + rolagem suave até o card |

Implementação: `AnimatePresence` do `motion` (já instalado) em volta do `<Outlet>` dos layouts, com a `location.key` como chave e a direção vinda do `history` (push ou pop).

### 6.3 Movimento reduzido
Com `prefers-reduced-motion: reduce`: troque deslize e scale por fade de até 150 ms e desligue animações infinitas (`animate-float` e `animate-glow` no hero). O timer continua contando, mas o anel não pulsa. Use `useReducedMotion()` do `motion` e a variante `motion-safe:` do Tailwind.

---

## 7. Ícones

- **Só lucide** (`lucide-react` 0.462). O `react-icons` hoje só traz 3 ícones de modalidade (`GrRun`, `GrSwim`, `GrBike`) em 19 arquivos.
- **Ícones de modalidade:** crie `src/components/icons/sport-icons.tsx` com `createLucideIcon` (exportado pelo `lucide-react`): grade de 24, traço 2, pontas redondas, desenho próprio.
  | Modalidade | Ícone |
  |---|---|
  | Corrida | `RunIcon` (próprio: figura correndo) |
  | Natação | `SwimIcon` (próprio: figura nadando sobre onda) |
  | Bike | `Bike` (lucide) |
  | Força | `Dumbbell` (lucide) |
  | Outro / extra | `Activity` (lucide) |
  Depois, remova o `react-icons` do `package.json`.
- **Tamanhos:**
  | Tamanho | Classe | Uso |
  |---|---|---|
  | 16 | `size-4` | inline no texto, botão `sm`, badge |
  | 20 | `size-5` | padrão: botão, linha de lista, input, menu |
  | 24 | `size-6` | barra superior, barra de abas, FAB |
  | 32 | `size-8` | estado vazio ou de erro (dentro de um círculo de 64) |
- **Traço:** `strokeWidth={2}` até 20 px; `1.75` em 24 px; `1.5` em 32 px ou mais. Defina isso no componente e não em cada uso.
- **Aba ativa:** o mesmo ícone, cor `primary` e rótulo em semibold (o lucide não tem versão preenchida).
- Ícone sem texto **sempre** com `aria-label` traduzido. Ícone decorativo ao lado de texto leva `aria-hidden`.
- Emojis não substituem ícones na interface (exemplo: 🏊🏻🚴🏻🏃🏻 no "Sobre"). Emojis ficam só no conteúdo que o usuário escreve.

---

## 8. Componentes

### 8.1 Cabeçalho de página único: `PageHeader`
Hoje há três padrões: `AdminTopBar` + `AdminPageHeader` (o título aparece duas vezes no desktop), a barra de vidro do `AthletePortalLayout` e barras próprias em telas de detalhe (o 3.7 de 18/10: cabeçalho duplicado). Crie um componente só, `src/components/layout/PageHeader.tsx`.

```tsx
<PageHeader
  title="Treinos"                 // obrigatório; também vira o document.title
  subtitle="54 treinos"           // opcional (desktop)
  back={{ to: "/athlete" }}       // opcional: mostra ← (44 px) no lugar do slot da esquerda
  actions={[{ icon: Search, label: "Buscar", onClick }]}  // até 2 ações só com ícone
  primaryAction={{ label: "Novo treino", icon: Plus, onClick }} // botão no desktop, FAB no mobile
  tabs={<Tabs …/>}                // opcional: segmented ou abas logo abaixo
/>
```

| | Mobile (< md) | Desktop (≥ md) |
|---|---|---|
| Container | barra `.glass` fixa, 56 px + área segura, `z-chrome` | sem barra de vidro: cabeçalho no fluxo da página |
| Título | `text-title-sm`, centralizado, `truncate` | `text-title-lg` à esquerda + `subtitle` em `text-body-sm text-muted-foreground` |
| Esquerda | voltar, ou a ação de criar do atleta (padrão atual) | breadcrumb quando a tela tem 2 níveis ou mais |
| Direita | até 2 botões circulares de vidro de 44 px | ações + `primaryAction` como `Button` |
| Ação principal | `GlassFab` acima da barra de abas | botão no cabeçalho |
| Telas raiz (abas) | título grande opcional (`text-title-lg`) abaixo da barra, que vai para a barra ao rolar (fase 2) | — |

**Regra:** o título aparece **uma vez** por tela. O `AdminTopBar` deixa de mostrar `currentTitle` no desktop. O detalhe do treino do atleta usa `back` em vez de uma segunda barra.

### 8.2 Carregamento
Hoje são cerca de 158 spinners e skeleton em 5 telas.

| Situação | Padrão |
|---|---|
| Primeira carga de uma tela | **skeleton** com o mesmo layout final. Mostre só se passar de 300 ms (evita piscar) |
| Recarregar dados que já estão na tela | mantenha os dados (`placeholderData: keepPreviousData`), sem skeleton. Opcional: uma barra fina de 2 px no topo |
| Ação em botão | spinner de 16 px **dentro** do botão + verbo no gerúndio ("Salvando…"). O botão mantém a largura |
| Paginação ou scroll infinito | 2 skeletons do item no fim da lista |
| Arranque do app (auth) | `PageSpinner` com o logo "EZ", **só** aqui |
| Upload de imagem | prévia local na hora + barra de progresso sobre ela |

Crie um kit em `src/components/feedback/skeletons.tsx`, baseado no `Skeleton` atual:
| Preset | Forma | Telas |
|---|---|---|
| `ListSkeleton` | 6 × [avatar 40 + 2 linhas 60%/40%] | Treinos, Atletas, Times, Chat |
| `FeedSkeleton` | 2 × [cabeçalho com avatar + mídia 4:5 + barra de ações] | Feed |
| `TodaySkeleton` | faixa de 7 dias + card de destaque de 160 px + 2 cards | Home do atleta |
| `DetailSkeleton` | bloco de 120 px + 3 linhas de métrica + 4 linhas | detalhe do treino, atividade |
| `StatsSkeleton` | 4 blocos de KPI + gráfico de 200 px | Dashboard, Progresso |
| `TableSkeleton` | cabeçalho + 8 linhas | Usuários e Treinos do coach (desktop) |
| `CalendarSkeleton` | grade da semana ou do mês com 3 blocos | Calendários |
| `FormSkeleton` | 4 × [rótulo + input] | editores ao abrir |

Os skeletons usam `bg-muted` e `animate-pulse` (`motion-safe:`), com os mesmos raios e alturas do conteúdo real, para não haver salto de layout.

### 8.3 Estado vazio: `EmptyState`
```tsx
<EmptyState icon={CalendarCheck} title="Dia livre" description="…" action={{label, onClick}} secondaryAction={…} />
```
Layout: centralizado, ícone 32 em círculo de 64 (`bg-muted text-muted-foreground`), título `text-title-sm`, descrição `text-body-sm text-muted-foreground max-w-[40ch]`, botão principal. Em lista, ocupa a altura do container. Em card, vem em versão compacta (ícone 20, sem círculo).

Três tipos, cada um com o seu texto:
| Tipo | Quando | Ação |
|---|---|---|
| Primeiro uso | nunca houve dados | criar ("Criar treino") |
| Sem resultados | busca ou filtro sem resultados | "Limpar filtros" |
| Tudo feito | a lista ficou vazia por mérito | positiva, sem ação obrigatória |

Textos de partida (pt / en):
| Tela | Título | Descrição | Ação |
|---|---|---|---|
| Home do atleta, sem treino hoje | Dia livre · Rest day | Nenhum treino planejado para hoje. · No workout planned for today. | Registrar sessão extra · Log extra session |
| Treinos pendentes zerados | Tudo em dia · All caught up | Você concluiu todos os treinos planejados. · You've completed every planned workout. | — |
| Feed vazio | Ainda não há posts · No posts yet | Quando seu time compartilhar treinos, eles aparecem aqui. · When your team shares workouts, they'll show up here. | Compartilhar treino · Share a workout |
| Chat vazio | Nenhuma conversa · No conversations | Mande uma mensagem para o seu coach. · Send your coach a message. | Nova mensagem · New message |
| Biblioteca do coach vazia | Sua biblioteca está vazia · Your library is empty | Crie o primeiro treino para atribuir aos atletas. · Create your first workout to assign to athletes. | Criar treino · Create workout |
| Atletas (coach) vazio | Nenhum atleta ainda · No athletes yet | Convide atletas com o link do time. · Invite athletes with your team link. | Copiar link de convite · Copy invite link |
| Busca sem resultado | Nada encontrado · No results | Tente outro termo ou limpe os filtros. · Try another term or clear the filters. | Limpar filtros · Clear filters |

Ilustrações: use ícones lucide. As SVGs `public/undraw_*.svg` são de terceiros (licença unDraw). Antes de usá-las em material externo, confirme a licença ou troque por arte própria.

### 8.4 Erro: `ErrorState` + `getErrorMessage`
Nenhum `catch` termina só no `console.error`. Cada erro escolhe um dos níveis:

| Nível | Quando | Padrão |
|---|---|---|
| Campo | validação | texto `text-caption text-destructive-ink` com `AlertCircle` 16 abaixo do campo; `aria-invalid` + `aria-describedby` |
| Seção ou tela | falha ao carregar dados | `ErrorState` no lugar do conteúdo: ícone `AlertTriangle` em círculo `bg-destructive/12`, título com o que falhou, descrição com o que fazer, **[Tentar de novo]** + ação secundária ("Voltar ao início") |
| Ação em segundo plano | salvar, curtir, enviar | toast de erro com ação **Tentar de novo** (ver 8.5) e reversão da UI otimista |
| Rota | 404, id inválido, sem permissão | página com logo, título, descrição e [Ir para o início]. Usar o `errorElement` do router. Resolve "carregando para sempre com id inválido" (4.7 de 18/10) |
| Conexão | `navigator.onLine === false` ou Firestore `unavailable` | faixa fina abaixo do cabeçalho, `bg-warning/15 text-warning-ink`: "Sem conexão. Suas alterações serão enviadas quando a conexão voltar." |

`src/lib/errors.ts > getErrorMessage(err, t)` traduz os códigos do Firebase para texto humano:
| Código | pt | en |
|---|---|---|
| `permission-denied` | Você não tem acesso a isso. | You don't have access to this. |
| `unavailable` / rede | Sem conexão. Tente de novo em instantes. | You're offline. Try again in a moment. |
| `not-found` | Não encontramos esse item. Ele pode ter sido excluído. | We couldn't find this. It may have been deleted. |
| `auth/wrong-password`, `auth/invalid-credential` | E-mail ou senha incorretos. | Incorrect email or password. |
| `auth/email-already-in-use` | Já existe uma conta com esse e-mail. Entre com a sua senha. | An account with this email already exists. Sign in instead. |
| outros | Algo deu errado. Tente de novo. | Something went wrong. Please try again. |

Formato da mensagem: **o que aconteceu + o que fazer**, sem código técnico e sem culpar a pessoa.

### 8.5 Toast: só sonner
Hoje há `use-toast` em 47 arquivos e sonner em 4. Além disso, o `sonner.tsx` lê o tema do `next-themes`, que o app não usa. O tema do toast não acompanha o `ThemeContext`.

- Crie `src/lib/notify.ts`, a única API de toast:
  ```ts
  notify.success("Treino salvo")
  notify.error("Não foi possível salvar", { retry: () => save() })
  notify.info("Link copiado")
  notify.undo("Exercício removido", { onUndo: () => restore() })
  notify.promise(p, { loading: "Enviando…", success: "Enviado", error: (e) => getErrorMessage(e, t) })
  ```
- `<Toaster>` único em `App.tsx`, com `theme` vindo do `ThemeContext`, `richColors={false}`, `closeButton` só no desktop, `visibleToasts={3}`.
- **Posição:** `top-center` no mobile (embaixo ficam a barra de abas e o FAB) e `bottom-right` no desktop.
- **Duração:** sucesso e info 3 s · undo 5 s · erro 6 s, ou fixo enquanto houver ação.
- **Visual:** `rounded-lg`, `bg-surface-2`, borda, ícone de 20 à esquerda (`CheckCircle2` success-ink, `AlertCircle` destructive-ink, `Info` info-ink). Botão de ação em texto `primary-ink`.
- **Texto:** curto, no particípio, sem "com sucesso" e sem "!": "Treino salvo", "2 atletas atribuídos, 1 já tinha esse treino".
- **Quando NÃO usar:** quando a mudança já é visível na tela (curtir, marcar série, trocar filtro); para erro de formulário (vai no campo); para avisos que exigem decisão (use um dialog).
- Depois da migração, apague `toast.tsx`, `toaster.tsx` e `use-toast.ts`.

### 8.6 Confirmação destrutiva
Use o `ResponsiveConfirm` que já existe (dialog no desktop, drawer no mobile). Em 15 arquivos ele já é usado.

- **Peça confirmação só quando há perda real:** excluir com histórico, descartar um treino em andamento, sair de um editor com mudanças, remover um atleta do time.
- **Ações reversíveis não pedem confirmação. Elas usam undo:** remover um exercício no editor, arquivar, descurtir, apagar um rascunho próprio (`notify.undo`).
- **Título** em forma de pergunta, com o objeto: "Excluir o treino "Força A"?"
- **Corpo** com a consequência em números: "3 atribuições futuras serão removidas. O histórico concluído continua salvo." (ver o 2.1 de 18/10).
- **Botões:** [Cancelar] (outline, com o foco inicial) e [Excluir] (`destructive`, com o verbo da ação; nunca "OK" ou "Sim"). No mobile, ficam empilhados com o destrutivo em cima.
- No menu ⋮, o item destrutivo fica por último, separado por um divisor, em `text-destructive-ink` com o ícone `Trash2`.

### 8.7 Cards de lista
```
┌──────────────────────────────────────────────┐
│ [ícone 40]  Título do treino (até 2 linhas)  [badge] │
│             qui, 12 nov · 45 min · Força        [⋮] │
└──────────────────────────────────────────────┘
```
- Altura mínima de 64; `p-3` (mobile) ou `p-4`; `rounded-lg`; `bg-card` + borda; `gap-2` entre os cards.
- **À esquerda:** avatar de 40 (pessoas) ou um bloco de 40 `rounded-md bg-muted` com o ícone de modalidade (treinos).
- **No centro:** título `text-title-sm line-clamp-2` e metadados `text-caption text-muted-foreground` separados por " · ".
- **À direita:** um elemento só (badge de status, ou ⋮ de 44, ou chevron). Se precisar de dois, o badge vai para os metadados.
- O card inteiro é tocável (`<Link>` ou `<button>`), com estado de press (ver 9.3). O ⋮ interrompe a propagação.
- **Coach no desktop:** listas longas (atletas, biblioteca) viram tabela (`Table`) com as mesmas colunas, ordenação e busca.

**Status** (badge `rounded-sm text-caption` + ícone de 12 + texto):
| Status | Estilo | Ícone |
|---|---|---|
| Planejado | `border` neutra | `Circle` |
| Concluído | `bg-success/12 text-success-ink` | `CheckCircle2` |
| Parcial | `bg-warning/15 text-warning-ink` | `CircleDashed` |
| Atrasado / não feito | `bg-destructive/12 text-destructive-ink` | `AlertCircle` |
| Extra | `bg-info/12 text-info-ink` | `Plus` |

**Nunca risque o título de um treino concluído** (3.2 de 18/10): riscado comunica "cancelado".

### 8.8 Botões
| Variante | Uso | Regra |
|---|---|---|
| `default` (amarelo) | ação principal | **uma** por tela ou seção |
| `outline` | ação secundária | — |
| `ghost` | barras de ferramenta, ações em linha | — |
| `link` | navegação em texto | usa `text-primary-ink` |
| `destructive` | só dentro de uma confirmação | — |

| Tamanho | Altura | Uso |
|---|---|---|
| `sm` | 36 | só no desktop denso (tabelas do coach) |
| `default` | **44 no mobile, 40 no desktop** (`h-11 md:h-10`) | padrão |
| `lg` | 52 | CTA principal do site, barra fixa de ação no mobile (`w-full`) |
| `icon` | **44 × 44 no mobile, 40 no desktop** | botões só com ícone |

O `.btn-primary` com gradiente fica só no hero do site. No app, o botão principal é o `default`, sólido.

### 8.9 Formulários e validação
- **Rótulo sempre visível**, acima do campo. O placeholder é só um exemplo ("ex.: 22,5").
- Marque os campos **opcionais** com "(opcional)". Não use asterisco.
- Ajuda em `text-caption text-muted-foreground` abaixo do campo.
- **Altura:** `h-11` no mobile (fonte de 16 px), `h-10` no desktop.
- **Teclado certo:** reps → `inputMode="numeric"`; kg, km → `inputMode="decimal"` (aceita vírgula); tempo e pace → campo `mm:ss` com máscara, nunca minutos decimais (1.8 de 18/10). Unidades como sufixo **dentro** do campo (`kg`, `/km`, `/100 m`).
- **`autocomplete`** sempre: `name`, `email`, `new-password`, `current-password`, `tel`. Senha com o botão "Mostrar" (ícone `Eye` de 44).
- **Validação** com zod + react-hook-form, `mode: "onTouched"`: valida ao sair do campo e revalida a cada tecla depois do primeiro erro.
- **Ao enviar com erro:** foque e role até o primeiro campo inválido; resumo no topo só se houver mais de 3 erros.
- **Não desabilite o botão "Salvar" por invalidez** (1.4 de 18/10: o coach não sabe o que falta). Deixe ativo e mostre os erros ao tocar. Desabilite só durante o envio.
- **Editores longos (treino):** autosave com o estado no cabeçalho ("Salvando…" → "Salvo · há 5 s") ou, com salvar manual, a guarda de mudanças não salvas (`useBlocker` + `beforeunload`) e `Cmd/Ctrl+S`.
- **Barra de ação fixa** no mobile para formulários longos: `sticky bottom-0`, `.glass`, botão `lg w-full`.

---

## 9. Microinterações

### 9.1 UI otimista
Aplique em: curtir e descurtir, marcar e desmarcar série, marcar como lida, reordenar, seguir, comentar (o comentário aparece na hora com opacidade de 60% até confirmar).
Padrão TanStack Query: `onMutate` atualiza o cache e guarda o anterior → `onError` restaura e chama `notify.error(…, { retry })` → `onSettled` invalida. **Nunca** mostre spinner nessas ações.

### 9.2 Vibração e som
Crie `src/lib/haptics.ts` com padrões nomeados. Ele respeita a preferência **"Vibração"** (nova chave no Perfil, ligada por padrão) e não faz nada se `navigator.vibrate` não existir.

| Evento | Padrão (ms) | Junto |
|---|---|---|
| `tap`: marcar série ✓ | `10` | o check se desenha (200 ms) e a linha ganha `bg-success/12` |
| `restWarning`: faltam 5 s de descanso | `[30]` | o anel muda para `warning` |
| `restEnd`: fim do descanso | `[200, 100, 200]` (o atual) | som curto + flash do anel + destaque da próxima série + push com a tela bloqueada (`/api/rest-timer`) |
| `success`: treino concluído | `[20, 40, 20, 40, 60]` | tela de resumo com o check em `scale-in` 400 ms |
| `error`: falha ao salvar | `[50, 50, 50]` | toast de erro |

**iOS (Safari/PWA) não tem `navigator.vibrate`.** Nele, o aviso do fim do descanso depende do som, do flash e do push. Não prometa vibração no iPhone em nenhum texto.

### 9.3 Estados de press, hover e foco
| Elemento | Press (touch) | Hover (desktop) | Foco |
|---|---|---|---|
| Botão | `active:scale-[0.97]` 100 ms | cor `/90` | `ring-2 ring-ring ring-offset-2` |
| Card ou linha tocável | `active:bg-muted/60` (sem scale) | `border-primary/30` | anel no card |
| Botão de vidro circular | `active:scale-95` + `.glass-lens` | — | anel |
| Ícone de aba | `active:scale-90` | — | anel |

- Defina `-webkit-tap-highlight-color: transparent` no `body`, porque o press já é nosso.
- Nada pode depender só do hover: o "+" do dia no Calendário do coach (2.8 de 18/10) tem que ser visível no touch.
- Contadores (likes, séries 3/5) mudam com `tabular-nums` e um fade curto, sem pular.

---

## 10. Texto

### 10.1 Idioma
- **Zero texto fixo no JSX.** Todo texto visível, `aria-label`, `title`, `placeholder` e toast vêm de `src/translations/{pt,en}.json`. Hoje são cerca de 72 casos, mais "MAIS POPULAR", "Preço a consultar", "Admin login", "Back to Blog", "min read" e outros.
- Uma lint ajuda a manter: `eslint-plugin-i18next` (`no-literal-string`) só em `src/pages` e `src/components`. **É uma dependência de dev nova: precisa do OK do EZ Lead.** A alternativa sem dependência é um script `grep` no CI.
- **Idioma inicial:** se não houver preferência salva, use `navigator.language` (`pt*` → pt, senão en). Hoje o padrão é sempre en.
- **Seletor de idioma:** um controle segmentado com texto "PT | EN", em vez das bandeiras. A bandeira do Reino Unido não representa o inglês, e a de Portugal exclui o Brasil.
- **Variante do português: decisão em aberto.** Os textos hoje misturam pt-PT ("desporto", "levou-me") e pt-BR ("você", "seus objetivos"). O guia assume **pt-BR** até o usuário decidir.
- Conteúdo do coach (posts, depoimentos) mostra o idioma original. Quando o idioma não é o da interface, aparece um selo "EN" ou "PT".

### 10.2 Formatos
Crie `src/lib/format.ts` e o hook `useFormat()`, que lê o idioma do `LanguageContext`. Use `date-fns` (já instalado) com `ptBR` / `enGB` e `Intl.NumberFormat`. **Nenhuma** chamada a `format(date, "MMM d")` sem locale.

| Função | pt | en |
|---|---|---|
| `date(d, "short")` | 12 nov | 12 Nov |
| `date(d, "medium")` | 12 nov 2026 | 12 Nov 2026 |
| `date(d, "long")` | quinta-feira, 12 de novembro | Thursday, 12 November |
| `date(d, "weekday")` | qui, 12 nov | Thu, 12 Nov |
| `relative(d)` | agora · há 5 min · há 3 h · ontem · 12 nov | now · 5m ago · 3h ago · yesterday · 12 Nov |
| `time(d)` | 18:30 | 18:30 (24 h) |
| `duration(s, "clock")` | 1:05:30 · 45:30 | igual |
| `duration(s, "compact")` | 1 h 05 min · 45 min | 1h 05m · 45m |
| `pace(sPorKm)` | 5:30 /km | 5:30 /km |
| `swimPace(sPor100)` | 1:45 /100 m | 1:45 /100m |
| `number(n)` | 1.234,5 | 1,234.5 |
| `weight(kg)` | 22,5 kg | 22.5 kg |
| `distance(km)` | 21,1 km · 800 m | 21.1 km · 800 m |
| `currency(40, "GBP")` | £ 40 | £40 |
| `count(n, "set")` | 1 série · 3 séries | 1 set · 3 sets (plural pelo `Intl.PluralRules`; resolve "1 sets") |

- A semana começa na **segunda** nos dois idiomas, inclusive no seletor de datas (hoje começa no domingo; 2.6 de 18/10).
- Datas futuras e passadas próximas usam `relative`. Mais de 7 dias usa `short`, e o ano aparece só se for diferente do atual.

### 10.3 Tom de voz
- **Direto, próximo e de treinador.** Segunda pessoa ("você"), frases curtas, verbo no início.
- **Botões dizem o que acontece:** "Salvar treino", "Atribuir a 3 atletas", "Começar treino". Nunca "OK", "Enviar" solto ou "Clique aqui".
- **Número antes de adjetivo:** "Você fez 12 de 14 treinos" em vez de "Ótima semana!".
- **Maiúscula só no início da frase** em pt e en, em títulos, botões e abas: "Novo treino", "Conclusão geral", "Atividade de hoje", e não "Novo Treino" ou "Salvar Treino". Nomes de exercício aparecem como foram digitados: tire o `capitalize` do CSS que transforma "Agachamento livre" em "Agachamento Livre".
- **Plural de verdade:** `count()` (10.2) no lugar de "1 não feito(s)", "7 recorde(s) pessoal(is)", "2 etapa(s)".
- **Celebre com moderação:** um "!" só em conquista real (PR, semana completa). Sem emoji na interface.
- **Erro:** o que houve + o que fazer, sem culpa ("Não foi possível salvar. Tente de novo.").
- **Consistência de termos (glossário):**
  | pt | en | Não usar |
  |---|---|---|
  | Treino | Workout | Sessão (para o treino planejado), Exercício |
  | Sessão | Session | (é o treino em execução ou já feito) |
  | Série | Set | Set no pt |
  | Repetições (rótulo) · reps (coluna compacta) | Reps | — |
  | Carga | Weight | Peso (no contexto de série) |
  | Descanso | Rest | Intervalo (é etapa de endurance) |
  | Etapa | Step | Stage, Fase |
  | Botão de volta (lap) | Lap button | "Pressionar Botão Lap" (1.8 de 18/10) |
  | Atribuir | Assign | Agendar |
  | Coach | Coach | Treinador / Admin (na interface do atleta) |
  | Sessão extra | Extra session | Treino avulso |

---

## 11. Acessibilidade (WCAG 2.2 AA)

| Regra | Como | Situação hoje |
|---|---|---|
| Contraste de texto ≥ 4,5:1 (≥ 3:1 para texto ≥ 24 px ou ≥ 19 px bold) | tokens `*-ink`; navy sobre amarelo | ❌ branco sobre amarelo (preços, card "Ready to transform"); amarelo sobre branco no tema claro; rodapé branco sobre branco no tema claro |
| Contraste de componentes ≥ 3:1 | bordas de input e ícones informativos | conferir `--border` no claro (91% L) em inputs: use `--input` mais escuro (`220 13% 80%`) |
| Alvo de toque ≥ 44 × 44 | tamanhos da seção 8.8; área extra com `after:absolute after:-inset-1` quando o visual precisa ser menor | ❌ muitos alvos de 40 (idioma, tema, menu, redes sociais, setas) e menores no app (✓ 32, ▶ 28) |
| Zoom liberado | `index.html`: `width=device-width, initial-scale=1, viewport-fit=cover`, **sem** `maximum-scale` nem `user-scalable=no` | ❌ bloqueado. O zoom do iOS nos inputs já é evitado com a fonte de 16 px |
| `aria-label` em botão só com ícone | traduzido; ícone com `aria-hidden` | ❌ vários em inglês fixo ("Toggle theme", "Open menu", "Admin login") |
| Foco visível | `focus-visible:ring-2 ring-ring ring-offset-2` em todo interativo | o `--ring` do escuro é cinza (`213 27% 84%`): use o `primary` para manter a marca |
| Ordem e nomes | um `h1` por tela; `<main>`, `<nav>`, `<header>`; link "Pular para o conteúdo" no site | — |
| Não aninhar interativos | `<Button asChild><Link/></Button>` | ❌ link com botão dentro no artigo do blog |
| Movimento | seção 6.3 | ❌ o hero anima sem parar |
| Timers | `aria-live="polite"` só para "Descanso terminado" e "faltam 10 s", nunca a cada segundo | — |
| Status | ícone + texto, além da cor (8.7) | — |
| Idioma | `<html lang>` atualizado (já feito no `LanguageContext`) | ✅ |
| Formulários | rótulo ligado (`htmlFor`), erro em `aria-describedby`, `autocomplete` | ❌ `autocomplete` faltando no `/join` |

---

## 12. Checklist de PR (acabamento)

- [ ] Nenhum texto fixo; datas e números via `useFormat()`.
- [ ] Carga com skeleton; erro com `ErrorState` ou toast com ação; vazio com `EmptyState`.
- [ ] Toast pelo `notify`; ícones só do lucide (ou `sport-icons`).
- [ ] Um `h1` e um `PageHeader` por tela.
- [ ] Tamanhos, raios, sombras e durações só dos tokens deste guia.
- [ ] Alvos ≥ 44 px no mobile; `aria-label` traduzido em botões só com ícone.
- [ ] Testado em 375 × 812 e 1440 × 900, nos temas claro e escuro, em pt e en, e com movimento reduzido.
