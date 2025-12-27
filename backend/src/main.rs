use serde::{Deserialize, Serialize};
use serde_json::Value;
use socketioxide::{
    SocketIo,
    extract::{Data, SocketRef},
};
use tracing::info;
use tracing_subscriber::FmtSubscriber;

#[derive(Debug, Deserialize, Serialize)]
struct SignalMessage {
    room: String,
    msg_type: String,
    payload: Value,
}

async fn on_join(socket: SocketRef, Data(room): Data<String>) {
    info!("Socket {} joined room {}", socket.id, room);
    socket.join(room.clone());

    if let Err(e) = socket
        .to(room.clone())
        .emit("user_joined", &socket.id)
        .await
    {
        tracing::error!("Failed to emit user_joined to room {}: {:?}", room, e);
    }
}

async fn on_signal(socket: SocketRef, Data(data): Data<SignalMessage>) {
    if let Err(e) = socket.to(data.room.clone()).emit("signal", &data).await {
        tracing::error!("Failed to emit signal to room {}: {:?}", data.room, e);
    }
}

async fn on_disconnect(socket: SocketRef) {
    info!(ns = socket.ns(), ?socket.id, "Socket.IO disconnected");
}

async fn on_connect(socket: SocketRef, Data(_data): Data<Value>) {
    info!(ns = socket.ns(), ?socket.id, "Socket.IO connected");

    socket.on("join", on_join);
    socket.on("signal", on_signal);
    socket.on_disconnect(on_disconnect);
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Включаем логирование
    FmtSubscriber::builder().init();

    // 2. Инициализируем Socket.io
    let (layer, io) = SocketIo::new_layer();

    // Регистрация обработчика при подключении
    io.ns("/", on_connect);

    // 3. Запускаем Axum сервер
    let app = axum::Router::new().layer(layer); // Подключаем слой Socket.io

    info!("Starting server on 0.0.0.0:3000");
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    axum::serve(listener, app).await?;

    Ok(())
}
