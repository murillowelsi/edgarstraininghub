# Auditoria: site público (acabamento, conversão e acessibilidade)

**Data:** 12/11/2026 · **Quem:** EZ Design · **Como:** `vite` local (commit `64cb031`), sem login, 1440 × 900, 1680 × 849 e 375 × 812, temas claro e escuro, pt e en, mais a leitura do código.
**Rotas:** `/`, `/about`, `/blog`, `/blog/:slug`, `/contact`, `/join/:token`. Do `/join`, testei só o token inválido no navegador. O formulário de convite válido foi revisto no código.
**Regras de referência:** `docs/design/design-system.md`. **Tarefas:** `docs/design/backlog-frontend.md` (itens `S-*`).

Severidade: 🔴 crítico (dado exposto, conteúdo ilegível, bloqueio de acessibilidade) · 🟠 alto (conversão, idioma, confiança) · 🟡 médio · ⚪ polimento
Os depoimentos e fotos do site mostram pessoas reais. Esta auditoria não reproduz os nomes delas.

---

## 🔴 Crítico

| # | Problema | Rota | Arquivo | Correção |
|---|---|---|---|---|
| 1 | **O e-mail pessoal do autor aparece no artigo**, no lugar do nome (o campo `authorName` do post guarda um e-mail). | `/blog/:slug` | `src/pages/BlogArticlePage.tsx:164-167`; gravação em `src/pages/admin/PostForm.tsx` | Na interface: não renderizar `authorName` com "@"; mostrar o nome público do coach. No formulário: salvar o nome de exibição. No dado: corrigir o post existente (**escrita em produção: precisa de aprovação do usuário**, via EZ Backend). |
| 2 | **O rodapé fica invisível no tema claro:** `bg-card` (branco) com `text-white` e ícones `text-gray-300`. | todas | `src/components/Footer.tsx:43-44,49` | Rodapé sempre navy: `bg-surface-inverse text-white` (token novo, seção 1.2 do guia). |
| 3 | **Texto branco sobre amarelo (≈ 1,9:1):** selo "MAIS POPULAR", botão do plano popular, título, texto e selos do card "Ready to Transform Your Fitness?". | `/` | `src/components/PricingSection.tsx:58,90`; `src/components/ServicesSection.tsx:82-85` (e os selos do mesmo card) | `text-primary-foreground` (navy, ≈ 9:1). Remover `text-white` de todo `bg-primary`. |
| 4 | **Texto amarelo sobre branco no tema claro (≈ 1,9:1):** subtítulo e parágrafo de destaque do "Sobre", horários do Contato, palavras em destaque dos títulos de seção, cargo do depoimento. | `/about`, `/contact`, `/` | `src/pages/About.tsx`, `src/pages/Contact.tsx`, títulos de seção em `src/components/*Section.tsx` | `text-primary-ink` no tema claro, ou o padrão "marca-texto" (guia 1.4). |
| 5 | **Zoom bloqueado** (`maximum-scale=1.0, user-scalable=no`). Falha WCAG 1.4.4. | todas | `index.html:6` | Remover os dois. O zoom do iOS em inputs já é evitado pela fonte de 16 px (`src/index.css`). |

## 🟠 Alto

