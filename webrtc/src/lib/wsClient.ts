import { io } from "socket.io-client";

const socket = io("ws://localhost:8080/ws");

export const sendMessage = (msg: any) => {
  socket.emit("message", msg);
};

socket.on("message", (data) => {
  console.log("📩 受信:", data);
});

export default socket;
