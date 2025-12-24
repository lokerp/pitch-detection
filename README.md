# Karaoke Pitch Detector

Проект детектора высоты тона (караоке) с разделением на backend (Rust + Axum) и frontend (Vue 3 + Vite).

## Запуск проекта

Проект полностью докеризирован. Для запуска используйте Docker Compose.

### Первый запуск / После изменения зависимостей

Если вы изменили `package.json` или `Cargo.toml`, или запускаете проект в первый раз, используйте флаг `-V` (пересоздание томов) и `--build`:

```bash
docker-compose up --build -V
```

### Обычный запуск

Для простого перезапуска (без обновления зависимостей):

```bash
docker-compose up
```

## Разработка

*   **Frontend**: Доступен по адресу [http://localhost:8080](http://localhost:8080).
    *   Работает Hot Reload (изменения в папке `frontend` сразу видны в браузере).
*   **Backend**: API доступен внутри сети Docker (проксируется Nginx).
    *   Работает `cargo-watch` (изменения в папке `backend` вызывают перекомпиляцию).

## Структура

*   `backend/` - Серверная часть на Rust.
*   `frontend/` - Клиентская часть на Vue 3.
*   `nginx.conf` - Конфигурация Nginx (Gateway).
*   `docker-compose.yml` - Описание сервисов.
