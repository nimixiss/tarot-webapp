# Mystic Tarot — Telegram Mini App

Public static frontend for **@mystictarotcards_bot**, hosted on GitHub Pages at:
https://nimixiss.github.io/tarot-webapp/

## Current interface

The Mini App provides one consistent user experience:

1. Choose **one, two, or three** cards.
2. Enter an optional question (up to 350 characters).
3. For three cards choose a layout: situation / relationships / decision.
4. Reveal 1, 2, or 3 distinct cards from a shuffled 78-card deck.
5. Submit the selected cards using Telegram `WebApp.sendData`, which returns a message to the private bot.

The server-side code and OpenAI API key are in the separate **private** `nimixiss/mystic-tarot-bot` repository and Render Environment. The HTML **must not** contain credentials or call OpenAI directly.

### Telegram payload

```json
{
  "v": 2,
  "mode": "three",
  "layout": "standard",
  "question": "На что обратить внимание в работе?",
  "cards": ["Паж Кубков", "Двойка Жезлов", "Шестёрка Жезлов"]
}
```

This App must be opened using the Telegram **reply keyboard** `web_app` button for `sendData` to reach the bot. Opening the raw GitHub Pages URL in an ordinary browser displays the UI but cannot submit the reading.

### Order of deployment

1. Deploy the compatible private bot backend that supports the `mode` and `cards` array. It is backward compatible with the old 2-card `card1`/`card2` payload.
2. Merge this frontend update only after the bot backend is working. GitHub Pages then publishes the new UI.
3. Test one/two/three-card selections in Telegram. Enable server-side AI for one/three cards via Render `AI_ALL_READINGS_ENABLED=true` after verification.

## Testing

From the root folder:

```bash
node scripts/check-miniapp.cjs
```

GitHub Actions checks JavaScript syntax, all 78 cards, image assets, and the absence of secret-key references.

## Roadmap

Future work includes results in the Mini App, optional saved history, Telegram-authenticated event analytics for intermediate UI actions, consistent card-of-the-day experience, and Stars monetization.

### Legacy backend directory

The older `backend/` folder is **not** used by the new flow. The active OpenAI integration runs only in the private Telegram bot worker. Do not place any `OPENAI_API_KEY` in browser code.
