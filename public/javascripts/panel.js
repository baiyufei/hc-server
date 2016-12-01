function panelGenerator() {
  var _fcpClient = fcpSignalClient('http://127.0.0.1:3000');
  var _users; // map    uid---user
  var that = {};
  _fcpClient.setDataCallback(dataCallback);

  // fcp signal client will call these functions
  var eventCallback = {
    callSuccess: function(uid) {
      call.target = _users[uid].name;
      call.seen = true;
    },
    accept: function() {
      call.seen = false;
      talk.seen = true;
    },
    end: function() {
      talk.seen = false;
      call.seen = false;
      callee.seen = false;
    },
    calleeAccept: function() {
      callee.seen = false;
      talk.seen = true;
    },
    calleeRefuse: function() {
      callee.seen =false;
    },
    call: function() {
      callee.seen = true;
    },
    loginSuccess: function() {
      loginList.seen = false;
      loginInfo.seen = true;
      chooseInfo.seen = false;
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
        _fcpClient.groupCallId(this.group.id);
      }
    }
  });

  Vue.component('loginItem', {
    props: ['name'],
    template: '<li @click="login"><a> {{ name }}</a></li>',
    methods: { login: function() {
      _fcpClient.nameLogin(this.name);
      loginInfo.name = this.name;
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
      name: ""
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
      contact.users = data;
      _users = {};
      for (var i = 0; i < data.length; i++) {
        _users[data[i].uid] = data[i];
      }
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




  _fcpClient.getUserList();

  return that;
}

var panel = panelGenerator();


