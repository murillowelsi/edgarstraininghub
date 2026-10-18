# Treinos de corrida, bike e natação: o que falta para montar bons treinos

Data: 18/10/2026 · Escopo: editor de treino (coach), etapas, repetições, visão do atleta, pós-treino.

## Como funciona hoje

Um treino é uma lista de **etapas** (aquecimento, principal, intervalo, recuperação, desaquecimento, descanso) e **blocos de repetição** (N× um grupo de etapas). Cada etapa tem:

- **Duração:** tempo, distância, botão de volta, calorias, frequência cardíaca, potência.
- **Alvo de intensidade:**
  - **Corrida:** pace, cadência, zona de FC, FC, zona de potência, potência.
  - **Bike:** velocidade, cadência, FC, potência.
  - **Natação:** esforço, pace alvo, pace por CSS.
- **Só natação:** estilo, educativo e equipamento.
- **Nota livre** de até 200 caracteres.

## Prioridade 1: informação que hoje não dá para expressar ou sai errada

| # | Problema | Impacto |
|---|----------|---------|
| 1 | **As zonas são fixas e iguais para todos os atletas.** "Zona 2 (121-141 bpm)" e "Zona 3 (150-185 W)" estão escritas no código (`StageEditor.tsx`). O perfil do atleta não guarda FC máxima, FC de limiar, FTP, pace de limiar nem CSS. | "Z2" significa números diferentes para cada pessoa. O atleta vê "Zona 2" sem saber os próprios bpm/W, e o coach vê faixas que não são do atleta. |
| 2 | **A natação não tem campo de valor para o alvo.** "Pace alvo", "pace por CSS" e "esforço" não abrem input nenhum. Só o nome do alvo é salvo. | É impossível prescrever "100 m @ 1:45/100 m" ou "CSS +5 s". |
| 3 | **O pace é um número decimal.** 5.40 vira 5:40, mas 5.5 vira 5:50, não 5:30. Não há campo mm:ss nem unidade /100 m para natação. | Erro silencioso de pace. Por isso os coaches colocam o pace no nome do treino ("600 m 5:40 - 5:40 pace"). |
| 4 | **A natação não tem intervalo de saída nem descanso por tiro.** Não dá para fazer "10×100 @ 1:50" nem "10×100 c/ 15 s". | É o formato padrão de treino de piscina. |
| 5 | **O tamanho da piscina não existe** (25 m / 50 m / jardas). | As distâncias dependem disso, e o Garmin precisa dessa informação. |
| 6 | **Não existia campo de instruções gerais** no treino de endurance (o modelo tinha `notes`, a tela não). | ✅ Já corrigido nesta sessão: o campo está no topo do editor. |
| 7 | **O atleta não dá feedback no endurance.** Esforço (RPE) e nota para o coach só existem no treino de força. | O coach não sabe como foi o treino de corrida/bike/natação, só os números. |

## Prioridade 2: prescrição de qualidade

| # | Falta | Exemplo |
|---|-------|---------|
| 8 | Alvos relativos: % FTP, % FC de limiar, % pace de limiar, RPE | "4×8 min @ 95-100% FTP", "rodagem RPE 3" |
| 9 | Alvo em rampa (início → fim) | "Aquecimento 15 min 50→75% FTP" |
| 10 | Alvo secundário (dois alvos na mesma etapa) | "Potência Z3 **e** cadência 90-95 rpm" |
| 11 | Repetição dentro de repetição | "3× (4×400 m c/ 200 m trote) c/ 3 min entre séries" |
| 12 | Totais do treino no editor e para o atleta: tempo, distância e carga estimados | Hoje a lista mostra só "3 stages" |
| 13 | Corrida: inclinação/terreno (esteira, subida), tiros curtos (strides) | "6×20 s strides", "esteira 5%" |
| 14 | Bike: indoor/outdoor, cadência alvo por etapa já existe, falta o modo ERG/Zwift | Treino de rolo |
| 15 | Natação: educativos com nome (catch-up, 6-3-6), distâncias além dos atalhos, distância por série | "4×50 educativo catch-up" |

## Prioridade 3: fluxo e acabamento

| # | Problema |
|---|----------|
| 16 | O editor de etapa tem textos em inglês fixos no código: "Type", "Duration", "Intensity Goal", "Done", "Edit stage", nomes de zona, "times". O mesmo vale para os chips de filtro "Running/Cycling/Swimming" na lista de treinos. |
| 17 | Não há aviso de alterações não salvas no editor de endurance (o de força já tem). |
| 18 | Não há validação: dá para salvar uma etapa por distância sem a distância, ou um pace mínimo maior que o máximo. |
| 19 | Não existe exportação para relógio/app (Garmin FIT/TCX, Zwift ZWO). O atleta precisa copiar o treino na mão para o relógio. |
| 20 | Etapa nova começa como "botão de volta, sem alvo". Seria mais útil sugerir 10 min de aquecimento → principal → 10 min de desaquecimento. |
| 21 | Não há modelos ou atalhos de séries comuns ("8×400", "pirâmide", "fartlek"). |

## Feito nesta sessão (fora da auditoria)

- O editor de endurance ganhou o mesmo layout do editor de força. O título fica na barra global, Voltar e Salvar numa linha fixa, o nome em destaque e o campo de instruções no topo.
- Os ícones de modalidade agora são os mesmos em todo o app. Os ícones de corrida, bike e natação vêm sempre do mesmo pacote; o editor, os cards de etapa, a tela do atleta e o checklist de eventos usavam outros.
- Os menus "⋮" abrem ancorados no botão no desktop e como drawer de baixo no celular.

## Sugestão de ordem

1. **Perfil fisiológico do atleta + zonas calculadas** (resolve o item 1 e prepara os itens 8 e 9). O coach preenche, por atleta, FC máxima/limiar, FTP, pace de limiar e CSS. O editor mostra as faixas reais do atleta, e o atleta vê os próprios números.
2. **Pace em mm:ss e alvos de natação** (itens 2-5): input de pace, /100 m, intervalo de saída, descanso e tamanho da piscina.
3. **Feedback do atleta no endurance** (item 7): reaproveitar o resumo pós-treino com RPE e nota.
4. **Totais, validação, aviso de alterações e tradução** (itens 12, 16-18).
5. **Rampa, segundo alvo, repetição aninhada e exportação para relógio** (itens 9-11 e 19).
