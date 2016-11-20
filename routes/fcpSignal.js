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
  io.on('con', function(socket) {
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
      logger.info(msg.name);
      socket.emit('login-answer', {'success':true, 'uid' : 1234});
    });

    socket.on('disconnect', function () {
      delete uidMap[socket.uid];
      logger.info('user ' + socket.uid + ' leaves');
    });

  });
}

module.exports = fcpSignal;