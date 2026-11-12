# Backlog de acabamento para o EZ Frontend

**Data:** 12/11/2026 · **Origem:** `docs/design/design-system.md` (guia), `docs/ux-audit/2026-11-12-public-site.md` (itens `#`), `docs/ux-audit/2026-11-12-portals.md` (itens `C*` e `A*`).
**Tamanhos:** **P** = até meio dia · **M** = 1–2 dias · **G** = 3 dias ou mais (vale quebrar em PRs).
**Ordem:** de cima para baixo. As fundações (fase 1) vêm antes das telas porque as fases seguintes usam os tokens e componentes delas. Os itens da fase 0 podem ir em paralelo.

Legenda de dependências: ⛔ depende de decisão ou conteúdo do usuário · 🔧 depende do EZ Backend.

---

## Fase 0: correções rápidas de alto impacto (podem ir já)

| ID | Tarefa | Tam. | Arquivos | Referência |
|---|---|---|---|---|
| F0.1 | Liberar o zoom: tirar `maximum-scale` e `user-scalable=no` do viewport. | P | `index.html` | site #5, guia 11 |
| F0.2 | Rodapé navy fixo nos dois temas (hoje é invisível no claro) e link "Área do atleta" no rodapé. Tirar "Admin login" do cabeçalho (desktop e menu mobile). | P | `src/components/Footer.tsx`, `src/components/Navbar.tsx`, `src/translations/*.json` | site #2, #6, #29 |
| F0.3 | Fim do branco sobre amarelo: `text-primary-foreground` no plano popular, no selo e no card "Ready to Transform". | P | `src/components/PricingSection.tsx`, `src/components/ServicesSection.tsx` | site #3 |
| F0.4 | Não mostrar e-mail como autor no artigo: esconder `authorName` com "@" e mostrar o nome público do coach. Salvar o nome de exibição no `PostForm`. 🔧 A correção do post já publicado é escrita em produção e precisa de aprovação do usuário. | P | `src/pages/BlogArticlePage.tsx`, `src/pages/admin/PostForm.tsx` | site #1 |
| F0.5 | Erro de login fixo no formulário e em linguagem humana (hoje é um toast com o código do Firebase) e leitura do papel do usuário só depois do auth pronto, com 1 nova tentativa. Pedir ao EZ QA para confirmar em produção. | P | `src/pages/admin/Login.tsx`, `src/contexts/AuthContext.tsx` | C1 |
| F0.6 | Não mostrar o e-mail dos membros para os outros atletas no detalhe do time (só nome e avatar). 🔧 Avisar o EZ Backend: as regras de `users` ainda permitem leitura por qualquer logado. | P | `src/pages/athlete/TeamDetail.tsx:142` | A4 |
| F0.7 | Trilho da barra de progresso em `bg-muted` (hoje é laranja e parece cheia). | P | `src/components/ui/progress.tsx:13` | A20 |
| F0.8 | Selo "MAIS POPULAR" e "Preço a consultar" nas traduções; o selo não quebra no mobile (`whitespace-nowrap`, `md:scale-105`). | P | `src/components/PricingSection.tsx`, traduções | site #7, #8 |

## Fase 1: fundações (base para todas as telas)

