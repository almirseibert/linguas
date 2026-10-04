# Créditos e licenças de terceiros

## Tatoeba: frases e gravações de falantes nativos

- **Fonte:** https://tatoeba.org, importada por `npm run import:sentences` (API pública v1).
- **Textos das frases:** CC BY 2.0 FR. Cada frase guarda o `tatoeba_id`, e o app linka para `https://tatoeba.org/sentences/show/{id}`.
- **Gravações:** cada áudio tem licença própria, escolhida pelo autor. O importador só aceita áudios com licença de reuso explícita e descarta os que não têm licença. Autor, licença e link de atribuição ficam na tabela `sentences` e aparecem no app sempre que o áudio toca.
- **Espanhol:** só entram áudios de quem declara no perfil do Tatoeba a variante da Espanha.

**Importante:** boa parte das gravações (por exemplo, dos autores `CK` e `arh`) é **CC BY-NC-ND 3.0**:

- **Uso:** só não comercial.
- **Alterações:** sem modificar o áudio. Tocar mais devagar no player não altera o arquivo.

Isso é adequado ao uso familiar. **Se o app virar produto pago, essas gravações precisam ser removidas ou licenciadas.** Para filtrá-las, use a coluna `audio_license`.

## FrequencyWords: listas de frequência

- **Fonte:** https://github.com/hermitdave/FrequencyWords, de Hermit Dave, a partir do OpenSubtitles 2018.
- **Licença:** CC BY-SA 4.0, importada por `npm run import:words`.

## ts-fsrs: algoritmo de repetição espaçada

- **Fonte:** https://github.com/open-spaced-repetition/ts-fsrs.
- **Licença:** MIT.

## Conteúdo próprio

As fases, as frases de sobrevivência e os textos de leitura em `apps/api/src/db/content.ts` foram escritos para este projeto.
