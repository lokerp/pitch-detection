FROM rust:1.92

WORKDIR /app

# Устанавливаем утилиту для Hot Reload
RUN cargo install cargo-watch

# Копируем файлы описания проекта (для кэширования зависимостей)
COPY Cargo.toml Cargo.lock ./
# Создаем пустой src, чтобы скомпилировать зависимости
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build
RUN rm -rf src

# Копируем исходный код
COPY . .

# Запускаем в режиме наблюдения:
# -x run: при изменении запускает "cargo run"
CMD ["cargo", "watch", "--poll", "-x", "run"]