function fcpSound() {
  var names = ['busy','duplication','hangup','login-success','no-card','offline','refuse','no-user'];
  var audios = {};
  var audioNow = null;

  function addAudio(name, loop) {
    var audio = new Audio('sound/' + name +'.mp3');
    if (loop) {
      audio.loop = true;
    }
    audios[name] = audio;
  }

  for (var i = 0; i < names.length; i++) {
    addAudio(names[i], false);
  }
  addAudio('ring', true);
  addAudio('wait', true);

  return {
    'play': function(name) {
      if (audioNow !== null) {
        audioNow.currentTime = 0;
        audioNow.pause();
      }
      audioNow = audios[name];
      if (audioNow !== undefined) {
        audioNow.play();
      }
    },
    'stop': function() {
      if (audioNow !== null) {
        audioNow.currentTime = 0;
        audioNow.pause();
        audioNow = null;
      }
    }
  };
}
