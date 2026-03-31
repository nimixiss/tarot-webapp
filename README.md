## Tarot WebApp + AI backend

### Что изменено
- WebApp для режима "2 карты" больше не использует локальный `two_card_combinations_full.json` для трактовок.
- После выбора двух карт WebApp отправляет `first_card`, `second_card`, `user_id`, `session_id` в backend endpoint `/api/readings/two-cards`.
- Backend генерирует трактовку через OpenAI API в реальном времени.
- Prompt вынесен в отдельные файлы:
  - `backend/prompts/two_card_system.txt`
  - `backend/prompts/two_card_user.txt`

### Запуск backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# заполнить OPENAI_API_KEY
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Переменные окружения
- `OPENAI_API_KEY` — обязательная
- `OPENAI_MODEL` — модель OpenAI (по умолчанию `gpt-4.1-mini`)
- `OPENAI_TIMEOUT_SECONDS` — timeout запроса к OpenAI
- `OPENAI_MAX_RETRIES` — кол-во retry
- `FORBID_DUPLICATE_CARDS` — запрет одинаковых карт
- `ALLOWED_ORIGINS` — CORS origins через запятую

### Настройка WebApp
Перед `index.html` можно задать:
```html
<script>
  window.TarotConfig = {
    readingApiUrl: "https://your-domain.com/api/readings/two-cards",
    requestTimeoutMs: 20000,
    forbidDuplicateCards: true
  };
</script>
```

### Ручное тестирование
1. Открыть WebApp.
2. Выбрать 2 карты.
3. Нажать кнопку "Узнать трактовку".
4. Проверить, что backend получил `first_card/second_card/user_id/session_id`.
5. Убедиться, что пришёл связный ответ модели.
6. Проверить ошибки:
   - выключить интернет или поставить неверный `OPENAI_API_KEY`;
   - отправить одинаковые карты (если `FORBID_DUPLICATE_CARDS=true`);
   - проверить timeout, поставив очень маленький `OPENAI_TIMEOUT_SECONDS`.
