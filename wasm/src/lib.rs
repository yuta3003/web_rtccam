use wasm_bindgen::prelude::*;
use web_sys::{window, Document, HtmlVideoElement, MediaDevices, Navigator};

#[wasm_bindgen(start)]
pub fn start() {
    let win = window().expect("No global `window` exists");
    let doc: Document = win.document().expect("No document on window");
    let _video_element = doc.create_element("video").unwrap()
        .dyn_into::<HtmlVideoElement>().unwrap();
    let navigator: Navigator = win.navigator();
    let _media_devices: MediaDevices = navigator.media_devices().unwrap();
}
