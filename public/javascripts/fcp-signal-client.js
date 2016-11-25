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
  var remoteUid;
  var state = State.OFF_LINE;

  ioClient.on('login-answer', function(msg) {
    if (msg.success) {
      uid = msg.uid;
      state = State.USUAL;
      rtc = webRTCClient(ioClient);
      rtc.setLocalUid(uid);
      sound.play('login-success');
      console.log("login success! Uid is " + uid);
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

  ioClient.on('call-answer', function(msg) {
    if (state !== State.USUAL)
      return;
    if (msg.success) {
      state = State.CALL_WAIT;
      remoteUid = msg.from;
      sound.play('wait');
    } else {
      sound.play('offline');
    }
  });

  ioClient.on('call', function(msg) {
    if (state !== State.USUAL) {
      ioClient.emit('reply', {'result': 'busy', 'from': msg.to, 'to': msg.from});
      return;
    }
    remoteUid = msg.from;
    state = State.CALL_RING;
    sound.play('ring');
  });

  ioClient.on('reply', function(msg) {
    if (state !== State.CALL_WAIT) return;
    if (msg.result === "busy") {
      sound.play('busy');
      state = State.USUAL;
    }
    else if (msg.result === "refuse") {
      state = State.USUAL;
      sound.play('refuse');
    }
    else if (msg.result === "accept") {
      sound.stop();
      state = State.CALL_CONNECTED;
      remoteUid = msg.from;
      rtc.call(msg.from);
    }
  });

  ioClient.on('hang-up', function(msg) {
    if (state === State.CALL_CONNECTED || state === State.CALL_RING) {
      rtc.hangup();
      sound.stop();
      state = State.USUAL;
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

  that.callIndex = function(index) {
    // index should be 1 ~ 3

    if (state !== State.USUAL)
      return;
    ioClient.emit('call', {'from': uid, 'index': index});
  };

  that.callUid = function(to) {
    if (state !== State.USUAL)
      return;
    ioClient.emit('call', {'from': uid, 'to': to});
  };

  that.accept = function() {
    if (state !== State.CALL_RING) return;
    state = State.CALL_CONNECTED;
    sound.stop();
    ioClient.emit('reply', {'result': 'accept', 'from': uid, 'to': remoteUid});
  };

  that.refuse = function() {
    if (state !== State.CALL_RING) return;
    state = State.USUAL;
    sound.stop();
    ioClient.emit('reply', {'result': 'refuse', 'from': uid, 'to': remoteUid});
  };

  that.hangup = function() {
    if (state === State.CALL_WAIT || state === State.CALL_CONNECTED) {
      rtc.hangup();
      sound.stop();
      state = State.USUAL;
      ioClient.emit('hang-up', {'from': uid, 'to': remoteUid});
    }
  };



  return that;
}