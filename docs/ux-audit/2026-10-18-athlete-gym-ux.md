# Auditoria de UX — Portal do atleta no celular (uso na academia)

**Data:** 18/10/2026 · **Viewport:** 375×812 (iPhone) · **Conta:** atleta real (dados de teste revertidos ao final)

Fluxos testados: Home e faixa de datas, registrar sessão extra, detalhe do treino, checklist, sessão de força (preencher séries, cronômetros, recarregar no meio, cancelar, salvar), pós-treino, treino concluído/retomar/resetar, Calendário, lista de Treinos, Perfil (Atividades/Progresso), Times, Feed. Chat e publicação no feed não foram enviados (visíveis a terceiros).

Severidade: 🔴 crítico (perde dados / quebra o treino) · 🟠 alto (atrapalha muito na academia) · 🟡 médio · ⚪ polimento

---

## 1. Sessão de força — o coração do uso na academia

### 🔴 1.1 Nada é salvo durante o treino
O progresso só vai para o Firestore ao tocar **Salvar**. Testado: preenchi séries, recarreguei a página → **tudo zerado**, cronômetro voltou a 00:00.
Na academia isso acontece o tempo todo: o iOS mata o PWA em segundo plano ao abrir o Spotify/WhatsApp/câmera, a bateria acaba, o usuário fecha sem querer.
**Sugestão:** salvar rascunho a cada alteração (localStorage imediato + `updateDoc` com debounce de ~2 s), restaurar ao reabrir e mostrar "Treino em andamento — continuar?" na Home.

### 🔴 1.2 Cronômetro total para quando a tela bloqueia
O tempo é contado com `setInterval(+1s)`. No iOS, com a tela bloqueada ou o app em segundo plano, o JS congela → o tempo total fica **menor que o real** (um treino de 60 min pode registrar 10 min).
**Sugestão:** guardar `startedAt` (timestamp) e calcular `agora − startedAt − pausas`. Mesmo para os timers de série/descanso.

### 🟠 1.3 O cronômetro por série não faz sentido para musculação (o que você notou)
Hoje cada série tem um ▶ que **conta para cima** o tempo da série. Pensando no usuário na academia:
- ninguém cronometra quanto tempo levou para fazer 10 repetições;
- o que ele precisa é saber **quanto tempo falta de descanso** antes da próxima série;
- o descanso (ex.: "Descanso 45s entre séries") aparece só como texto informativo;
- são 2 botões minúsculos por série (▶ de 28 px e ↺ de 24 px) competindo com os campos e o ✓.

**Sugestão (fluxo padrão de apps como Strong/Hevy):**
1. Remover o cronômetro por série da linha.
2. Ao tocar ✓ numa série → iniciar automaticamente uma **contagem regressiva de descanso** com o valor do coach (45s).
3. Mostrar o descanso na barra flutuante de vidro (que já existe): `Descanso 0:32  [−15s] [+15s] [Pular]`, com anel de progresso.
4. Ao terminar: vibração (`navigator.vibrate`, Android) + som curto + destaque na próxima série.
5. Manter cronômetro por série só para exercícios **por tempo** (prancha, esteira) — aí sim faz sentido, e como contagem regressiva do tempo-alvo.

### 🟠 1.4 Sem carga/reps da última vez
O campo Kg mostra placeholder "0" e Reps mostra a faixa do coach ("8 to 12"). Não há referência do último treino desse exercício.
Para progressão de carga, essa é a informação mais importante da tela.
**Sugestão:** coluna/placeholder "Anterior: 40 kg × 10" vindo do último `progressData` do mesmo exercício; tocar no anterior copia os valores.

### 🟠 1.5 ✓ aceita série vazia
Marquei a série 2 sem preencher nada → foi aceita como concluída com reps/kg vazios (dados inúteis para o coach e para o histórico).
**Sugestão:** ao tocar ✓ com campos vazios, preencher com os valores do placeholder (anterior → alvo do coach). Isso também acelera muito o uso: 1 toque por série quando repete a carga.

### 🟠 1.6 Teclado errado e alvos de toque pequenos
- Campos Reps/Kg são `type="text"` **sem `inputMode`** → abre o teclado alfabético completo. Usar `inputMode="numeric"` (reps) e `inputMode="decimal"` (kg, aceita 22,5).
- Botão ✓ tem 32 px, ▶ 28 px, ↺ 24 px — abaixo dos 44 px recomendados; com mão suada/luva, erra fácil.
- Campos de 52 px de largura: o placeholder "8 to 12" aparece cortado ("8 to 1:").

