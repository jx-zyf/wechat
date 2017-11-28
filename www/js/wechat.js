$(function () {
    new WeChat();
});

var WeChat = function () {
    this.socket = null;
    this.curUser = '';
    this.init();
}

WeChat.prototype = {
    init: function () {
        var _this = this;
        // 建立连接
        this.socket = io.connect();
        this.socket.on('connect', function () {
            $('#info').text('input your nickname...');
            $('#nicknameInput').val('');    // 火狐输入框会记录之前的值
            $('#nicknameInput').focus();
            // 登录
            $('#loginBtn').on('click', function () {
                if ($('#nicknameInput').val() !== '') {
                    _this.socket.emit('login', $('#nicknameInput').val());
                } else {
                    $('#nicknameInput').focus();
                    alert('please input your nickname!');
                }
            });
            // 回车登录
            $('#nicknameInput').on('keyup', function (e) {
                if (e.keyCode === 13) {
                    if ($('#nicknameInput').val() !== '') {
                        _this.socket.emit('login', $('#nicknameInput').val());
                    } else {
                        $('#nicknameInput').focus();
                        alert('please input your nickname!');
                    }
                }
            })
        });
        $('#nickWrapper').addClass('show');
        // 用户名是否重复
        this.socket.on('name_repeat', function (msg) {
            $('#info').text(msg);
        });
        // 登录成功
        this.socket.on('login_success', function () {
            _this.curUser = $('#nicknameInput').val();
            $('#info').text('登录成功！');
            $('#loginWrapper').addClass('hide');
            $('#messageInput').focus();
            _this.socket.on('system', function (nickname, userCount, type) {
                $('#status').text('当前在线人数：' + userCount);
                var msg = nickname + (type === 'login' ? ' 加入了' : '离开了') + '聊天！';
                _this.sendMsg('系统', msg, 'red');
            });
        });
        // 发消息
        $('#sendBtn').on('click', function () {
            var msg = $('#messageInput').html().replace(/&nbsp;/g, '').replace(/<br>/g, ' ');
            //获取颜色值
            var color = $('#colorStyle').val();
            if (msg.length > 0) {
                _this.socket.emit('sendMsg', msg, color);
                _this.sendMsg(_this.curUser, msg, color);
            }
            $('#messageInput').html('');
            $('#messageInput').focus();
        });
        // 回车+shift 发送
        $('#messageInput').on('keydown', function (e) {
            if (e.keyCode === 13 && e.shiftKey) {
                var msg = $('#messageInput').html().replace(/&nbsp;/g, '').replace(/<br>/g, ' ');
                //获取颜色值
                var color = $('#colorStyle').val();
                $('#messageInput').html('');
                if (msg.length > 0) {
                    _this.socket.emit('sendMsg', msg, color);
                    _this.sendMsg(_this.curUser, msg, color);
                }
                $('#messageInput').focus();
                return false;
            }
        });
        // 接收消息
        this.socket.on('newMsg', function (userName, msg, color) {
            _this.sendMsg(userName, msg, color);
        });
        // 发送图片
        $('#sendImage').on('change', function () {
            //检查是否有文件被选中
            if (this.files.length !== 0) {
                //获取文件并用FileReader进行读取
                var file = this.files[0],
                    reader = new FileReader();
                if (!reader) {
                    _this.sendMsg('system', '!your browser doesn\'t support fileReader', 'red');
                    this.value = '';
                    return;
                };
                reader.onload = function (e) {
                    // var img = '<a href="' + e.target.result + '" target="_blank"><img src="' + e.target.result + '" /></a>';
                    var img = '<img src="' + e.target.result + '" />';
                    var msg = $('#messageInput').append(img);
                    _this.po_Last_Div($('#messageInput')[0]);
                };
                reader.readAsDataURL(file);
            };
        });
        // 初始化表情包
        this.initialEmoji();
        $('#emoji').on('click', function (e) {
            $('#emojiWrapper').css('display', 'block');
            e.stopPropagation();
        });
        $('body').on('click', function (e) {
            if (e.target !== $('#emojiWrapper')[0]) {
                $('#emojiWrapper').css('display', 'none');
                e.stopPropagation();
            }
        });
        $('#emojiWrapper').on('click', function (e) {
            if (e.target.nodeName.toLowerCase() === 'img') {
                $('#messageInput')[0].innerText += '[emoji:' + e.target.title + ']';
                // $('#messageInput').focus();
                _this.po_Last_Div($('#messageInput')[0]);
            }
        });
    },
    sendMsg: function (user, msg, color) {
        var color = color || '#000';
        var date = new Date().toTimeString().substr(0, 8);
        var msg = this.showEmoji(msg);
        var p = user === this.curUser
            ? '<p data_user="' + user + '"><span class="msg">' + msg + '</span><span class="timeSpan">：(' + date + ')' + user + ' </span></p>'
            : '<p data_user="' + user + '"><span class="timeSpan">' + user + '(' + date + ') ：</span><span class="msg">' + msg + '</span></p>';
        // 用户进入聊天室才能接收消息
        if ($('#loginWrapper').attr('class').includes('hide')) {
            $('#historyMsg').append(p);
            $('#historyMsg p').filter($('[data_user=' + user + ']')).css('color', color);
            $('#historyMsg p').filter($('[data_user=系统]')).css('text-align', 'center');
            $('#historyMsg p').filter($('[data_user=系统]')).find('.timeSpan').css('color', 'red');
            $('#historyMsg p').filter($('[data_user=系统]')).find('.msg').css('display', 'inline');
            $('#historyMsg p').filter($('[data_user=' + this.curUser + ']')).css('text-align', 'right');
            $('#historyMsg').scrollTop($('#historyMsg')[0].scrollHeight - $('#historyMsg').height());     // 保证消息出现在可见区域
        }
    },
    // 表情包初始化
    initialEmoji: function () {
        var emojiContainer = document.getElementById('emojiWrapper'),
            docFragment = document.createDocumentFragment();    // 创建一个空文档对象
        for (var i = 69; i > 0; i--) {
            var emojiItem = document.createElement('img');
            emojiItem.src = '../emoji/' + i + '.gif';
            emojiItem.title = i;
            docFragment.appendChild(emojiItem);
        };
        emojiContainer.appendChild(docFragment);
    },
    showEmoji: function (msg) {
        var match, result = msg,
            reg = /\[emoji:\d+\]/g,
            emojiIndex,
            totalEmojiNum = document.getElementById('emojiWrapper').children.length;
        while (match = reg.exec(msg)) {
            emojiIndex = match[0].slice(7, -1);
            if (emojiIndex > totalEmojiNum) {
                result = result.replace(match[0], '[X]');
            } else {
                result = result.replace(match[0], '<img class="emoji" src="../emoji/' + emojiIndex + '.gif" />');
            };
        };
        return result;
    },
    //定位div(contenteditable = "true")光标到最后
    po_Last_Div: function (obj) {
        if (window.getSelection) {//ie11 10 9 ff safari
            obj.focus(); //解决ff不获取焦点无法定位问题
            var range = window.getSelection();//创建range
            range.selectAllChildren(obj);//range 选择obj下所有子内容
            range.collapseToEnd();//光标移至最后
        }
        else if (document.selection) {//ie10 9 8 7 6 5
            var range = document.selection.createRange();//创建选择对象
            //var range = document.body.createTextRange();
            range.moveToElementText(obj);//range定位到obj
            range.collapse(false);//光标移至最后
            range.select();
        }
    }
}