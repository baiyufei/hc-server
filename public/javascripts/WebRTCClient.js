'use strict';

function webRTCClient(ioWebRTC) {
  var uid;

  var pcList = [];
  var pcMap = {};   // targetUid -- pc

  var audio = document.getElementById('audio');
  var localStream;  // recorder stream

  navigator.mediaDevices.getUserMedia({audio: true, video: false}).
    then(function(stream) {
      localStream = stream;
      var audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        trace('Using Audio device: ' + audioTracks[0].label);
      }
    }).
    catch(function(e) {
      alert('getUserMedia() error: ' + e.name);
    });



  var mode; // 'single' or 'group'

  var offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 0,
    voiceActivityDetection: false
  };

  var that = {
    setLocalUid: function(_uid) {
      uid = _uid;
      // ioWebRTC.emit('join', {"uid": uid});
    },
    call: function(target) {
      if (pcList.length !== 0) {
        trace('Starting call fail because the last call is not over yet.');
        return;
      }
      mode = 'single';
      trace('Starting call to ' + target);
      rtcStart(target);
    },
    groupCall: function(targetList) {
      if (pcList.length !== 0) {
        trace('Starting call fail because the last call is not over yet.');
        return;
      }
      mode = 'group';
      trace('Starting call to ' + targetList.join(' '));
      for (var i = 0; i < targetList.length; i++) {
        var target = targetList[i];
        rtcStart(target);
      }
    },
    hangup: function() {
      trace('Ending call');
      // because only get recorder once, so here don't close the recorder.
      /*
      localStream.getTracks().forEach(function(track) {
        track.stop();
      });*/
      for (var i = 0; i < pcList.length; i++) {
        pcList[i].close();
        pcList[i] = null;
      }
      pcList = [];
      pcMap = {};
    }
  };

  /**
   * start a WebRTC communication
   * create a pc , add recorder stream to pc, then pc create an offer
   * the offer will be sent to another device by hc-server
   * @param target
   */
  function rtcStart(target) {
    var pc = pcGenerator(target);
    pc.addStream(localStream);
    pc.createOffer(
        offerOptions
    ).then(
        pc.extendedFunc.sendDescription,
        onCreateSessionDescriptionError
    );
  }

  /**
   * generator a pc to target uid
   * @param _target target uid
   * @returns {RTCPeerConnection}
   */
  function pcGenerator(_target) {
    var servers = null; // used for Nat
    var pcConstraints = {
      'optional': []
    };
    var target = _target;
    if (pcMap[target] !== undefined) {
      trace('create pc error, already exites target uid');
      return null;
    }
    var pc = new RTCPeerConnection(servers, pcConstraints);
    trace('Created local peer connection object pc');

    pcList.push(pc);
    pcMap[target] = pc;

    pc.onicecandidate = iceCallback;
    pc.onaddstream = gotRemoteStream;

    function iceCallback(event) {
      if (event.candidate) {
        ioWebRTC.emit('WebRTC', {'from': uid, 'to' :target, 'candidate': event.candidate, 'type': 'ice'});
      }
    }

    function gotRemoteStream(e) {
      audio.srcObject = e.stream;
      trace('Received remote stream');
    }

    pc.extendedFunc = {
      sendDescription :function(desc) {
        pc.setLocalDescription(desc).then(
          function() {
            ioWebRTC.emit('WebRTC', {'from': uid, 'to' :target, 'desc': desc, 'type': 'new_desc', 'mode': mode});
          },
          onSetSessionDescriptionError
        );
      },
      answerDescription: function (desc) {
        pc.setLocalDescription(desc).then(
          function() {
            ioWebRTC.emit('WebRTC', {'from': uid, 'to' :target, 'desc': desc, 'type': 'answer_desc'});
          }
          ,
          onSetSessionDescriptionError
        );
      }
    };

    return pc;
  }

  /*
   * WebRtc connect
   */

  ioWebRTC.on('connect', function () {
  });

  ioWebRTC.on('new_desc', function(msg) {
    // other device call, create a pc to connect with the device
    var pc = pcGenerator(msg.from);

    if (msg.mode === 'single') {
      pc.addStream(localStream);
    }

    pc.setRemoteDescription(msg.desc).then(
        function() {
          pc.createAnswer().then(
            pc.extendedFunc.answerDescription,
            onCreateSessionDescriptionError
          );
        },
        onSetSessionDescriptionError
      );
  });

  ioWebRTC.on('answer_desc', function(msg) {
    var target = msg.from;
    var pc = pcMap[target];
    if (pc === null) return;
    pc.setRemoteDescription(msg.desc).then(
      function() {
      },
      onSetSessionDescriptionError
    );
  });

  ioWebRTC.on('ice', function (msg) {
    var pc = pcMap[msg.from];
    pc.addIceCandidate(
      new RTCIceCandidate(msg.candidate)
    ).then(
      onAddIceCandidateSuccess,
      onAddIceCandidateError
    );
  });

  /*
   * WebRTC info prompt
   */

  function onAddIceCandidateSuccess() {
    trace('AddIceCandidate success.');
  }

  function onAddIceCandidateError(error) {
    trace('Failed to add ICE Candidate: ' + error.toString());
  }

  function onSetSessionDescriptionError(error) {
    trace('Failed to set session description: ' + error.toString());
  }

  function onCreateSessionDescriptionError(error) {
    trace('Failed to create session description: ' + error.toString());
  }

  return that;

  // Logging utility function.
  function trace(arg) {
    var now = (window.performance.now() / 1000).toFixed(3);
    console.log(now + ': ' + arg);
  }
}
