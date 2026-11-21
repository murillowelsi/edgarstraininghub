# Prestação de contas: como preencher

A página `/contas` lê só `contas.json`. Os valores vêm dos talões (`ez-project/raise-your-hands/contas/levantamento-2026-11-21.md`), exatos ao cêntimo. Campo vazio (`null` ou `""`) **não aparece em produção**; em dev aparece como marcador. Nunca pôr um número estimado.

## Campos do topo
- `angariadoGBP` (£1.000), `doacoesEmLogisticaEUR` (0 €), `metaFamilias` (7, meta do Prólogo).
- `cambioGBPparaEUR` (ex.: `1.17` = £1 → 1,17 €) e `saldoEUR`: por preencher; ficam ocultos até lá.
- `atualizadoEm`: data ISO da última revisão, ex. `"2026-11-21"`.
- Os totais (compras, apoio direto, total entregue, famílias) **são calculados**; não há campo para eles.

## `dias[]` → `cidades[]` → `itens[]`
- `diaId`: id da entrada do diário (`chegada`, `dia-2`…). Um dia pode ter várias cidades (ex.: Dia 3).
- `cidades[]`: `cidade` (nome), `familias` (quantas famílias foram apoiadas ali), `itens[]`.
- `itens[]`:
  - `tipo`: `"compra"` (supermercado) ou `"apoio-direto"` (dinheiro entregue a uma família, ex.: transferência);
  - `loja`: como no talão (`""` no apoio direto);
  - `data` (ISO) e `hora` (`"HH:MM"`, ou `""`);
  - `valorEUR`: número exato, ex. `98.56`;
  - `referencia` (só apoio direto): a referência da transferência;
  - `comprovativo`: `null` até haver a imagem tapada; depois `{ "base": "/ryh/contas/chaves-01", "w": 1500, "h": 2000 }`.

## Comprovativos: antes de publicar
1. **Tapar com uma caixa opaca** (retângulo preenchido; **nunca desfoque nem pixelização**, que podem ser revertidos): número do cartão, códigos TC/AUT/Id.Estab, nomes de funcionários, NIF, nome/morada do cliente, cartão de cliente e pontos, QR codes e códigos de barras; na transferência, nomes e Revtag. Nunca usar os originais.
2. Gerar o WebP com o script, que re-codifica a imagem e **remove EXIF/GPS**:
   `SIZES="1000 2000" scripts/ryh-fotos/encode.sh <talão-tapado.png> public/ryh/contas/<cidade>-<nn>`
   Gera `-1000.webp` (miniatura) e `-2000.webp` (visualizador, legível com zoom) e imprime `largura altura` do maior.
3. Pôr em `comprovativo` a `base` e o `w`/`h` impressos. A descrição (alt) é automática: "Talão de <loja>, <cidade>, <valor>, com dados pessoais ocultados".
4. `src/lib/ryhAccounts.test.ts` falha se um `comprovativo` apontar para um ficheiro que não existe, se os totais mudarem sem querer ou se alguma imagem em `public/ryh/` tiver EXIF ou XMP.

Este README fica fora de `public/`, para não ser publicado.
