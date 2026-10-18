# Auditoria — Portal do coach (desktop + mobile)

**Data:** 18/10/2026 · **Como:** teste no navegador logado como coach (1440×900, ~800px e 375×812) + revisão de código das telas `src/pages/admin`, `src/components/workout` e serviços.
**Dados de teste criados:** treinos `[TESTE] Força A - Murillo` e `[TESTE] Corrida 4x intervalado`, atribuídos ao atleta Murillo Welsi em 19/10 e 20/10.

Severidade: 🔴 crítico (perde dados / fluxo quebrado) · 🟠 alto · 🟡 médio · ⚪ baixo
✅ = reproduzido no navegador · 📄 = confirmado no código

---

## 1. Criar treino (fluxo principal)

### 🔴 1.1 Editar séries/reps/descanso perde o valor se fechar o drawer ✅
No editor de força, os campos Sets/Reps/Rest só salvam no `onBlur`. Digitei 4 séries e fechei com Esc → continuou "3 sets". No celular, tocar fora do drawer tem o mesmo efeito. O coach acha que alterou e não alterou.
**Correção:** salvar a cada digitação (estado local + `onUpdate` no `onChange`) e, no desktop, editar inline no próprio card.

### 🔴 1.2 Editor de endurance pode sobrescrever um treino com um em branco 📄
`WorkoutEditor.tsx:546-572` — se o carregamento falhar, a tela mostra o formulário padrão vazio com "Salvar" habilitado em modo edição → `updateWorkout` grava por cima do treino real.
**Correção:** bloquear o salvar (ou sair da tela) quando o carregamento falha.

### 🔴 1.3 "Editar treino" no Calendário abre treino de força no editor de corrida 📄
`Calendar.tsx:408` navega sempre para `/admin/workouts/:id/edit`. A lista de Treinos acerta a rota; o Calendário não.
**Correção:** helper único `getWorkoutEditPath(workout)` usado em todos os lugares.

### 🟠 1.4 Sem validação antes de salvar ✅📄
- Força: "Salvar" fica desabilitado sem nome, **sem dizer o que falta** ✅; aceita 0 exercícios e reps vazias (mostra "10" mas salva vazio).
- Endurance: aceita 0 etapas, bloco de repetição vazio, duração 0/negativa, intensidade mín > máx.
- **Correção:** `validateWorkout()` compartilhado com mensagens inline no campo.

### 🟠 1.5 Nome do treino vem preenchido como "Treino de Corrida" ✅
É valor, não placeholder — por isso a biblioteca tem dezenas de "Running Workout" iguais. **Correção:** campo vazio com placeholder e obrigatório.

### 🟠 1.6 Nenhum aviso de alterações não salvas 📄
Voltar (seta) ou trocar de página descarta tudo nos dois editores. **Correção:** `useBlocker` + `beforeunload` quando houver mudanças.

### 🟠 1.7 Os dois editores são completamente diferentes ✅
| | Força | Corrida/Bike/Natação |
|---|---|---|
| Layout | 2 colunas (treino + biblioteca) | 1 coluna |
| Notas do treino | sim | **não existe** (mas o atleta vê `notes`) |
| Adicionar item | botão "+" em cada exercício | só um "+" flutuante no canto (padrão mobile) |
| Editar item | drawer de baixo (mobile) | painel lateral |
**Correção:** mesmo esqueleto (cabeçalho com nome/notas, lista, painel de edição lateral no desktop / drawer no mobile, barra de ações fixa).

### 🟡 1.8 Detalhes do editor de endurance ✅📄
- Tempo digitado em **minutos decimais** ("0.00") — 1min30 vira "1.5". Pace também decimal ("5.30" ambíguo). Usar entrada mm:ss.
- "Repetir" aparece como tipo de etapa simples e dentro de repetições (repetição aninhada que a lista não renderiza).
- Contador de repetições força 1 ao apagar o campo (digitar "5" vira "15").
- Natação: distância "Custom" não mostra o campo numérico → etapa sem distância.
- Zonas fixas na tela ("Zona 2 (121-141 bpm)", "Zona 3 (150-185 W)") iguais para todo atleta — mostrar só o número da zona ou usar as zonas do atleta.
- "Pressione o Botão de Volta" no editor e "Pressionar Botão Lap" na lista: mesmo conceito, dois nomes.

