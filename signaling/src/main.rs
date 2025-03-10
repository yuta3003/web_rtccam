use actix::*;
use actix_web::{web, App, HttpRequest, HttpResponse, HttpServer, Error};
use actix_web_actors::ws;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
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
    server_addr: Addr<SignalingServer>,
}

impl Actor for WebSocketSession {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        println!("✅ WebSocket 接続確立: {}", self.id);
        let addr = ctx.address();
        self.server_addr.do_send(RegisterSession {
            id: self.id.clone(),
            addr,
        });

        ctx.text(format!(r#"{{"type": "welcome", "id": "{}"}}"#, self.id));
    }

    fn stopping(&mut self, _: &mut Self::Context) -> Running {
        println!("❌ WebSocket 切断: {}", self.id);
        self.server_addr.do_send(UnregisterSession {
            id: self.id.clone(),
        });

        Running::Stop
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
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, _: &mut Self::Context) {
        if let Ok(ws::Message::Text(text)) = msg {
            match serde_json::from_str::<Message>(&text) {
                Ok(msg) => {
                    println!("📩 受信: {:?} -> {:?}", msg.from, msg.to);
                    self.server_addr.do_send(SendMessage { to: msg.to, msg: text.to_string() });
                }
                Err(e) => println!("⚠ 無効なメッセージ受信: {} - エラー: {}", text, e),
            }
        }
    }
}

// シグナリングサーバー Actor
struct SignalingServer {
    sessions: HashMap<String, Addr<WebSocketSession>>,
}

impl SignalingServer {
    fn new() -> Self {
        Self {
            sessions: HashMap::new(),
        }
    }
}

impl Actor for SignalingServer {
    type Context = Context<Self>;
}

// クライアント登録
#[derive(Message)]
#[rtype(result = "()")]
struct RegisterSession {
    id: String,
    addr: Addr<WebSocketSession>,
}

impl Handler<RegisterSession> for SignalingServer {
    type Result = ();

    fn handle(&mut self, msg: RegisterSession, _: &mut Self::Context) {
        self.sessions.insert(msg.id, msg.addr);
    }
}

// クライアント削除
#[derive(Message)]
#[rtype(result = "()")]
struct UnregisterSession {
    id: String,
}

impl Handler<UnregisterSession> for SignalingServer {
    type Result = ();

    fn handle(&mut self, msg: UnregisterSession, _: &mut Self::Context) {
        self.sessions.remove(&msg.id);
    }
}

// メッセージ転送
#[derive(Message)]
#[rtype(result = "()")]
struct SendMessage {
    to: String,
    msg: String,
}

impl Handler<SendMessage> for SignalingServer {
    type Result = ();

    fn handle(&mut self, msg: SendMessage, _: &mut Self::Context) {
        if let Some(session) = self.sessions.get(&msg.to) {
            session.do_send(WsMessage(msg.msg));
            println!("📤 転送成功: {}", msg.to);
        } else {
            println!("⚠ 受信者 [{}] が見つかりません", msg.to);
        }
    }
}

// WebSocket ハンドラー
async fn ws_handler(
    req: HttpRequest,
    stream: web::Payload,
    server_addr: web::Data<Addr<SignalingServer>>,
) -> Result<HttpResponse, Error> {
    let id = Uuid::new_v4().to_string();
    println!("🌐 新規 WebSocket 接続: {}", id);

    let ws_session = WebSocketSession {
        id: id.clone(),
        server_addr: server_addr.get_ref().clone(),
    };

    ws::start(ws_session, &req, stream)
}

// メイン関数
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let server_addr = SignalingServer::new().start();

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(server_addr.clone()))
            .route("/ws", web::get().to(ws_handler))
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await
}