### 🟠 1.7 Tela apaga durante o descanso
Sem Wake Lock: o celular bloqueia entre séries e o usuário tem que desbloquear toda vez (e aí cai no 1.2).
**Sugestão:** `navigator.wakeLock.request("screen")` enquanto a sessão está ativa (suportado no Safari 16.4+), com toggle.

### 🟠 1.8 Cancelar descarta tudo sem perguntar
O ✕ da barra flutuante sai imediatamente e perde o progresso. Um toque acidental = treino perdido.
**Sugestão:** confirmação "Descartar treino?" quando houver qualquer série marcada (ou, com o 1.1 resolvido, "Sair e continuar depois").

### 🟡 1.9 Salvar não avisa que está incompleto
Salvei com 5% feito: o diálogo "Finalizar treino?" não menciona isso e o treino vira **Concluído** (verde, ✓) mesmo com 5%.
**Sugestão:** "Você completou 1 de 21 séries. Finalizar mesmo assim?" e diferenciar visualmente concluído parcial.

### 🟡 1.10 Pós-treino vai direto para "Novo post"
Ao salvar, abre o compositor do feed em tela cheia com "Treino concluído… — 5% em 00:15 💪". Fechar leva à Home. Não há **resumo** do treino.
**Sugestão:** tela de resumo (tempo, volume total, séries, recordes pessoais, comparação com a última vez) com botão secundário "Compartilhar no feed".

### 🟡 1.11 Série concluída fica bloqueada
Ao marcar ✓ a linha fica esmaecida e os campos desabilitados. Para corrigir um typo é preciso desmarcar, editar e marcar de novo.
**Sugestão:** permitir editar campos de série concluída.

### 🟡 1.12 Exercícios de cardio/tempo usam colunas Reps/Kg
"walking on incline treadmill" mostra "1 sets × 10 minutos 3% inclinação reps" e colunas Reps/Kg. Precisa de um tipo de exercício por tempo/distância (colunas Tempo / Inclinação ou Velocidade).

### 🟡 1.13 Falta flexibilidade comum na academia
- Trocar/pular exercício (máquina ocupada) e reordenar.
- Nota por exercício ("banco 3", "dor no ombro") para o coach.
- Navegação rápida entre exercícios (lista colapsável / "próximo exercício"), em vez de rolar 7–8 cards longos com vídeo.

### ⚪ 1.14 Textos
- Cabeçalho "Série" quebra em "Séri / e".
- "3 sets × 8 to 12 reps reps" (Biceps Curl) — "reps" duplicado quando o coach escreve "reps" no campo.
- "1 sets" (singular).
- Mistura PT/EN: "sets", "reps", "to", "rest", badge "Strength", data "Sunday, Oct 18".

---

## 2. Conectividade (academia = sinal ruim)

### 🟠 2.1 Sem cache offline do Firestore
`getFirestore` sem `persistentLocalCache`. No subsolo da academia, abrir o treino pode travar no spinner, e o Salvar falha.
**Sugestão:** `initializeFirestore(app, { localCache: persistentLocalCache() })` — leituras do cache e escritas enfileiradas até voltar o sinal. Combina com o 1.1.

### 🟡 2.2 Vídeos do YouTube embutidos
Pesados em 4G fraco. Preferir GIF/thumbnail leve na sessão e vídeo só sob demanda (já é sob demanda; ok), mas considerar pré-carregar a mídia do treino do dia.

---

## 3. Detalhe do treino e listas

- 🟡 **3.1 Treino concluído não mostra o que foi feito.** O detalhe expandido mostra só o plano (Séries 3 / Reps 8 to 12); os 10 × 40 kg registrados não aparecem em lugar nenhum do treino.
- 🟡 **3.2 Treino concluído aparece riscado** (Home, Calendário, detalhe). Riscado comunica "cancelado". Usar ✓ verde sem riscar.
- 🟡 **3.3 Sessão extra cancelada fica órfã.** Registrar extra → cancelar a sessão deixa um "Full Body" pendente extra no dia; no detalhe do treino não há selo "Extra" nem opção de remover (só na Home/lista).
- 🟡 **3.4 Lista "Pendentes" acumula treinos antigos** (abril/maio) misturados com os de hoje, sem distinção de "atrasado/perdido". Ordenar por hoje primeiro ou separar "Atrasados".
- 🟡 **3.5 Lista de Treinos não está no menu inferior.** Abas: Início, Times, Feed, Calendário, Você — a lista completa de treinos fica escondida.
- ⚪ **3.6 Selo "Extra" quebra o layout** da linha na lista de Treinos (data/Extra/exercícios em 3 linhas).
- ⚪ **3.7 Cabeçalho duplicado** no detalhe do treino: top bar "Treinos" + barra com ← e nome do treino.
- ⚪ **3.8 Badges de modalidade em inglês minúsculo** na lista ("running", "strength"), datas em inglês ("Apr 21").