### 🟡 1.9 Editor de força ✅📄
- Sem campo de **carga sugerida, nota por exercício** (o tipo já tem `weight`/`notes`) nem exercício por tempo.
- Ícone de arrastar é decorativo: **não dá para reordenar**.
- Na largura ~800px (notebook pequeno/tablet) a coluna do treino fica estreita e corta o nome ("Agach…").
- Toast duplicado ao adicionar exercício. Excluir exercício/etapa sem confirmar ou desfazer.
- GIF do exercício não é salvo no treino (`workoutsService.ts:89`) — some se o exercício for apagado da biblioteca.

### 🟡 1.10 Depois de criar, não há "Atribuir agora" ✅
Salvar volta para a lista; para atribuir é preciso achar o treino e abrir o menu. **Correção:** toast/sheet "Treino criado — Atribuir a atletas".

---

## 2. Atribuir treino (fluxo principal)

### 🔴 2.1 Excluir um treino apaga todas as atribuições, inclusive o histórico concluído 📄
`Workouts.tsx:97` → `deleteAssignmentsByWorkout`. A confirmação só diz "Tem certeza que deseja excluir X?". Atletas perdem séries, cargas, RPE e notas.
**Correção:** mostrar "N atribuições (M concluídas) serão removidas" ou arquivar o treino e manter o histórico.

### 🟠 2.2 Toast de sucesso mentiroso em duplicatas ✅📄
Atribuir o mesmo treino/atleta/dia é ignorado em silêncio, mas o toast diz "Successfully assigned … to 1 athlete". **Correção:** retornar `{criados, ignorados}` → "2 atribuídos, 1 já estava agendado".

### 🟠 2.3 Só uma data por vez; sem recorrência ✅
Não dá para escolher vários dias, repetir semanal (ex.: seg/qua/sex por 4 semanas) nem copiar a semana. É o que mais toma tempo do coach.
**Correção:** seletor de vários dias no calendário do modal + "repetir por N semanas".

### 🟠 2.4 Não dá para remarcar ou ajustar uma atribuição ✅
O detalhe no Calendário só tem "Excluir Atribuição" e "Editar Treino". Sem mudar data (nem arrastar no calendário), sem ajuste por atleta. **"Editar Treino" altera o treino da biblioteca para todos os atletas** sem avisar.
**Correção:** "Mudar data" (atualiza `scheduledDay`), arrastar no calendário e "editar só para este atleta" (cópia).

### 🟠 2.5 Atribuir pela página do atleta: sempre hoje e com 1 toque 📄
`AthleteHistory.tsx:256` passa a data de hoje e o diálogo cria a atribuição ao tocar no treino, sem escolher data nem confirmar.

### 🟠 2.6 Modais de atribuição 100% em inglês ✅
"Assign Workout", "Athletes / Team", "Pick a date", "Select All", "Cancel", "Select Workout Type", "Choose Workout", "View all workouts", toasts "Workout assigned…", data "October 19th, 2026". O calendário do seletor também sem locale e começando no domingo (o resto do app começa na segunda).

### 🟡 2.7 Lista de atletas sem busca ✅
Caixa fixa de 200px com rolagem e todos os e-mails. Com 30+ alunos fica impraticável. **Correção:** busca, avatares, filtro por time, mostrar quem já tem treino no dia.

### 🟡 2.8 Botão "+" do dia só aparece no hover ✅📄
`Calendar.tsx:133` — invisível em tablet touch e pequeno (24px); dias vazios não são clicáveis.

---

## 3. Acompanhar o atleta

### 🔴 3.1 Abrir uma atividade concluída dá 404 ✅
Os cards em "Atividades" do atleta levam para `/admin/athletes/:id/activity/:aid`, rota que não existe. O coach não consegue ver nenhuma sessão.

### 🟠 3.2 O coach não vê o que o atleta registrou ✅📄
O detalhe da atribuição mostra só atleta/data/notas do treino. Não aparecem **séries, cargas, recordes, aquecimento, esforço (RPE) nem a nota para o coach** que o atleta escreve no fim do treino; nem "não fiz" (skipped).
Para treino de força mostra "0 stages · strength" ✅.
**Correção:** detalhe da sessão com resultado série a série, RPE, nota, recordes; badge de RPE/nota no calendário.

