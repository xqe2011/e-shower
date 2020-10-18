const express = require('express');
const app = express();
app.use(express.static('./static'));
const http = require('http').createServer(app);

const io = require('socket.io')(http);

let rooms = {}
io.on('connection', (socket) => {
    let roomID, query = socket.handshake.query;
    if (!query.hasOwnProperty("type")) {
        socket.disconnect();
        return;
    }
    function checkRoomID() {
        if (!rooms.hasOwnProperty(roomID)) {
            socket.emit('roomLoginError', 'roomID:' + roomID + ' doesnt exist!');
            socket.disconnect();
            return false;
        } else {
            socket.emit('roomLoginSuccess');
        }
        return true;
    }
    if (query.type == "shower") {
        // 生成roomID
        roomID = Math.floor(Math.random() * 900000 + 99999);
        rooms[roomID] = {
            shower: socket,
            streams: []
        };
        console.log('a shower connected, sid:', socket.id, 'roomID', roomID);
        socket.join(roomID);
        socket.emit("joinedRoom", roomID);
    } else if (query.type == "sharer") {
        roomID = query.roomID;
        if (!checkRoomID()) return;
        console.log('a screen sharer connected, sid:', socket.id, 'roomID', roomID);
        socket.join(roomID);
    } else if (query.type == "microphone") {
        roomID = query.roomID;
        if (!checkRoomID()) return;
        console.log('a microphone connected, sid:', socket.id, 'roomID', roomID);
        socket.join(roomID);
    }
    // webrtc信令部分开始
    //  type: 类型,可取值为shower或sharer
    //  id: 流id,audio可取大于0的整数, video只能有0
    socket.on('candidate', (type, id, candidate) => {
        console.log('a candidate received!, roomID:', roomID, ', candidate:', candidate);
        io.to(roomID).emit('candidate', type, id, candidate);
    });
    socket.on('offer', (type, id, offer) => {
        console.log('a offer received!, roomID:', roomID, ', offer:', offer);
        io.to(roomID).emit('offer', type, id, offer);
    });
    socket.on('requestOffer', () => {
        io.to(roomID).emit('requestOffer');
    });
    socket.on('answer', (type, id, answer) => {
        console.log('a answer received!, roomID:', roomID, ', answer:', answer);
        io.to(roomID).emit('answer', type ,id, answer);
    });
    socket.on('creatStream', (type, cb) => {
        console.log(type);
        if (typeof rooms[roomID] != "undefined") {
            rooms[roomID].shower.emit('creatStream', type, cb);
        } else {
            console.log("the room has been deleted, roomID:", roomID);
            socket.disconnect();
        }
    });
    socket.on('disconnecting', () => {
        if (query.type == 'shower') {
            //io.to(rooms[roomID].shower.id).disconnect();
            delete rooms[roomID];
        }
        console.log("a user disconnected, sid:", socket.id);
    });
});


http.listen(80, () => {
    console.log('listening on *:80');
});