| ID | Tarefa | Tam. | Arquivos | Referência |
|---|---|---|---|---|
| F1.1 | **Tokens:** cores novas (`primary-ink`, `surface-2`, `surface-inverse`, `success`/`warning`/`info` + `*-ink`, `destructive-ink`, `sport-*`), escala de tipografia (`text-display-*`, `title-*`, `body-*`, `caption`, `overline`, `metric-*`), z-index, durações e easing. Base `h1,h2` com display e `h3–h6` com sans. Tirar o `scale-105` do hover de `.card-modern` e `.btn-primary`. Tirar `brand.*`. `--ring` do escuro = primary. `-webkit-tap-highlight-color`. | M | `src/index.css`, `tailwind.config.ts` | guia 1–6 |
| F1.2 | **Formatos:** `src/lib/format.ts` + `useFormat()` (date, relative, time, duration, pace, swimPace, number, weight, distance, currency, count). A semana começa na segunda no `Calendar` (shadcn). Testes unitários das funções. | M | `src/lib/format.ts` (novo), `src/components/ui/calendar.tsx` | guia 10.2 |
| F1.3 | **Toast único:** `src/lib/notify.ts` sobre o sonner; `<Toaster>` com o tema do `ThemeContext`, posição por breakpoint e durações. Migrar os 47 arquivos de `useToast` e depois apagar `toast.tsx`, `toaster.tsx` e `use-toast.ts`. Quebrar em 2–3 PRs por área. | G | `src/lib/notify.ts` (novo), `src/components/ui/sonner.tsx`, `src/App.tsx`, 47 arquivos com `useToast` | guia 8.5 |
| F1.4 | **Ícones:** `src/components/icons/sport-icons.tsx` (`RunIcon` e `SwimIcon` desenhados no estilo lucide com `createLucideIcon` + reexport de `Bike`, `Dumbbell`, `Activity`) e um `SportIcon` que escolhe pelo tipo. Trocar o `react-icons` nos 19 arquivos e remover a dependência. Trocar os emojis de interface (🏆 ✅ 👑, 🏊🏻🚴🏻🏃🏻 no "Sobre"). | M | novo arquivo; os 19 arquivos listados por `grep -rl react-icons src`; `src/pages/About.tsx`; `package.json` | guia 7, C14, site #25 |
| F1.5 | **Kit de feedback:** `EmptyState`, `ErrorState`, presets de skeleton (`ListSkeleton`, `FeedSkeleton`, `TodaySkeleton`, `DetailSkeleton`, `StatsSkeleton`, `TableSkeleton`, `CalendarSkeleton`, `FormSkeleton`), `useDelayedFlag(300)`, `getErrorMessage(err, t)` com o mapa do Firebase, faixa de offline e `errorElement` do router (404 e sem permissão). | M | `src/components/feedback/*` (novo), `src/lib/errors.ts` (novo), `src/App.tsx` | guia 8.2–8.4 |
| F1.6 | **`PageHeader` único** e adoção nos layouts: no desktop do coach, sem título na barra de vidro; no atleta, `back` em vez de barra dupla; `primaryAction` no desktop e FAB no mobile; `document.title` por tela; `aria-label` + tooltip nos ícones da barra. | M | `src/components/layout/PageHeader.tsx` (novo), `src/components/AdminTopBar.tsx`, `src/components/admin/AdminPageHeader.tsx`, `src/components/athlete/AthletePortalLayout.tsx`, `src/hooks/usePageTitle.ts` | guia 8.1, C2, C6 |
| F1.7 | **Botões e inputs no tamanho de toque:** `default`/`icon` com 44 px no mobile, `lg` com 52; inputs `h-11 md:h-10`; estados de press; `ResponsiveConfirm` no padrão do guia (título com o objeto, consequência em números, foco em Cancelar). | P | `src/components/ui/button.tsx`, `input.tsx`, `select.tsx`, `responsive-confirm.tsx`, `src/components/glass/*` | guia 8.6, 8.8, 9.3 |
| F1.8 | **Idioma:** detectar `navigator.language` na primeira visita; seletor "PT \| EN" segmentado (site, login e perfil); `aria-label`s traduzidos. ⛔ Decidir pt-BR ou pt-PT antes de revisar `pt.json`. | P | `src/contexts/LanguageContext.tsx`, `src/components/LanguageSwitcher.tsx`, `src/components/Navbar.tsx` | guia 10.1, site #27 |

## Fase 2: site público