### 🟡 3.3 Números de conformidade diferentes entre telas 📄
Página do atleta exclui sessões extras; Dashboard e Usuários contam como planejadas. "Conclusão geral" do Dashboard inclui treinos futuros (por isso ~40%). Ninguém trata "não fiz".

### 🟡 3.4 Sessões extras quase invisíveis 📄
Selo "Extra" só no tooltip/lista do Calendário (fixo em inglês); não aparece no Dashboard nem na página do atleta.

---

## 4. Consistência geral

### 🟠 4.1 Mistura de português e inglês em praticamente todas as telas ✅
Além dos modais de atribuição e editores: filtros "All/Running/Cycling/Swimming/Strength", selos "running/cycling", "54 workouts", "+1 more", "Done", "Actions" (Artigos), página 404, editor de etapas ("Edit stage", "DURATION", "INTENSITY GOAL", "Done", "Add Stage", "Add Repetition", "Repeat 4x", "2 stages"), editor de força ("Sets/Reps/Rest", "3 sets × 10 reps · 60s rest", abas "Details/Exercises/Library/Browse").

### 🟡 4.2 Datas sem locale e em formatos diferentes ✅📄
"Oct 18", "Monday, 19 Oct", "October 20th, 2026", "Jan 31, 2026", "Oct 2026". **Correção:** um `formatDate(date, "curto" | "longo")` com `ptBR`.

### 🟡 4.3 Menus de ação abrem como drawer de baixo até no desktop ✅
Lista de treinos, editor e time usam Drawer; outras telas usam modal/dropdown. **Correção:** dropdown no desktop, drawer no mobile (componente único). "Excluir" no menu de treinos não está em vermelho.

### 🟡 4.4 Mobile do coach ✅📄
- Calendário mobile sem filtro de atleta e sem navegar datas (janela fixa de 60 dias).
- Times, Artigos e Depoimentos não estão no menu inferior; configurações/sair só pelo avatar do Dashboard.

### 🟡 4.5 Times 📄
No desktop, link de convite/QR só existe no botão flutuante mobile. Não há "atribuir treino ao time" nem lista dos treinos do time; ao remover membro, os treinos futuros do time continuam.

### ⚪ 4.6 Código morto / telas soltas 📄
`Subscriptions.tsx` (1.384 linhas, sem rota), `UserForm.tsx` (rota sem link, duplica os modais de Usuários), `StageCard.tsx`, `removeDuplicateAssignments`.

### ⚪ 4.7 Outros 📄
- Erros só no console (carregar treino de força, foto do perfil, iniciar chat).
- Botões só com ícone sem `aria-label`; alvos pequenos (calendário, voltar).
- Sem Ctrl/Cmd+S nos editores.
- Página do atleta fica carregando para sempre com id inválido.
- Dashboard não atualiza depois de atribuir pelo atalho.

---

## 5. Segurança e performance (para planejar)

- `firestore.rules`: qualquer usuário logado lê todos os documentos de `users` (atletas conseguem listar e-mails dos outros).
- Atleta pode alterar qualquer campo da própria atribuição (`workoutId`, `scheduledDay`, `assignedBy`) — restringir com `affectedKeys().hasOnly([...])`.
- Admin pode rebaixar o próprio papel; excluir usuário não remove a conta de login nem as atribuições.
- Dashboard/Usuários/Calendário carregam **todas** as atribuições + 1 leitura por atleta; atribuir faz 1 consulta + 1 escrita por atleta em sequência.

---

## Prioridade sugerida

1. **Não perder dados:** 1.1 (drawer de séries), 1.2 (sobrescrever em branco), 2.1 (excluir apaga histórico), 1.3 (editor errado), 3.1 (404).
2. **Atribuir bem:** 2.3 (várias datas/recorrência), 2.4 (mudar data, editar só para o atleta), 2.2 (toast de duplicata), 2.7 (busca de atletas), 1.10 (atribuir após criar), 2.5.
3. **Ver o resultado do atleta:** 3.2 (séries, cargas, RPE, nota).
4. **Editores consistentes e validados:** 1.4, 1.5, 1.6, 1.7, 1.8, 1.9.
5. **Português em tudo + datas** (4.1, 4.2) — dá para fazer de uma vez.
6. Mobile, times, limpeza e regras de segurança.
