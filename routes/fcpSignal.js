/**
 * Created by baiyu on 2016/11/14.
 */
var logger = require('log4js').getLogger('fcpSignal');

var uidMap = {};    // uid -- socket

var con = require('mysql').createConnection({
  host     : 'localhost',
  user     : 'root',
  password : require('./key'),
  database : 'openfire'
});

con.connect(function(err) {
  if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }

  console.log('connected as id ' + con.threadId);
});

function fcpSignal(io) {
  io.on('connection', function(socket) {
    logger.info('a device connected');

    socket.on('join', function (msg) {
      logger.info('user ' + msg.uid + ' joins');
      socket.uid = msg.uid;
      uidMap[msg.uid] = socket;
    });

    /**
     * used for transforming WebRTC sdp and ice information
     */
    socket.on('WebRTC', function (msg) {
      logger.info(msg.type + " from:" +msg.from + " to:" + msg.to);
      var uid = msg.to;
      if (uidMap[uid] === undefined) {
        logger.error("no target uid " + uid);
        return;
      }
      var targetSocket = uidMap[uid];
      if (msg.candidate) {
      }
      targetSocket.emit(msg.type , msg);
    });

    socket.on('name-login', function(msg) {
      con.query('SELECT userid FROM msuserattr WHERE username =  ?', [msg.name],
        function(err, rows) {
          if (err) throw err;

          if (rows[0] === undefined || rows[0].userid === undefined) {
            socket.emit('login-answer', {'success':false, 'reason' : 'no name'});
          }
          else if (uidMap[rows[0].userid] !== undefined) {
            socket.emit('login-answer', {'success':false, 'reason' : 'duplicate'});
          }
          else {
            socket.emit('login-answer', {'success':true, 'uid' : rows[0].userid});
            uidMap[rows[0].userid] = socket;
            socket.uid = rows[0].userid;

            socket.join('panels');
            logger.info("user " + rows[0].userid + " log in");
            updatePanel();
          }
        });
    });


    function updatePanel() {
      con.query('SELECT userid, username, orgname FROM msuserattr;',
        function(err, rows) {
          if (err) throw err;
          var ret = [];
          for (var i = 0; i < rows.length; i++) {
            var item = {};
            item.uid = rows[i].userid;
            item.online = (!(uidMap[item.uid] === undefined));
            item.name = rows[i].username;
            item.org = rows[i].orgname;
            ret.push(item);
          }
          io.to('panels').emit('panel', {type: 'contacts', data: ret});
        });

      con.query('SELECT chatroomid, roomname, owner from mschatroom', function(err, rows) {
        if (err) throw err;
        var ret = [];
        var idMap = {};
        for (var i = 0; i < rows.length; i++) {
          var group = {};
          group.name = rows[i].roomname;
          group.id = rows[i].chatroomid;
          group.owner = rows[i].owner;
          group.member = [];
          ret.push(group);
          idMap[group.id] = group;
        }

        con.query('SELECT msroomuser.chatroomid,msroomuser.userid,msuserattr.username ' +
          'FROM msroomuser JOIN msuserattr on msroomuser.userid = msuserattr.userid', function(err, rows) {
          if (err) throw err;
          for (var i = 0; i < rows.length; i++) {
            var user = {};
            user.name = rows[i].username;
            user.id = rows[i].userid;
            user.online = (uidMap[user.id] !== undefined);
            var gid = rows[i].chatroomid;
            idMap[gid].member.push(user);
          }
          socket.emit('panel', {type: "group-info", data: ret});
        })
      })
    }


    socket.on('aid-login', function(msg) {
      con.query('SELECT username FROM mshat JOIN mshatuser ON mshat.hid = mshatuser.hid WHERE androidid = ?',
        [msg.aid],
        function(err, rows) {
          if (err) throw err;

          if (rows[0] === undefined) {
            socket.emit('login-answer', {'success':false, 'reason' : 'no name'});
            logger.warn('unknown android device which aid == ' + msg.aid +', we should add it to database');
          }
          else if (rows[0].username === "") {
            socket.emit('login-answer', {'success':false, 'reason' : 'no verification'});
          }
          else {
            var uid = rows[0].username; // a little confused, the username in table actually is uid

            uidMap[uid] = socket;
            socket.uid = uid;
            socket.emit('login-answer', {'success':true, 'uid' : uid});
            updatePanel();

            var clientIp = socket.request.connection.remoteAddress;

            con.query('UPDATE mshat SET ip = ? WHERE androidid = ?;', [clientIp, msg.aid],
              function(err) { if (err) throw err;});

            con.query('SELECT username FROM msuserattr WHERE userid = ?', [uid],
              function(err, rows) {
                if (err) throw err;
                logger.info(rows[0].username + " now is using Hat " + msg.aid);
              });
          }
        });
    });

    socket.on('call', function(msg) {
      if (msg.index !== undefined) {
        var index = msg.index;
        if (!Number.isInteger(index) || index > 3 || index < 1){
          socket.emit('call-answer', {'success': false});
          return;
        }
        var uid = msg.from;
        if (uidMap[uid] === undefined) {
          // should never be here
          // we haven't record the uid, but it send a call signal. Perhaps we should send a reset signal
          return;
        }
        var contact = 'contact' + index;
        var queryString = 'SELECT ' + contact +' from msuserattr where userid = ?';
        con.query(queryString, [uid],
          function(err, rows) {
            if (err) throw err;
            if (rows[0][contact] === undefined) {
              socket.emit('call-answer', {'success': false, reason: 'off line'});
              return;
            }
            var to = rows[0][contact];
            call(uid, to);
          });
      }
      else if (msg.to !== undefined) {
        call(msg.from, msg.to);
      }
    });

    function call(from, to) {
      logger.info('user ' + from + ' is calling ' + to);
      var socketFrom = uidMap[from];
      var socketTo = uidMap[to];
      if (socketFrom === undefined)
        return;

      if (socketTo === undefined) {
        socketFrom.emit('call-answer', {'success': false, reason: 'off line'});
        return;
      }

      socketFrom.emit('call-answer', {'success': true, 'from' : to});
      socketTo.emit('call', {'from': from, 'to': to});
    }

    function transmit(msg, name) {
      var socketFrom = uidMap[msg.from];
      var socketTo = uidMap[msg.to];
      if (socketTo !== undefined && socketFrom !== undefined ) {
        socketTo.emit(name, msg);
      }
    }

    socket.on('group-call', function(msg) {
      var index = msg.index;
      var queryString = "SELECT userid FROM msroomuser WHERE chatroomid = (select chatroom"+
        index.toString()+" FROM msuserattr WHERE userid = '"+msg.from+"');";
      con.query(queryString, function(err, rows) {
        if (err) throw err;

        for (var i = 0; i < rows.length; i++) {
          var tUid = rows[i].userid;
          var tSocket = uidMap[tUid];
          if (tSocket !== undefined) {
            tSocket.emit("group-call", {'from': msg.from})
          }
        }

      });
    });

    socket.on('group-call-id', function(msg) {
      logger.trace(msg);
      var id = msg.id;
      con.query('SELECT userid FROM msroomuser WHERE chatroomid = ?', id, function(err, rows) {
        if (err) throw err;
        for (var i = 0; i < rows.length; i++) {
          var tUid = rows[i].userid;
          var tSocket = uidMap[tUid];
          if (tSocket !== undefined) {
            tSocket.emit("group-call", {'from': msg.from})
          }
        }
      });
    });

    socket.on('group-call-hang-up', function(msg) {
      transmit(msg, 'group-call-hang-up');
    });

    socket.on('group-call-answer', function(msg) {
      transmit(msg, 'group-call-answer');
    });

    socket.on('reply', function(msg) {
      transmit(msg, 'reply');
    });

    socket.on('hang-up', function(msg) {
      transmit(msg, 'hang-up');
    });


    socket.on('panel', function(msg) {
      if (msg.type === "valid-user-list") {
        con.query('SELECT userid, username FROM msuserattr;',
          function(err, rows) {
            if (err) throw err;
            var ret = [];
            for (var i = 0 ; i < rows.length; i++) {
              var uid = rows[i].userid;
              if (uidMap[uid] === undefined) {
                ret.push(rows[i].username);
              }
            }
            socket.emit('panel', {type: "valid-user-list", data: ret});
          });
      }
    });

    socket.on('disconnect', function () {
      delete uidMap[socket.uid];
      logger.info('user ' + socket.uid + ' leaves');
    });

  });
}

module.exports = fcpSignal;