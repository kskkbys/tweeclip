var express = require('express')
  , routes = require('./routes')
  , log4js = require('log4js')
  , everyauth = require('./everyauth2')
  , RedisStore = require('connect-redis')(express)
  , conf = require('./conf');

// logger
var log = log4js.getLogger('tweeclip');
log.setLevel('debug');

/**
 * Twitter OAuth
 */
var usersById = {}
  , nextUserId = 0
  , usersByTwitId = {};
function addUser (source, sourceUser) {
  var user;
  user = usersById[++nextUserId] = {id: nextUserId};
  user[source] = sourceUser;
  return user;
}
// Find user by id
everyauth.everymodule
  .findUserById( function (id, callback) {
    callback(null, usersById[id]);
  });
//
everyauth
  .twitter
  .consumerKey(conf.twit.consumerKey) 
  .consumerSecret(conf.twit.consumerSecret) 
  .findOrCreateUser( function (sess, accessToken, accessSecret, twitUser) {
    twitUser.accessToken = accessToken;
    twitUser.accessSecret = accessSecret;
    return usersByTwitId[twitUser.id] || (usersByTwitId[twitUser.id] = addUser('twitter', twitUser));
  })
  .redirectPath('/');

/**
 * create server, listening port is 3000.
 */
var app = express.createServer();
app.configure(function () {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  // auth
  app.use(express.cookieParser());
  app.use(express.session({
    secret: 'tweeclip',
    store: new RedisStore(),
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } //1 week
  }));
  app.use(everyauth.middleware());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

// routes

app.get('/', routes.index);
app.get('/list/:id', routes.list)

// Start sever

everyauth.helpExpress(app);
app.listen(3000);
