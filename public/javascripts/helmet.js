var AndroidId = Android.getAid();
document.getElementById('aid').innerHTML = AndroidId;

var user = fcpSignalClient('http://192.168.1.101:3000');

user.setAid(AndroidId);
user.aidLogin();

/* BUTTON */
document.onkeydown = keyDown;
document.onkeyup = keyUp;

var lastKeycode = 0;
var keyCount = 0;

function keyDown(e) {
    var keycode = e.which;
    if (lastKeycode === 0) {
        lastKeycode = keycode;
    }
    else if (lastKeycode !== keycode) {
        return;     // forbid combined key
    }

    keyCount++;
    if (keyCount === 5) {
        var index = keycode - 111;  // 'F1' is 112
        user.buttonLongPress(index);
        Android.showToast(index + " long press start")
    }
}

function keyUp(e) {
    var keycode = e.which;
    if (lastKeycode !== keycode) {
        return;
    }
    var index = keycode - 111;
    if (keyCount > 4) {

        user.buttonLongUp();
        Android.showToast(index + " long press end")
    }
    else {
        user.buttonClick(index);
        Android.showToast(index + " click")
    }
    lastKeycode = 0;
    keyCount = 0;
}