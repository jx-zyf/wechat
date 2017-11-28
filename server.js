// 服务器及页面响应部分
var http = require('http'),
    express = require('express'),
    app = express(),
    server = http.createServer(app),
    users = [],     // 保存所有在线的用户
    io = require('socket.io').listen(server);   // 引入socket.io模块并绑定到服务器

// 指定静态HTML文件的位置
app.use('/', express.static(__dirname+'/www'));

server.listen(8080)

console.log('server is running at 8080...');

// socket部分
io.on('connection', function(socket){
    // 监听登录
    socket.on('login', function(nickname){
        if(users.indexOf(nickname)!==-1){
            socket.emit('name_repeat','该用户名已被使用！');
        }else{
            socket.userIndex = users.length;
            socket.userName = nickname;
            users.push(nickname);
            socket.emit('login_success');
            io.sockets.emit('system', nickname, users.length, 'login');    // 向所有连接到服务器的客户端发送当前登陆用户的昵称
        }
    });
    // 监听登出
    socket.on('disconnect', function(){
        users.splice(socket.userIndex, 1);
        socket.broadcast.emit('system', socket.userName, users.length, 'loginout');     // 除自己外
    });
    // 监听发消息
    socket.on('sendMsg', function(msg, color){
        // 将新消息发送给除自己以外的所有用户
        socket.broadcast.emit('newMsg', socket.userName, msg, color);
    })
});