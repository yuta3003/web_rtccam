"use client";

import { useEffect } from "react";
import init, { start_camera } from "@/wasm/web_rtccam";

export default function Home() {
    useEffect(() => {
        let isMounted = true;

        init().then(() => {
            if (isMounted) {
                start_camera("videoElement").catch(console.error);
            }
        });

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div>
            <h1>Webカメラ</h1>
            <video id="videoElement" autoPlay playsInline style={{ width: "100%" }}></video>
        </div>
    );
}