| # | Problema | Rota | Arquivo | Correção |
|---|---|---|---|---|
| 6 | **"Admin login" no menu principal** (ícone de entrar, `aria-label` fixo em inglês; no mobile, "Login" no fim do menu). Para o visitante, parece uma área restrita; para o atleta, o nome está errado. | todas | `src/components/Navbar.tsx:81-87,152-160` | Tirar do cabeçalho. No rodapé, colocar o link "Área do atleta" / "Athlete login" → `/app` (já redireciona quem está logado). Textos nas traduções. |
| 7 | **"MAIS POPULAR" e "Preço a consultar" fixos em português** no site em inglês. | `/` | `src/components/PricingSection.tsx:59,68` | Chaves `pricing.popular` e `pricing.onRequest`. |
| 8 | **O selo do plano popular quebra em 2 linhas e cobre o título no mobile.** O `scale-105` deixa o card mais largo que os outros na coluna única. | `/` (mobile) | `src/components/PricingSection.tsx:46-61` | `whitespace-nowrap`, selo em `text-overline`, `pt-10` no card, `md:scale-105` (só com 3 colunas). |
| 9 | **Os preços dizem pouco:** sem período (£40 por quê? mês?), os planos Básico e Standard só diferem em "avaliação inicial", listas com tamanhos diferentes, os 3 botões iguais levam ao `/contact` sem dizer o plano, sem FAQ. | `/` | `src/components/PricingSection.tsx`, `src/translations/*.json` | Período ("/mês"), uma linha de "para quem é", **a mesma lista de itens nos 3 planos** com ✓/— (dá para comparar), CTA "Quero o Standard" abrindo o WhatsApp com o plano no texto, e um FAQ curto (4–6 perguntas) abaixo. **O conteúdo depende do usuário** (períodos, diferenças, fidelidade, perguntas). |
| 10 | **O vídeo do YouTube falha** (proxy allorigins com bloqueio de CORS). O estado de erro é uma caixa 16:9 vazia, de cerca de 500 px de altura. | `/` | `src/components/YouTubeSection.tsx` | O EZ Backend troca o proxy por uma função. Na interface: carregamento "lite" (miniatura + botão play; o iframe só entra no clique, o que é mais leve) e, no erro, um card compacto do canal ("Ver canal no YouTube") no lugar da caixa vazia. |
| 11 | **O artigo tem textos fixos em inglês no modo PT:** "Back to Blog" (2×), "min read", "January 31, 2026" (sem locale), o bloco "Want to Take Your Training to the Next Level?" e "Schedule a Consultation". A lista do blog usa "31 jan 2026", e o artigo, "January 31, 2026". | `/blog/:slug` | `src/pages/BlogArticlePage.tsx:99,139,161,172,180-195` | Traduções + `useFormat().date(d, "medium")` nos dois lugares. |
| 12 | **Artigos só em inglês aparecem no PT sem aviso.** | `/blog`, `/blog/:slug` | `src/pages/BlogPage.tsx`, `BlogArticlePage.tsx` | Campo `language` no post (EZ Backend) e selo "EN" no card e no artigo. Depois, uma versão por idioma. |
| 13 | **Só 1 depoimento, em português no site em inglês,** num carrossel que mostra 1 por vez com setas de 40 px. Pouca prova social, e o carrossel esconde o que há. | `/` | `src/components/TestimonialsSection.tsx` | Grade de 3 colunas no desktop e `scroll-snap` horizontal no mobile, com ≥ 3 depoimentos visíveis e selo de idioma. Somar provas com números (PRs e provas dos alunos, **com consentimento**). **Conteúdo depende do usuário.** |
| 14 | **Sem SEO nem imagem de compartilhamento:** o mesmo `<title>` em todas as rotas, sem `og:image`, sem `twitter:card`, sem `canonical`, sem sitemap. O `react-helmet` está instalado e não é usado. | todas | `index.html:13-21`, `src/pages/*.tsx`, `public/` | Componente `Seo` (title, description, og:*, twitter:card, canonical) por rota; artigos usam a capa como `og:image`; `og-default` de 1200 × 630 (arte a cargo do EZ Design); `public/sitemap.xml` + a linha no `robots.txt`. |
| 15 | **"Start Now" abre o WhatsApp sem avisar.** O visitante espera um formulário ou uma página. | `/` | `src/components/HeroSection.tsx:56` | Rótulo "Falar no WhatsApp" / "Chat on WhatsApp" com ícone. O botão secundário "Ver planos" rola até os preços. |
| 16 | **No mobile, o hero não tem a foto do coach e deixa cerca de 200 px vazios** abaixo dos botões (`min-h-[calc(100vh-80px)]`). | `/` (mobile) | `src/components/HeroSection.tsx:22,69` | Retrato recortado acima do título no mobile, altura pelo conteúdo e uma linha de prova ("Ironman · maratona sub-3 h · 50+ atletas", dados do "Sobre"). |
| 17 | **Convite inválido é um beco sem saída:** título em vermelho escuro sobre navy (contraste ≈ 2:1), sem logo e sem nenhuma ação. Os estados "só para atletas" e "já é membro" também não têm saída. | `/join/:token` | `src/pages/JoinTeam.tsx:139-160` | `ErrorState` com logo, "Peça um novo link ao seu coach" e [Ir para o site] [Entrar]. Título em `text-destructive-ink`. |
| 18 | **O formulário de convite não tem `autocomplete`** (nome, e-mail, senha), nem "mostrar senha", nem seletor de idioma, nem logo. O placeholder `you@example.com` é fixo. | `/join/:token` | `src/pages/JoinTeam.tsx:186-270` | `autoComplete="name|email|new-password|current-password"`, botão "Mostrar" de 44 px, logo "EZ" no topo, seletor PT/EN e placeholder traduzido. |
| 19 | **Google Analytics carrega sem consentimento** (há chamadas para `google-analytics.com/g/collect`). O site atende o Reino Unido e a UE, onde o UK GDPR/PECR pede consentimento para cookies de análise. Também não há política de privacidade. | todas | `index.html` (script do GA) | **Decisão do usuário** (é questão legal). Proposta: banner de consentimento simples ("Aceitar" / "Recusar"), GA só depois do aceite, e uma página de privacidade linkada no rodapé. |

## 🟡 Médio

