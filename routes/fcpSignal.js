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

            logger.info("user " + rows[0].userid + " log in");
          }
        });
    });

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

    socket.on('disconnect', function () {
      delete uidMap[socket.uid];
      logger.info('user ' + socket.uid + ' leaves');
    });

  });
}

module.exports = fcpSignal;