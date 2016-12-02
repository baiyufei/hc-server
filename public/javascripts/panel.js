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
      call.seen = true;
      mask.seen = true;
    },
    accept: function() {
      call.seen = false;
      talk.seen = true;
      mask.seen = true;
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
    call: function() {
      callee.seen = true;
      mask.seen = true;
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
      loginInfo.seen = true;
      chooseInfo.seen = false;
      _loginUid = uid;
    }
  };

  _fcpClient.setEventCallback(eventCallback);

  Vue.component('user', {
    props: ['user'],
    template: '<div class="row"><div class="col s12"><div class="card-panel hoverable grey"><div class="row"><div class="col s8"><div>{{ user.name }}</div><div>{{ user.org }}</div></div><div class="col s4"><a @click="call" class="waves-effect waves-light btn green">call</a></div></div> </div></div></div> ',
    methods: {
      call: function() {
        _fcpClient.callUid(this.user.uid);
      }
    }
  });

  Vue.component('group', {
    props: ['group'],
    template: '<div> {{ group.name }} {{ group.owner }} <div v-for="user in group.member">{{user.name}}</div><a @click="groupCall" class="waves-effect waves-light btn green">群组语音</a></div>',
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
    template: '<li @click="login"><a> {{ name }}</a></li>',
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
      org: ""
    }
  });

  var groups = new Vue({
    el: '#groups',
    data: {groups: []}
  });




  function dataCallback(type, data) {
    if (type === "valid-user-list") {
      loginList.names = data;
    }
    else if (type === "contacts") {

      // update contacts, filter self
      contact.users = data.filter(function(item) {return item.uid != _loginUid});

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
      ]
    }
  });

  var call = new Vue({
    el: '#call',
    data: {
      target: {},
      seen: false
    },
    methods: {
      hangup: function() { _fcpClient.hangup(); }
    }
  });

  var callee = new Vue({
    el: '#callee',
    data: {
      target: {},
      seen: false
    },
    methods: {
      accept: function() {
        _fcpClient.accept();
      },
      refuse: function() { _fcpClient.refuse(); }
    }
  });

  var talk = new Vue({
    el: '#talk',
    data: {
      target: {},
      seen: false
    },
    methods: {
      hangup: function() { _fcpClient.hangup();}
    }
  });

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

  return that;
}

var panel = panelGenerator();


