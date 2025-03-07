use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use wasm_bindgen::JsCast;
use web_sys::{HtmlVideoElement, MediaStream, MediaDevices, Navigator, Document, MediaStreamConstraints};
use js_sys::Reflect;

#[wasm_bindgen]
pub async fn start_camera(video_id: &str) -> Result<(), JsValue> {
    // `window` を取得
    let window = web_sys::window().ok_or_else(|| JsValue::from_str("No global `window` exists"))?;
    // `document` を取得
    let document: Document = window.document().ok_or_else(|| JsValue::from_str("Failed to get document"))?;
    // `navigator` を取得
    let navigator: Navigator = window.navigator();
    // `media_devices` を取得
    let media_devices: MediaDevices = navigator.media_devices()?;

    // カメラの取得オプションを設定
    let mut constraints = MediaStreamConstraints::new(); // `mut` を追加
    constraints.set_video(&JsValue::from_bool(true)); // `video()` → `set_video()`
    constraints.set_audio(&JsValue::from_bool(false)); // `audio()` → `set_audio()`

    // メディアストリームを取得
    let stream_promise = media_devices.get_user_media_with_constraints(&constraints)?;
    let stream = JsFuture::from(stream_promise).await?;
    let stream: MediaStream = stream
        .dyn_into::<MediaStream>()
        .map_err(|_| JsValue::from_str("Failed to cast stream to MediaStream"))?;

    // video 要素を取得
    let video = document
        .get_element_by_id(video_id)
        .ok_or_else(|| JsValue::from_str("Failed to find video element"))?
        .dyn_into::<HtmlVideoElement>()
        .map_err(|_| JsValue::from_str("Failed to cast element to HtmlVideoElement"))?;

    // video にストリームを設定
    Reflect::set(&video, &JsValue::from_str("srcObject"), &stream)
        .map_err(|_| JsValue::from_str("Failed to set video srcObject"))?;

    Ok(())
}
