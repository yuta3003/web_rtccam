use actix::*;
use actix_web::{web, App, HttpRequest, HttpResponse, HttpServer};
use actix_web_actors::ws;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug)]
struct Message {
    from: String,
    to: String,
    sdp: Option<Value>,
    candidate: Option<Value>,
}

struct WebSocketSession {
    id: String,
    server: Arc<RwLock<SignalingServer>>,
}

impl Actor for WebSocketSession {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        println!("✅ WebSocket 接続確立: {}", self.id);

        let addr = ctx.address();
        let mut server = self.server.write().unwrap();
        server.sessions.insert(self.id.clone(), addr);

        ctx.text(format!(r#"{{"type": "welcome", "id": "{}"}}"#, self.id));
    }

    fn stopping(&mut self, _: &mut Self::Context) -> actix::Running {
        println!("❌ WebSocket 切断: {}", self.id);

        let mut server = self.server.write().unwrap();
        server.sessions.remove(&self.id);

        actix::Running::Stop
    }
}

#[derive(Message)]
#[rtype(result = "()")]
struct WsMessage(String);

impl Handler<WsMessage> for WebSocketSession {
    type Result = ();

    fn handle(&mut self, msg: WsMessage, ctx: &mut Self::Context) {
        ctx.text(msg.0);
    }
}

impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WebSocketSession {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, _ctx: &mut Self::Context) {
        if let Ok(ws::Message::Text(text)) = msg {
            match serde_json::from_str::<Message>(&text) {
                Ok(msg) => {
                    println!("📩 受信: {:?} -> {:?}", msg.from, msg.to);
                    let server = self.server.read().unwrap();
                    if let Some(session) = server.sessions.get(&msg.to) {
                        println!("📤 転送成功: {} -> {}", msg.from, msg.to);
                        session.do_send(WsMessage(text.into()));
                    } else {
                        println!("⚠ 受信者 [{}] が見つかりません", msg.to);
                    }
                }
                Err(e) => println!("⚠ 無効なメッセージ受信: {} - エラー: {}", text, e),
            }
        }
    }
}

struct SignalingServer {
    sessions: HashMap<String, actix::Addr<WebSocketSession>>,
}

impl SignalingServer {
    fn new() -> Self {
        Self {
            sessions: HashMap::new(),
        }
    }
}

async fn ws_handler(
    req: HttpRequest,
    stream: web::Payload,
    server: web::Data<Arc<RwLock<SignalingServer>>>,
) -> Result<HttpResponse, actix_web::Error> {
    let id = Uuid::new_v4().to_string();
    println!("🌐 新規 WebSocket 接続: {}", id);

    let ws_session = WebSocketSession {
        id: id.clone(),
        server: Arc::clone(&server),
    };

    ws::start(ws_session, &req, stream)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let server = Arc::new(RwLock::new(SignalingServer::new()));

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(server.clone()))
            .route("/ws", web::get().to(ws_handler))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
