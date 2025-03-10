

{"from": "497d9b32-a517-4cff-b6b5-5e56ebccc661", "to": "630f07fc-3cfd-481e-8418-c9a27b1b9b98", "sdp": "v=0\r\n..."}

{"from": "11111111-1111-1111-1111-111111111111", "to": "22222222-2222-2222-2222-222222222222", "sdp": "v=0\r\n..." }

echo '{"from": "94397ed8-ff3d-4eb5-b69f-08d968b954e9", "to": "7d147e84-e982-40a5-861c-01049e7dee26", "sdp": "Hello, WebRTC!", "candidate": null}' | websocat ws://127.0.0.1:8080/ws

{"from": "c680a85c-d466-4cfe-8d2d-b93d6a3e9365", "to": "6f8b8b48-3528-46ea-8b26-5e0ed250c3a5", "sdp": "Hello, WebRTC!", "candidate": null}
