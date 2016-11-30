function panelGenerator() {
  var _fcpClient = fcpSignalClient('http://127.0.0.1:3000');
  var _users; // map    uid---user
  var that = {};
  _fcpClient.setDataCallback(dataCallback);

  // fcp signal client will call these functions
  var eventCallback = {
    callSuccess: function(uid) {
      call.target = _users[uid].name;
    },
    loginSuccess: function() {
      loginList.seen = false;
    }
  };

  _fcpClient.setEventCallback(eventCallback);

  Vue.component('user', {
    props: ['user'],
    template: '<div :class="{online: user.online ,offline: !user.online}">{{ user.name }} {{ user.org }} <a @click="call" class="waves-effect waves-light btn green lighten-1">call</a></div> ',
    methods: {
      call: function() {
        _fcpClient.callUid(this.user.uid);
      }
    }
  });

  Vue.component('group', {
    props: ['group'],
    template: '<div> {{ group.name }} {{ group.owner }} <div v-for="uid in group.users">{{uid}}</div></div>'
  });


  var loginList = new Vue({
    el: '#loginList',
    data: {
      names: [],
      selected: 0,
      seen: true
    },
    methods: {
      login: function() {
        _fcpClient.nameLogin(this.selected);
      }
    }
  });

  var groups = new Vue({
    el: '#groups',
    data: {
      groups: [{
        name: "小组1",
        owner: "小白",
        users: ["100001", "100002"]
      }, {
        name: "小组2",
        owner: "小黑",
        users: ["100003", "100002"]
      }]
    }
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
      target: {}
    },
    methods: {
      hangup: function() { _fcpClient.hangup(); }
    }
  });

  var callee = new Vue({
    el: '#callee',
    data: {
      target: {}
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
      target: {}
    },
    methods: {
      hangup: function() { _fcpClient.hangup();}
    }
  });




  _fcpClient.getUserList();

  return that;
}

var panel = panelGenerator();


