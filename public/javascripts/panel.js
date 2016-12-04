function panelGenerator() {
  var _fcpClient = fcpSignalClient('http://127.0.0.1:3000');
  var _users; // map    uid---user
  var _loginUid;
  var that = {};
  _fcpClient.setDataCallback(dataCallback);

  // fcp signal client will call these functions
  var eventCallback = {
    callSuccess: function(uid) {
      call.target = _users[uid].name;
      call.src = 'images/' + uid + '.jpg';
      call.seen = true;
      mask.seen = true;
    },
    accept: function() {
      call.seen = false;
      talk.seen = true;
      mask.seen = true;
      talk.target = call.target;
      talk.src = call.src;
    },
    end: function() {
      talk.seen = false;
      call.seen = false;
      callee.seen = false;
      groupCall.seen = false;
      groupCallee.seen = false;
      mask.seen = false;
    },
    calleeAccept: function() {
      callee.seen = false;
      talk.seen = true;
      mask.seen = true;
    },
    calleeRefuse: function() {
      callee.seen =false;
      mask.seen = false;
    },
    call: function(uid) {
      callee.seen = true;
      mask.seen = true;
      callee.target = _users[uid].name;
      callee.src = 'images/' + uid + '.jpg';
    },
    groupCall: function(uid) {
      groupCallee.from = _users[uid].name;
      groupCallee.seen = true;
      mask.seen = true;
    },
    groupCallAddClient: function(uid) {
      groupCall.clients.push(_users[uid].name);
    },
    loginSuccess: function(uid) {
      loginList.seen = false;
      chooseInfo.seen = false;
      _loginUid = uid;
      loginInfo.src = 'images/' + uid + '.jpg';
      loginInfo.seen = true;
    }
  };

  _fcpClient.setEventCallback(eventCallback);

  Vue.component('user', {
    props: ['user'],
    template: '<div style="display: block" class="blue user-show hoverable white-text waves-effect waves-light" @click="call" :class="{\'lighten-4\': !user.online}"><img :src="user.src"><h4>{{ user.name }}</h4> <h5>{{ user.org }}</h5></div>',
    methods: {
      call: function() {
        _fcpClient.callUid(this.user.uid);
      }
    }
  });

  Vue.component('group', {
    props: ['group'],
    template: '<div style="display: block" @click="groupCall" class="card-panel grey lighten-1 hoverable waves-effect">{{ group.name }} <span class="manager"> 管理员：</span>{{ group.owner }} <div><span v-for="user in group.member" :class="{online: user.online}">{{user.name}} </span></div></div>',
    methods: {
      groupCall : function() {
        groupCall.clients = [];
        _fcpClient.groupCallId(this.group.id);
        groupCall.name = this.group.name;
        groupCall.seen = true;
        mask.seen = true;
      }
    }
  });

  Vue.component('loginItem', {
    props: ['name'],
    template: '<li @click="login"><a class="blue-text text-darken-2"> {{ name }}</a></li>',
    methods: { login: function() {
      _fcpClient.nameLogin(this.name);
    }}
  });

  var chooseInfo = new Vue({
    el: '#choose',
    data: {seen: true}
  });

  var loginList = new Vue({
    el: '#loginList',
    data: {
      names: [],
      seen: true
    }
  });

  var loginInfo = new Vue({
    el: '#loginInfo',
    data: {
      seen: false,
      name: "",
      org: "",
      src: ""
    }
  });

  var groups = new Vue({
    el: '#groups',
    data: {
      groups: [],
      seen: true
    }
  });




  function dataCallback(type, data) {
    if (type === "valid-user-list") {
      loginList.names = data;
    }
    else if (type === "contacts") {

      // update contacts, filter self
      contact.users = data.filter(function(item) {return item.uid != _loginUid});
      contact.users.forEach(function(item) {item.src = 'images/' + item.uid + '.jpg'});

      // update _users
      _users = {};
      for (var i = 0; i < data.length; i++) {
        _users[data[i].uid] = data[i];
      }

      var user = _users[_loginUid];
      loginInfo.name = user.name;
      loginInfo.org = user.org;
    }
    else if (type ==="group-info") {
      groups.groups = data;
    }
  }




  var contact = new Vue({
    el: '#contact',
    data: {
      users: [
      ],
      seen: true
    }
  });

  // the card pop-up after calling
  var call = new Vue({
    el: '#call',
    data: {
      target: "",   // callee's user name
      seen: false,
      src: ""
    },
    methods: {
      hangup: function() { _fcpClient.hangup(); }
    }
  });

  // the card pop-up after receiving a call
  var callee = new Vue({
    el: '#callee',
    data: {
      target: "",   // call's user name
      src: "",
      seen: false
    },
    methods: {
      accept: function() {
        _fcpClient.accept();
        talk.target = this.target;
        talk.src = this.src;
      },
      refuse: function() { _fcpClient.refuse(); }
    }
  });

  // the card pop-up when talking
  var talk = new Vue({
    el: '#talk',
    data: {
      target: "",
      seen: false,
      src: ""
    },
    methods: {
      hangup: function() { _fcpClient.hangup();}
    }
  });

  // the card pop-up when start a group call
  var groupCall = new Vue({
    el: '#groupCall',
    data: {
      seen: false,
      name: "",
      clients: []
    },
    methods: {
      hangup: function() {
        _fcpClient.hangup();
        this.seen = false;
        mask.seen = false;
      }
    }
  });

  // the card pop-up when receive a group call
  var groupCallee = new Vue({
    el: '#groupCallee',
    data: {
      seen: false,
      from: ""
    }
  });

  var mask = new Vue({
    el: '#mask',
    data: {seen: false}
  });






  _fcpClient.getUserList();


  function show(seen) {
    loginInfo.seen = seen[0];
    contact.seen = seen[1];
    groups.seen = seen[2];
  }

  // used for Tab
  that.showLoginInfo = function() {
    show([true, false, false]);
  };
  that.showContact = function() {
    show([false, true, false]);
  };
  that.showGroup = function() {
    show([false, false, true]);
  };

  return that;
}

var panel = panelGenerator();
