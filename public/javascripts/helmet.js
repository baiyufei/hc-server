var AndroidId = Android.getAid();
document.getElementById('aid').innerHTML = AndroidId;

var user = fcpSignalClient('http://192.168.43.5:3000');

user.setAid(AndroidId);
user.aidLogin();
