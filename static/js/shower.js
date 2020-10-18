let sio = io(window.location.protocol + "//" + window.location.host, {
    query: {
        type: 'shower'
    }
});
let streams= [{}], rtc, audioElements = [];
sio.on('joinedRoom', (id) => {
    console.log("[Websocket] Get room id:", id);
    showRoomID(id.toString());
});
function go() {
    for (let i in audioElements) {
        audioElements[i].play();
    }
    document.getElementById("mask").style = "display:none;"
}
sio.on('creatStream', (type, cb) => {
    let streamID = type == 'video' ? 0 : streams.push(0);
    cb(streamID, () => console.log('123'));
    creatStream(type, streamID, stream => {
        if (streamID == 0) {
            document.getElementById('mainVideo').srcObject = stream[0];
        } else {
            let audio = new Audio();
            audio.srcObject = stream[0];
            audio.autoplay = true;
            document.body.appendChild(audio);
            audioElements.push(audio);
        }
    }).then(() => {
        console.log("[WebSocket] Created stream, stream id:", streamID);
        cb(streamID);
    });
});
async function creatStream(streamType, streamID, onTrackCallback) {
    // 构造p2p连接对象
    rtc = new RTCPeerConnection(webrtcConfiguration);
    rtc.addEventListener('icecandidate', (candidate) => {
        if (candidate.candidate != null) {
            console.log("[WebRTC] Got ICE candidate:", candidate.candidate);
            sio.emit("candidate", 'shower', 0, candidate.candidate);
        }
    });
    rtc.addEventListener('iceconnectionstatechange', () => {
        console.log("[WebRTC] Connection state changed:", rtc.iceConnectionState);
    });
    rtc.addEventListener('track', obj => {
        console.log("[WebRTC] Got stream track:", obj);
        onTrackCallback(obj.streams);
    });
    // 当还没有收到ans的时候,缓存candidate的标志为和队列
    let isReceivedOffer = false, candidatesQueue = [];
    // 满足条件时,将candidatesQueue内的candidate都添加到rtc接口
    async function addCandidatesQueue() {
        if (isReceivedOffer) {
            while(candidatesQueue.length) {
                let can = candidatesQueue.shift();
                await rtc.addIceCandidate(can);
            }
        }
    }
    sio.on('candidate', (type, id, candidate) => {
        // 合法性检查
        if (type == 'shower' || id != streamID) return;
        console.log("[Websocket] Got ICE candidate:", candidate);
        candidatesQueue.push(candidate);
        addCandidatesQueue();
    });
    //rtc.addTrack(media.getVideoTracks()[0], media);
    sio.on('offer', async (type, id, offer) => {
        // 合法性检查
        if (type == 'shower' || id != streamID) return;
        console.log("[Websocket] Got offer:", offer);
        try {
            await rtc.setRemoteDescription(offer);
            const answer = await rtc.createAnswer();
            await rtc.setLocalDescription(answer);
            console.log("[WebRTC] Got answer:", answer);
            isReceivedOffer = true;
            addCandidatesQueue();
            sio.emit('answer', 'shower', streamID, answer);
        } catch (e) {
            console.log("[WebRTC] Get answer failed:", e);
        }
    });
    
}