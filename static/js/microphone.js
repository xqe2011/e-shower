let rtc, media, isConnecting, roomID = "";
function onKey(input) {
    if (isConnecting) return;
    // backspace
    if (input == "backspace") {
        roomID = roomID.substring(0, roomID.length - 1);
    }
    if (input.length == 1 && input.charCodeAt(0) > 47 && input.charCodeAt(0) < 58  && roomID.length < 6) {
        roomID += input;
    }
    if (input == "enter") {
        go();
    }
    showRoomID(roomID, roomID.length);
}
function go() {
    if (isConnecting) return;
    isConnecting = true;
    // 建立ws连接
    sio = io(window.location.protocol + "//" + window.location.host, {
       query: {
            roomID: parseInt(roomID),
            type: 'sharer'
        }
    });
    sio.on('disconnect', () => {
        isConnecting = false;
        document.getElementById('keyboard').style="display: inline;";
    });
    sio.on('roomLoginError', (msg) => {
        sio.disconnect();
        alert(msg);
    });
    sio.once('roomLoginSuccess', () => {
        document.getElementById('keyboard').style="display: none;";
        getAudioStream();
    });
}
async function getAudioStream() {
    // 请求获取用户音频
    let mediaOptions = {
        video: false,
        audio: true
    };
    try {
        media = await navigator.mediaDevices.getUserMedia(mediaOptions)
        console.log("[Media] Got stream:", media);
    } catch(err) {
        console.error("[Media] Get stream object failed:", err);
    }
    sio.emit('creatStream', 'audio', test);
}
    
    
async function test(streamID) {
    // 构造p2p连接对象
    rtc = new RTCPeerConnection(webrtcConfiguration);
    rtc.addEventListener('icecandidate', (candidate) => {
        if (candidate.candidate != null) {
            console.log("[WebRTC] Got ICE candidate:", candidate.candidate);
            sio.emit("candidate", 'microphone', streamID, candidate.candidate);
        }
    });
    // 当还没有收到ans的时候,缓存candidate的标志为和队列
    let isReceivedAnswer = false, candidatesQueue = [];
    // 满足条件时,将candidatesQueue内的candidate都添加到rtc接口
    async function addCandidatesQueue() {
        if (isReceivedAnswer) {
            while(candidatesQueue.length) {
                //console.log(candidatesQueue[i]);
                let can = candidatesQueue.shift();
                await rtc.addIceCandidate(can);
            }
        }
    }
    sio.on('candidate', (type, id, candidate) => {
        // 合法性检查
        if (type == 'sharer' || id != streamID) return;
        console.log("[Websocket] Got ICE candidate:", candidate);
        candidatesQueue.push(candidate);
        addCandidatesQueue();
    });
    rtc.addEventListener('iceconnectionstatechange', () => {
        console.log("[WebRTC] Connection state changed:", rtc.iceConnectionState);
    });
    rtc.addTrack(media.getAudioTracks()[0], media);
    try {
        const offerOptions = {
            offerToReceiveAudio: 1,
            offerToReceiveVideo: 0
        };
        const offer = await rtc.createOffer(offerOptions);
        await rtc.setLocalDescription(offer);
        console.log("[WebRTC] Got offer:", offer);
        sio.emit('offer', 'microphone', streamID, offer);
        sio.on('answer', (type, id, ans) => {
            // 合法性检查
            if (type == 'microphone' || id != streamID) return;
            console.log("[Websocket] Got answer:", ans);
            rtc.setRemoteDescription(ans);
            isReceivedAnswer = true;
            addCandidatesQueue();
        });
    } catch (e) {
        console.log("[WebRTC] Get offer failed:", e);
    }
}