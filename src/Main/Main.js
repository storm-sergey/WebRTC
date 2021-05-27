import { useRef, useState, useEffect } from "react";
import { io } from "socket.io-client";
import freeice from "freeice";
import styles from "./Main.module.css";

const PORT = 3001;
const SERVER_URL =
  process.env.SERVER_URL || `https://${window.location.hostname}:${PORT}/`;

const Main = () => {
  const selfMedia = useRef(null);
  const remoteMedia = useRef(null);
  const [videoCaption, setVideoCaption] = useState(true);

  const socket = io(SERVER_URL, {
    "force new connection": true,
    reconnectionAttempts: "Infinity",
    timeout: 10000,
    transports: ["websocket"],
  });
  const constraints = {
    audio: true,
    video: {
      width: 320,
      height: 240,
    },
  };
  const configuration = { iceServers: freeice() };
  const pc = new RTCPeerConnection(configuration);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      selfMedia.current.srcObject = stream;
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    pc.onicecandidate = ({ candidate }) => socket.emit("ice", { candidate });
    pc.onnegotiationneeded = async () => {
      try {
        await pc.setLocalDescription(await pc.createOffer());
        socket.emit("desc", { desc: pc.localDescription });
      } catch (err) {
        console.error(err);
      }
    };
    pc.ontrack = (event) => {
      if (remoteMedia.current.srcObject) return;
      remoteMedia.current.srcObject = event.streams[0];
    };

    socket.on("desc", async ({ desc }) => {
      try {
        if (desc.type === "offer") {
          await pc.setRemoteDescription(desc);
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          stream.getTracks().forEach((track) => pc.addTrack(track, stream));
          await pc.setLocalDescription(await pc.createAnswer());
          socket.emit("desc", { desc: pc.localDescription });
        } else if (desc.type === "answer") {
          await pc.setRemoteDescription(desc);
        } else {
          console.log("Unsupported SDP type.");
        }
      } catch (err) {
        console.error(err);
      }
    });
    socket.on("ice", async ({ candidate }) => {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.error(err);
      }
    });
    return () => socket.offAny;
  }, [socket, pc]);

  useEffect(() => {
    for (const video of document.getElementsByTagName("video")) {
      video.onplaying = () => setVideoCaption(false);
    }
  }, [videoCaption]);

  return (
    <div className={styles.main}>
      <h1 className={styles.header}>WebRTC connection</h1>
      <button onClick={start} className={styles.button}>
        START
      </button>
      <div className={styles.media}>
        <div className={styles.container}>
          {videoCaption && <p className={`${styles.caption} ${styles.centered}`}>self</p>}
          <video ref={selfMedia} muted={true} autoPlay />
        </div>
        <br />
        <div className={styles.container}>
          {videoCaption && <p className={`${styles.caption} ${styles.centered}`}>remote</p>}
          <video ref={remoteMedia} autoPlay />
        </div>
        <br />
      </div>
    </div>
  );
};

export default Main;