| ID | Tarefa | Tam. | Arquivos | Referência |
|---|---|---|---|---|
| S1 | Contraste no tema claro: `primary-ink` ou "marca-texto" nas palavras em destaque, no subtítulo do "Sobre", nos horários do Contato e no cargo do depoimento. Novo padrão de título de seção (`overline` + título, sem a barra laranja). | M | `src/components/*Section.tsx`, `src/pages/About.tsx`, `Contact.tsx`, `BlogPage.tsx` | site #4, #21 |
| S2 | Ritmo vertical: `.section` = `py-12 md:py-20`; remover `.section-modern`; card "Ready to Transform" sem o vazio. | P | `src/index.css`, `src/components/ServicesSection.tsx` | site #20, #22 |
| S3 | Hero: CTA "Falar no WhatsApp" com ícone; retrato no mobile; altura pelo conteúdo; linha de prova social; `motion-safe` nas animações. | M | `src/components/HeroSection.tsx` | site #15, #16, #31 |
| S4 | Preços: período, "para quem é", a mesma lista de itens nos 3 planos (✓/—), CTA com o plano no texto do WhatsApp, FAQ. ⛔ conteúdo do usuário. | M | `src/components/PricingSection.tsx`, traduções, `FaqSection.tsx` (novo) | site #9 |
| S5 | SEO: componente `Seo` com `react-helmet` (já instalado) por rota; `og:image` 1200 × 630 (arte a cargo do EZ Design); `twitter:card`; `canonical`; `public/sitemap.xml`; linha no `robots.txt`. | M | `src/components/Seo.tsx` (novo), `src/pages/*.tsx`, `index.html`, `public/` | site #14 |
| S6 | Blog: textos do artigo nas traduções, data com `useFormat`, `Button asChild` no CTA, selo de idioma no post (🔧 campo `language`), layout de destaque com menos de 3 posts. | P | `src/pages/BlogArticlePage.tsx`, `src/pages/BlogPage.tsx` | site #11, #12, #30, #34 |
| S7 | YouTube "lite" (miniatura + play; iframe só no clique) e um card compacto no erro. 🔧 depende da função nova do EZ Backend. | M | `src/components/YouTubeSection.tsx` | site #10 |
| S8 | Depoimentos: grade no desktop e `scroll-snap` no mobile, selo de idioma, setas de 44 px. ⛔ mais depoimentos com consentimento. | M | `src/components/TestimonialsSection.tsx` | site #13, #26 |
| S9 | `/join`: `ErrorState` com saída nos 3 estados de guarda; `autocomplete`; "Mostrar senha"; logo; seletor de idioma. | P | `src/pages/JoinTeam.tsx` | site #17, #18 |
| S10 | "Sobre" e Contato: um título "Conquistas" só, 1ª pessoa, números com `useFormat`, fuso no horário, cidade traduzida. ⛔ confirmar telefone e local. | P | `src/pages/About.tsx`, `src/pages/Contact.tsx`, traduções | site #24, #25, #28 |
| S11 | Rodapé completo: links, área do atleta, privacidade. ⛔ Banner de consentimento do GA e página de privacidade (decisão do usuário). | M | `src/components/Footer.tsx`, `index.html`, `src/pages/Privacy.tsx` (novo) | site #19, #29 |

## Fase 3: portal do coach

| ID | Tarefa | Tam. | Arquivos | Referência |
|---|---|---|---|---|
| C-1 | Tradução e datas no coach: biblioteca (filtros e selos), legenda e calendário mobile, dashboard, Artigos, editor de etapa. | M | `src/pages/admin/Workouts.tsx`, `Calendar.tsx`, `Dashboard.tsx`, `Posts.tsx`, `src/components/workout/StageEditor.tsx`, traduções | C3 |
| C-2 | Cores com significado: cores de modalidade no calendário e nas listas; KPIs neutros; conformidade parcial em tom neutro. | P | `Dashboard.tsx`, `Calendar.tsx`, `src/components/admin/*` | C4 |
| C-3 | Calendário do mês: chip com modalidade + treino + avatar; status sem riscado; ‹ › com nome; dia clicável com "+" visível no touch; corrigir o HTML inválido. | M | `src/pages/admin/Calendar.tsx` | C5, C17 |
| C-4 | Calendário mobile: agrupar por treino, esconder os dias vazios, filtro de atleta. Barra inferior com a aba "Mais" (Times, Artigos, Depoimentos, Configurações). | M | `Calendar.tsx`, `src/components/AdminLayout.tsx` | C9 |
| C-5 | Gráficos: escala redonda, números com locale, estado vazio, alvo fora da área, sem buracos. 🔧 investigar com o EZ Backend por que o "Resumo de progresso" vem vazio. | M | `src/pages/admin/AthleteHistory.tsx`, `Dashboard.tsx` | C7 |
| C-6 | Usuários: selo de assinatura (vencida, teste), ordenação, sem mono, `aria-label` no ⋮, busca de 44 px, `ListSkeleton`. | P | `src/pages/admin/Users.tsx`, `src/components/admin/AthleteOverviewCard.tsx` | C8 |
| C-7 | Dashboard: faixa de datas com dia curto e largura fixa, nomes sem corte, `count()`, "Coach" sem emoji. | P | `src/pages/admin/Dashboard.tsx` | C10, C14 |
| C-8 | Editores: sem `capitalize`, descanso com `duration()`, miniatura padrão, 2 colunas no `lg` (força); pace `mm:ss` (endurance). | M | `src/pages/admin/StrengthWorkoutEditor.tsx`, `WorkoutEditor.tsx`, `StageEditor.tsx` | C11, C12 |
| C-9 | Biblioteca: duração e distância totais no card, sem selo repetido. | P | `src/pages/admin/Workouts.tsx` | C15 |
| C-10 | Layout responsivo ao redimensionar (tablet girando). | P | `src/components/AdminLayout.tsx` | C16 |
| C-11 | Login: placeholder, "Esqueci minha senha", PT/EN, `aria-label` no olho. | P | `src/pages/admin/Login.tsx` | C18 |
| C-12 | Microcopy: maiúscula só no início, "Time" como termo único, plurais. | P | `src/translations/*.json` | C13 |