| # | Problema | Rota | Arquivo | Correção |
|---|---|---|---|---|
| 20 | **Espaço exagerado entre seções** (~200 px no desktop: `.section` + `.section-modern` + `mb-16` no título). | `/` | `src/index.css` (`.section`, `.section-modern`), `*Section.tsx` | `.section` = `py-12 md:py-20`; título a 40–48 px do conteúdo. |
| 21 | **Todos os títulos de seção seguem a mesma fórmula** "Palavra **Amarela**" + barra laranja. A repetição perde força, e o laranja ao lado do amarelo disputa atenção. | todas | `*Section.tsx`, `About.tsx`, `Contact.tsx`, `BlogPage.tsx` | `text-overline` em `primary-ink` ("PLANOS") + título navy ou branco em `text-display-md`. Destaque amarelo em uma palavra só no hero. Remover a barra laranja. |
| 22 | O card "Ready to Transform" deixa **~200 px vazios abaixo do botão** (a foto define a altura). | `/` | `src/components/ServicesSection.tsx` | `items-center` no texto e foto com `aspect-[4/3]` + `object-cover`. |
| 23 | **Português misturado de Portugal e do Brasil** ("desporto", "levou-me" × "você", "seus objetivos"). | todas | `src/translations/pt.json` | **Decisão do usuário:** pt-BR ou pt-PT. Depois, uma revisão do arquivo. |
| 24 | **Números e moeda no formato inglês em PT:** "3.8 km", "21.1 km", "40£". | `/about`, `/` | `src/translations/pt.json`, `About.tsx`, `PricingSection.tsx` | Números fora das traduções, via `useFormat().distance/currency` → "3,8 km", "£ 40". |
| 25 | **"Sobre":** o título "My Achievements" aparece 2 vezes; o texto alterna entre 1ª e 3ª pessoa; emojis (🏊🏻🚴🏻🏃🏻) servem de ícone. | `/about` | `src/pages/About.tsx` | Um título só; texto em 1ª pessoa; ícones de `sport-icons`. |
| 26 | **Alvos de 40 px** (idioma, tema, menu, redes sociais, setas do carrossel). | todas | `Navbar.tsx`, `Footer.tsx` (`socialLink`), `TestimonialsSection.tsx` | 44 px (guia 8.8). |
| 27 | **Idioma por bandeira, sem texto,** e o idioma inicial é sempre inglês (não lê o idioma do navegador). | todas | `src/components/LanguageSwitcher.tsx`, `src/contexts/LanguageContext.tsx:24-27` | Segmentado "PT \| EN" e detecção por `navigator.language` (guia 10.1). |
| 28 | **Contato:** horário sem fuso ("6:00 - 20:00": de onde?); "Bournemouth, England" sem tradução; telefone +351 com endereço no Reino Unido (confirmar se é proposital); dois CTAs (Iniciar conversa, Agendar avaliação) que fazem a mesma coisa. | `/contact` | `src/pages/Contact.tsx`, traduções | "(horário do Reino Unido)", tradução da cidade e um CTA principal. Telefone e local: **confirmar com o usuário**. |
| 29 | **Rodapé mínimo:** sem navegação, sem acesso à área do atleta, sem link de privacidade. | todas | `src/components/Footer.tsx` | Duas colunas no desktop: links (Início, Sobre, Blog, Contato, Área do atleta, Privacidade) + redes. |
| 30 | **Link com botão dentro** ("Schedule a Consultation"): o leitor de tela anuncia dois controles. | `/blog/:slug` | `src/pages/BlogArticlePage.tsx:~190` | `<Button asChild><Link/></Button>`. |

## ⚪ Polimento

| # | Problema | Arquivo | Correção |
|---|---|---|---|
| 31 | As bolhas do hero animam sem parar e ignoram o movimento reduzido. | `HeroSection.tsx:29-33` | `motion-safe:animate-float`. |
| 32 | `aria-label`s fixos em inglês ("Toggle theme", "Open menu", "Previous/Next testimonial"). | `Navbar.tsx`, `TestimonialsSection.tsx` | Traduções. |
| 33 | `.card-modern:hover` e `.btn-primary:hover` com `scale-105`. | `src/index.css` | Guia 5 (hover sem scale). |
| 34 | `/blog` com um artigo só: a grade fica com um card sozinho e muito vazio. | `BlogPage.tsx` | Com menos de 3 posts, usar um layout de destaque (card largo) e um CTA de contato abaixo. |

---

## O que funcionou bem
- No tema escuro, a identidade (navy + amarelo + Montserrat) já passa uma imagem "pro". O problema está no tema claro e nos detalhes.
- O erro do vídeo já tem "Ver no YouTube" e "Tentar de novo": só falta o tamanho certo.
- Menu mobile em sheet com fechar de 40 px já ampliado, `lang` atualizado no `<html>` e `alt` em todas as imagens.
- Não há rolagem horizontal em 375 px em nenhuma rota.

## Perguntas para o usuário (via EZ Lead)
1. Português do Brasil ou de Portugal?
2. Planos: período de cobrança, o que diferencia cada plano, fidelidade, e 4–6 perguntas do FAQ.
3. Há mais depoimentos ou resultados de alunos com permissão para publicar?
4. Telefone de Portugal com endereço no Reino Unido: é assim mesmo?
5. Google Analytics: aceita o banner de consentimento e uma página de privacidade?
