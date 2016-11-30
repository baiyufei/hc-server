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
    CALL_GROUP_CALL:6,
    CALL_GROUP_CALLEE: 7
  };

  var uid;        // local client uid
  var remoteUid;
  var gUidList = [];   // group call uid list
  var state = State.OFF_LINE;

  ioClient.on('login-answer', function(msg) {
    if (msg.success) {
      uid = msg.uid;
      state = State.USUAL;
      rtc = webRTCClient(ioClient);
      rtc.setLocalUid(uid);
      sound.play('login-success');
      console.log("login success! Uid is " + uid);
      if (eventCallback !== undefined) {
        eventCallback.loginSuccess();
      }
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
      if (eventCallback !== undefined) {
        eventCallback.callSuccess(msg.from);
      }

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

  ioClient.on('group-call', function(msg) {
    if (state !== State.USUAL)
      return;
    ioClient.emit('group-call-answer', {'from': uid, 'to': msg.from, 'success': true});
    remoteUid = msg.from;
    state = State.CALL_GROUP_CALLEE;
  });

  ioClient.on('group-call-answer', function(msg) {
    if (state !== State.CALL_GROUP_CALL) {
      return;
    }
    gUidList.push(msg.from);
    rtc.groupCallSingle(msg.from);
  });

  ioClient.on('group-call-hang-up', function(msg) {
    if (state !== State.CALL_GROUP_CALLEE) {
      return;
    }
    rtc.hangup();
    state = State.USUAL;
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

  that.groupCall = function(index) {
    // index should be 1 ~ 3

    if (state !== State.USUAL)
      return;
    state = State.CALL_GROUP_CALL;
    ioClient.emit('group-call', {'from': uid, 'index': index});
  };

  that.hangup = function() {
    if (state === State.CALL_WAIT || state === State.CALL_CONNECTED) {
      rtc.hangup();
      sound.play("hangup");
      state = State.USUAL;
      ioClient.emit('hang-up', {'from': uid, 'to': remoteUid});
    }
    else if (state === State.CALL_GROUP_CALL) {
      rtc.hangup();
      sound.play("hangup");

      for (var i = 0; i < gUidList.length; i++) {
        var to = gUidList[i];
        ioClient.emit('group-call-hang-up', {'from': uid, 'to': to});
      }
      gUidList = [];

      state = State.USUAL;
    }
  };

  /** helmet operation **/

  that.buttonClick = function(index) {
    // index should be 1 ~ 3
    switch (state) {
      case State.USUAL:
        that.callIndex(index);
        break;
      case State.CALL_WAIT:
        that.hangup();
        break;
      case State.CALL_RING:
        if (index < 3) {
          that.accept();
        } else {
          that.refuse();
        }
        break;
      case State.CALL_CONNECTED:
        that.hangup();
        break;
      case  State.NOT_JOINED:
        that.aidLogin();
        break;
    }
  };

  that.buttonLongPress = function(index) {
    switch (state) {
      case State.USUAL:
        that.groupCall(index);
    }
  };

  that.buttonLongUp = function() {
    switch (state) {
      case State.CALL_GROUP_CALL:
        that.hangup();
    }
  };

  /** panel operation */

  /**
   * online get offline users, then we can choose one to login
   */
  that.getUserList = function() {
    ioClient.emit('panel', {type: 'valid-user-list'});
  };

  var dataCallback;
  that.setDataCallback = function(_dCb) {
    dataCallback = _dCb;
  };


  var eventCallback;
  that.setEventCallback = function(_eCb) {
    eventCallback = _eCb;
  };



  ioClient.on("panel", function(msg) {
    if (msg.type === "valid-user-list") {
      dataCallback(msg.type, msg.data);
    }
    dataCallback(msg.type, msg.data);
  });

  return that;
}