## Fase 4: PWA do atleta

| ID | Tarefa | Tam. | Arquivos | Referência |
|---|---|---|---|---|
| A-1 | Contraste no tema claro: `primary-ink` em "Hoje", no logo, na aba ativa e no card de evento; filtros da lista com um estado ativo só (navy sobre amarelo). | P | `src/pages/athlete/Home.tsx`, `CalendarView.tsx`, `WorkoutsList.tsx`, `src/components/glass/GlassTabBar.tsx`, `EventCard.tsx` | A1, A2 |
| A-2 | Sessão de força: carga prescrita como sugestão no ✓; esconder Kg em exercício por tempo; destaque do card atual fora do descanso. | P | `src/pages/athlete/StrengthWorkoutSession.tsx` | A5, A29, R2.8 |
| A-3 | Status: parcial, não feito e extra no padrão do guia (sem riscado), na lista e no detalhe; linha de lista com um elemento à direita e ícone de modalidade fixo. | P | `WorkoutsList.tsx`, `WorkoutView.tsx` | A6, A18 |
| A-4 | Adotar o `PageHeader` em todas as telas do atleta (Evento, Time, Depoimento, Conversa, detalhe, Atividade, Perfil); ← com `navigate(-1)`. | M | `EventDetail.tsx`, `TeamDetail.tsx`, `Testimonial.tsx`, `WorkoutView.tsx`, `ActivityDetail.tsx`, `Profile.tsx`, `Chat.tsx` | A7, A8, A24 |
| A-5 | Detalhe do treino: uma ação principal (sem "Marcar como feito" duplicado); um tom de amarelo; "Carga 45 kg"; chips neutros; Compartilhar e Recomeçar no ⋮; mostrar o que foi feito no treino concluído (3.1 de 18/10), reaproveitando o bloco da Atividade. | M | `src/pages/athlete/WorkoutView.tsx` | A9, A25, 3.1 |
| A-6 | Números e datas do atleta via `useFormat` (lista, perfil, feed, gráficos, tempo relativo, Atividade); alvo de natação com rótulo e unidade. | M | `WorkoutsList.tsx`, `ActivityCard.tsx`, `ProgressSummaryChart.tsx`, `StrengthProgressChart.tsx`, `src/components/timeline/relativeTime.ts`, `ActivityDetail.tsx`, `WorkoutView.tsx` | A11, A12, A22 |
| A-7 | Skeletons nas telas do atleta: Home (`TodaySkeleton`), Treinos, Calendário, Times (`ListSkeleton`), Feed, detalhe e Evento (`DetailSkeleton`). | M | `Home.tsx`, `WorkoutsList.tsx`, `CalendarView.tsx`, `Teams.tsx`, `Timeline.tsx`, `WorkoutView.tsx`, `EventDetail.tsx` | A10 |
| A-8 | Cores: tokens `sport-*` num mapa só; cards da Home neutros com o ícone da modalidade do treino; trilho do `Progress` em `bg-muted` (vale para o app todo); calendário sem laranja de interface e sem pulso infinito. | P | `src/utils/workoutSummaryStats.ts`, `WorkoutsList.tsx`, `WorkoutView.tsx`, `CalendarView.tsx`, `Home.tsx`, `src/components/ui/progress.tsx` | A17, A19, A20, A21 |
| A-9 | Toque e acessibilidade: alvos de 44 px (barra de vidro, ←, ⋮, filtros, busca, compositor, estrelas); `aria-label` traduzido; `EventCard` como `<Link>` para o detalhe; `DrawerDescription`. | M | `AthletePortalLayout.tsx`, `EventDetail.tsx`, `TeamDetail.tsx`, `WorkoutsList.tsx`, `Testimonial.tsx`, `ActivityDetail.tsx`, `EventCard.tsx`, drawers | A14, A15, A16, A30 |
| A-10 | Banner de notificações: um só, na Home, dispensável e com texto por plataforma (iPhone: Ajustes → Notificações). | P | `NotificationBanner`, `Home.tsx`, `Chat.tsx` | A13 |
| A-11 | Faixa de datas com o dia curto e largura fixa (o mesmo componente do dashboard do coach). | P | `InfiniteDateStrip.tsx` | A19, C10, 4.2 |
| A-12 | Perfil e Times: gráficos com ticks redondos e sem meta de tempo em treino por distância; Times sem busca com 1 item e com iniciais legíveis; Evento com ícones de lista e select rotulado; menu do perfil com nome e PT/EN. | M | `ProgressSummaryChart.tsx`, `StrengthProgressChart.tsx`, `Profile.tsx`, `Teams.tsx`, `TeamDetail.tsx`, `EventDetail.tsx`, `AthletePortalLayout.tsx` | A26, A27 |
| A-13 | Microcopy e textos fixos do atleta (caixa de frase, glossário, "Recomeçar", "Carga"; "Coach", "New message", "Athlete", `alt`, "Menu"). | P | `src/translations/pt.json`, `en.json`, `AthletePortalLayout.tsx`, `Home.tsx`, `Chat.tsx`, `StrengthWorkoutSession.tsx` | A23 |
| A-14 | Lista de treinos na barra de abas (3.5 de 18/10): trocar "Times" por "Treinos" na barra e levar Times para o Perfil, ou usar a aba "Mais". Decisão de produto: confirmar com o EZ Lead. | P | `AthletePortalLayout.tsx`, `GlassTabBar.tsx` | 3.5 |

