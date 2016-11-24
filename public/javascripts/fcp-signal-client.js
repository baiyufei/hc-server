function fcpSignalClient(address) {
  var ioClient = io.connect(address + '/fcpSignal');
  var sound = fcpSound();
  var rtc;
  var aid;

  var State = {
    OFF_LINE:       0,
    NOT_JOINED:     1,
    USUAL:          2,
    CALL_WAIT:      3,
    CALL_RING:      4,
    CALL_CONNECTED: 5,
    CALL_GROUP:     6
  };

  var uid;        // local client uid
  var state = State.OFF_LINE;

  ioClient.on('login-answer', function(msg) {
    if (msg.success) {
      uid = msg.uid;
      state = State.USUAL;
      rtc = webRTCClient(ioClient);
      sound.play('login-success');
    } else {
      state = State.NOT_JOINED;
      if (msg.reason === "no name") {
        sound.play('no-user');
      }
      else if (msg.reason === "duplicate") {
        sound.play('duplication');
      }
      else if (msg.reason === "no verification") {
        sound.play('no-card');
      }
    }
  });

  var that = {};

  that.nameLogin = function(name) {
    ioClient.emit('name-login', {'name': name});
  };

  that.setAid = function(_aid) {
    aid = _aid;
  };

  that.aidLogin = function() {
    if (aid === undefined) return;

    ioClient.emit('aid-login', {'aid': aid});
  };

  return that;
}