## 4. Home

- ⚪ **4.1** Nomes de treino truncados ("Back / Biceps and Core ( …") — 2 linhas ajudariam.
- ⚪ **4.2** Dia selecionado na faixa: "domingo" encosta nas bordas do chip.
- 🟡 **4.3** Não há destaque de "treino em andamento" / atalho "Continuar treino" (depende do 1.1).

## 5. Perfil / Progresso

- 🟡 **5.1** Atividade de força mostra "Tempo 0min" para sessões < 1 min e o progresso semanal "Força 0min / 3h 4min" — consequência do 1.2 também.
- 🟡 **5.2** Não há evolução de carga por exercício (gráfico do supino ao longo das semanas, PRs) — é a métrica que mais motiva quem treina força.
- ⚪ **5.3** "CONFORMIDADE" quebra em "CONFORMIDAD / E"; rótulos do eixo Y do gráfico aparecem cortados (".0").

## 6. O que funcionou bem

- Barra flutuante de vidro da sessão: tempo + progresso + salvar sempre à mão.
- Checklist do treino (roupa, garrafa, fone…) — ótimo para antes de sair de casa.
- Registrar sessão extra pela Home: fluxo curto, abre direto na sessão.
- Vídeo/GIF "Veja como fazer" por exercício.
- Confirmação ao resetar treino.

---

## Prioridade sugerida

1. **Autosave + restauração da sessão** (1.1) e **tempo por timestamp** (1.2) — sem isso o app perde treinos reais.
2. **Descanso automático em contagem regressiva** substituindo o cronômetro por série (1.3) + **Wake Lock** (1.7).
3. **Valores da última vez + ✓ autopreenche** (1.4, 1.5) + **teclado numérico/alvos maiores** (1.6).
4. Confirmação ao cancelar, aviso de incompleto, tela de resumo (1.8–1.10).
5. Cache offline do Firestore (2.1).
6. Demais itens médios e polimento.

---

## Rodada 2 — após autosave, descanso, valores anteriores e cards colapsáveis

**Já resolvido:** 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8 e o comprimento da página (8 exercícios: de 4.887 px para 1.214 px; só o exercício atual fica aberto, o concluído fecha e o próximo abre com rolagem automática).

### Próximos pontos da sessão de treino

- 🟠 **R2.1 Reps do coach em faixa ("8 a 12") não autopreenchem.** Ao marcar ✓ sem histórico, a série fica com reps vazio. Sugestão: usar o maior número da faixa, ou abrir um seletor rápido de reps (8 · 9 · 10 · 11 · 12) ao tocar ✓.
- 🟠 **R2.2 Steppers de carga.** Botões −2,5 / +2,5 kg ao lado do campo Kg evitam abrir o teclado entre séries.
- 🟡 **R2.3 Editar série concluída** sem desmarcar (1.11 continua aberto).
- 🟡 **R2.4 Aviso de treino incompleto + tela de resumo** (1.9 e 1.10 continuam abertos).
- 🟡 **R2.5 Exercícios por tempo** (esteira, prancha): trocar Reps/Kg por Tempo/Inclinação e um cronômetro regressivo do tempo-alvo (1.12).
- 🟡 **R2.6 Trocar / pular / reordenar exercício** e nota por exercício (1.13).
- 🟡 **R2.7 Supersets/bi-sets.** Hoje cada exercício é independente; o descanso deveria vir só depois do par.
- ⚪ **R2.8 Card "atual" sem descanso ativo** não tem destaque (o anel amarelo só aparece durante o descanso).
- ⚪ **R2.9 Resumo do card fechado** só aparece quando há carga/reps; séries marcadas vazias mostram só a prescrição.
- ⚪ **R2.10 Rascunho só no aparelho.** Sincronizar com o Firestore (sem marcar concluído) permitiria continuar em outro celular e o coach acompanhar ao vivo.
