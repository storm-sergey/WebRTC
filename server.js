const app = require("express")();
const https = require("https");
const fs = require("fs");
const options = {
  key: fs.readFileSync(process.env.KEY_ADDR || "./ssl/192.168.0.66-key.pem"),
  cert: fs.readFileSync(process.env.CERT_ADDR || "./ssl/192.168.0.66.pem"),
};
const server = https.createServer(options, app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    secure: "true",
  },
});
const PORT = process.env.PORT || 3001;

io.on("connection", (socket) => {
  socket.on("desc", ({ desc }) => {
    socket.broadcast.emit("desc", { desc });
  });
  socket.on("ice", ({ candidate }) => {
    socket.broadcast.emit("ice", { candidate });
  });
});

server.listen(PORT, () => console.log("[server] started"));