## Fase 5: varreduras finais (depois das fases 1–4)

| ID | Tarefa | Tam. | Arquivos | Referência |
|---|---|---|---|---|
| V1 | Varredura de i18n: os cerca de 72 textos fixos restantes, `aria-label`s e `title`s; script `grep` no CI (ou `eslint-plugin-i18next`, que é dependência nova e ⛔ precisa do OK do EZ Lead). | G | `src/pages/**`, `src/components/**` | guia 10.1 |
| V2 | Skeletons no lugar dos spinners, tela por tela (cerca de 158 usos): manter spinner só em botão e no arranque do app. | G | `src/pages/admin/*`, `src/pages/athlete/*` | guia 8.2 |
| V3 | Nenhum `catch` só com `console.error`: `ErrorState` ou `notify.error` com ação. | M | busca por `console.error` em `src/` | guia 8.4 |
| V4 | Transições de tela no atleta (`AnimatePresence` nos layouts), durações das keyframes, `prefers-reduced-motion`. | M | `src/components/athlete/AthletePortalLayout.tsx`, `src/components/AdminLayout.tsx`, `tailwind.config.ts` | guia 6 |
| V5 | UI otimista (curtir, série, lida, reordenar) + `haptics.ts` + preferência "Vibração" no perfil. | M | `src/lib/haptics.ts` (novo), timeline, `StrengthWorkoutSession.tsx`, `Profile.tsx` | guia 9 |
| V6 | Passada de acessibilidade com axe (Playwright do EZ QA) nas 10 telas principais, nos temas claro e escuro. | M | testes do EZ QA | guia 11 |

---

## Decisões pendentes (⛔, via EZ Lead)
1. pt-BR ou pt-PT.
2. Conteúdo dos planos e do FAQ; mais depoimentos com consentimento.
3. Telefone de Portugal com endereço no Reino Unido.
4. Banner de consentimento do GA e página de privacidade.
5. Correção do autor do post em produção (escrita em produção).
6. Uso de `eslint-plugin-i18next` (dependência de dev).
