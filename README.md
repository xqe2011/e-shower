# E-Shower
**A WebRTC-based class helper**  
When you are teaching and the microphone is malfunction, how can you solve this problem?  
Try to use this! It can use a computer as shower, which receives video stream from another computer and audio stream from your phone.  
It based on WebRTC and HTML5, so you don't need to install anything in your computer or phone.  
It establishes a P2P connection, so it is Low-Lantency and secrecy!  
### More infomation, please read [Blog](https://blog.xqe2011.cn/2020/10/18/记一次webrtc项目的开发经过/)

## Getting start
```
npm install
node server.js
```
Open `static/js/common.js`, and change `YOUR_COTURN_SERVER` to your own TURN Server.  
Then Navigate to `http://127.0.0.1`, and try it!