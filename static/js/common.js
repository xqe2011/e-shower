let webrtcConfiguration = {
    'iceServers': [
        {
            urls: 'turn:e-shower.xqe2011.cn:3478',
            username: 'xqe2011',
            credential: 'xqe2011'
        }
    ],
}

/**
 * 渲染roomid
 * @param {*} roomID roomid字符串
 * @param {*} highlightNum 高亮的数字序号
 */
function showRoomID(roomID, highlightNum) {
    let roomIDElement = document.getElementById('roomID');
    while (roomIDElement.firstChild) {
        roomIDElement.removeChild(roomIDElement.firstChild);
    }
    let idStr = roomID;
    if (idStr.length < 6) {
        let space = "      ";
        idStr += space.substring(0, 6 - idStr.length);
    }
    for (let i =0;i<idStr.length;i++) {
        let child = document.createElement('div');
        child.innerText = idStr.substring(i, i+1);
        if (highlightNum == i ){
            child.className = "highlight";
        }
        roomIDElement.appendChild(child);
    }
}

