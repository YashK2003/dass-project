import React, { useRef, useEffect, useCallback, useState } from "react";
import ReactPlayer from "react-player";
import peer from "./peer";
import { useSocket } from "./socketprovider";
import { MdOutlineCallEnd} from "react-icons/md";
import { BsCameraVideoOff  , BsMicMute } from "react-icons/bs";
function VideoStream({ stream }) {
  useEffect(() => {
    if (stream) {
      // Set the `srcObject` property of the video element to the media stream
      const videoElement = document.getElementById('video-element');
      videoElement.srcObject = stream;

      // Play the video
      videoElement.play();
    }
  }, [stream]);

  return (
    <div>
      {/* <h1>My Video Stream</h1> */}
      <video style={{margin: "9px" , borderRadius: "10px"}} id="video-element" width="95%" height="95%" />
    </div>
  );
}


// styling 
const vidbox1 = {
  marginBottom: "0px",
  marginTop: "10px",
  marginLeft: "10px",
  height: "40%",
  width: "95%",
  backgroundColor: "#87CEEB",
  borderRadius: "10px",
  alignItems: "center"
}

const vidbox2 = {
  marginBottom: "0px",
  marginTop: "10px",
  marginLeft: "10px",
  height: "40%",
  width: "95%",
  backgroundColor: "#87CEEB",
  borderRadius: "10px"
}


const RoomPage = () => {
  const {socket , callEnded , leaveCall} = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.log('getUserMedia is not supported');
      return;
  }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
    setMyStream(stream);
  }, [remoteSocketId, socket]);

  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      console.log("mystream is" , stream);
      
      console.log(`Incoming Call`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

//   const sendStreams = useCallback(() => {
//     for (const track of myStream.getTracks()) {
//       peer.peer.addTrack(track, myStream);
//     }
//   }, [myStream]);
  
  const sendStreams = useCallback(() => {
  for (const track of myStream.getTracks()) {
    const sender = peer.peer.getSenders().find((s) => s.track === track);
    if (!sender) {
      peer.peer.addTrack(track, myStream);
    }
  }
}, [myStream, peer]);

  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      sendStreams();
    },
    [sendStreams]
  );

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStreamtemp = ev.streams;
      console.log("GOT TRACKS!!");
      console.log("remoteStream is" , remoteStreamtemp);
      setRemoteStream(remoteStreamtemp[0]);
    });
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);
    socket.on("getUsers" , (data) =>{
      console.log(data.users)
    })

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
  ]);

  // functions for buttons 
  function callhangup() {
    // video call  end implementation
    console.log("callhangup")
   
  }

  function micmute() {
    // mute the audio implementation
    console.log("micmute")
  }

  function videoclose() {
    // close the video end implementation
    console.log("videoclose")
  }


  return (
    <div className="App">
      {/* <h4>{remoteSocketId ? "Connected" : "No one in room"}</h4> */}
      {myStream && <button onClick={sendStreams}>Send Stream</button>}
      {remoteSocketId && <button onClick={handleCallUser}>CALL</button>}
      
      {myStream && (
        <div style = {vidbox1}>      
        <ReactPlayer
        playing
        muted
        height="95%"
        width="95%"
        style={{margin: "9px" , borderRadius: "10px"}} 
        url={myStream}
      />
        </div>
      )}
      
      {remoteStream && (
          <div style = {vidbox2}>
     <VideoStream stream={remoteStream} />
     </div>
      )}

      <div style={{display : "flex" , alignItems: "center"}}>
      

      <button style={{ cursor: "pointer" , marginLeft: "23%" ,marginRight: "25px" ,border: "2px solid black" ,borderRadius: "100%", backgroundColor: "white" , width: "55px", height: "55px"}} onClick={micmute}>
        <BsMicMute style={{ fontSize: "30px", align: "center", marginTop: "3px", marginLeft: "3px" }} />
      </button>

      <button style={{cursor: "pointer" , marginRight: "25px" ,border: "2px solid black" ,borderRadius: "100%", backgroundColor: "white" , width: "55px", height: "55px"}} onClick={videoclose}>
        <BsCameraVideoOff style={{ fontSize: "30px", align: "center", marginTop: "3px", marginLeft: "3px" }} />
      </button>

      <button style={{ cursor: "pointer" ,  marginRight: "25px" ,border: "2px solid black" ,borderRadius: "100%", backgroundColor: "red" , width: "55px", height: "55px"}} onClick={callhangup}>
        <MdOutlineCallEnd style={{ fontSize: "35px", align: "center", marginTop: "3px", marginLeft: "3px" }} />
      </button>

      </div>

      
      
    </div>
  );
};

export default RoomPage;
