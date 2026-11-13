# Prestação de contas: como preencher

A página `/contas` lê só `contas.json`. Campo vazio (`null`, `""` ou `[]`) **não aparece em produção**; em dev aparece como marcador. Nunca pôr um número estimado.

## Campos
- `angariadoGBP`, `doacoesEmLogisticaEUR`, `metaFamilias`: já preenchidos (£1.000, 0 €, 7 famílias da meta do Prólogo).
- `totalGastoAlimentosEUR`, `cambioGBPparaEUR` (ex.: `1.17` = £1 → 1,17 €), `saldoEUR`, `familiasAtendidas`: por preencher.
- `atualizadoEm`: data ISO, por exemplo `"2026-11-14"`.
- `dias[]`: um item por dia do diário, com:
  - `diaId` = id da entrada (`chegada`, `dia-2`…);
  - `lugar` em PT/EN;
  - `numCompras`;
  - `valoresEUR`: um valor por compra, ou um só total quando a soma cobre várias, como `[259]` com `numCompras: 2`. Sem valor, o dia mostra só "Compras citadas no diário".
  - `faturas`: ver abaixo. Sem fotos, a galeria do dia não aparece.

## Fotos das faturas (RC-28): antes de publicar
1. **Tapar com uma caixa opaca** (retângulo preenchido) o NIF, os nomes, as moradas e os números de cartão. **Não usar desfoque nem pixelização**: podem ser revertidos.
2. Gerar o WebP com o script, que re-codifica a imagem e **remove EXIF/GPS** (verificado):
   `scripts/ryh-fotos/encode.sh <foto-tapada> public/ryh/contas/<diaId>/01`
   Isto gera `01-640.webp` e `01-1280.webp`, no mesmo formato das fotos do diário, e imprime `largura altura`.
3. Acrescentar em `dias[].faturas`, com `w`/`h` iguais aos impressos:
   `{ "base": "/ryh/contas/dia-2/01", "w": 960, "h": 1280, "valorEUR": 66 }`
   O `alt` é opcional. Por omissão fica "Fatura de Dia 2, 66 €, com dados pessoais ocultados"; cada foto mostra a legenda "Dados pessoais ocultados".
4. O teste `src/lib/ryhAccounts.test.ts` falha se alguma imagem em `public/ryh/` tiver EXIF ou XMP.

As fotos ficam em `public/ryh/contas/<diaId>/`. Este README fica fora de `public/`, para não ser publicado.
