let rtc, media, sio, roomID = "", isConnecting = false;
function onKey(event) {
    if (isConnecting) return;
    // backspace
    if (event.which == 8) {
        roomID = roomID.substring(0, roomID.length - 1);
    }
    // 判断是整数且没超过长度
    if (event.which > 47 && event.which < 58 && roomID.length < 6) {
        roomID += event.key
    }
    if (event.which == 13) {
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
        document.getElementById('goButton').style="display: inline;"
    });
    sio.on('roomLoginError', (msg) => {
        sio.disconnect();
        alert(msg);
    });
    sio.once('roomLoginSuccess', () => {
        document.getElementById('goButton').style="display: none;";
        getScreenStream();
    });
}

async function getScreenStream() {
    // 请求获取用户屏幕
    let displayMediaOptions = {
        video: {
            cursor: "always"
        },
        audio: false
    };
    try {
        media = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
        console.log("[Media] Got stream:", media);
    } catch(err) {
        console.error("[Media] Get stream object failed:", err);
    }
    sio.emit('creatStream', 'video', test);
    document.getElementById('mainVideo').srcObject = media;
}
    
    
async function test(streamID) {
    // 构造p2p连接对象
    rtc = new RTCPeerConnection(webrtcConfiguration);
    rtc.addEventListener('icecandidate', (candidate) => {
        if (candidate.candidate != null) {
            console.log("[WebRTC] Got ICE candidate:", candidate.candidate);
            sio.emit("candidate", 'sharer', streamID, candidate.candidate);
        }
    });
    // 当还没有收到ans的时候,缓存candidate的标志为和队列
    let isReceivedAnswer = false, candidatesQueue = [];
    // 满足条件时,将candidatesQueue内的candidate都添加到rtc接口
    async function addCandidatesQueue() {
        if (isReceivedAnswer) {
            console.log(candidatesQueue);
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
    rtc.addTrack(media.getVideoTracks()[0], media);
    try {
        const offerOptions = {
            offerToReceiveAudio: 0,
            offerToReceiveVideo: 1
        };
        const offer = await rtc.createOffer(offerOptions);
        await rtc.setLocalDescription(offer);
        console.log("[WebRTC] Got offer:", offer);
        sio.emit('offer', 'sharer', streamID, offer);
        sio.on('answer', (type, id, ans) => {
            // 合法性检查
            if (type == 'sharer' || id != streamID) return;
            console.log("[Websocket] Got answer:", ans);
            rtc.setRemoteDescription(ans);
            isReceivedAnswer = true;
            addCandidatesQueue();
        });
    } catch (e) {
        console.log("[WebRTC] Get offer failed:", e);
    }
}