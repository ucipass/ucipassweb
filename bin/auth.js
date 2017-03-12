var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var app = require('./www.js').app;
var log = require('./logger.js').loggers.get('AUTH');

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(function(username, password, done) {  // THIS MUST come from POST on body.username and body.passport
	//return done(null, {id:"test"});
	log.debug("LocalStrategy: Attempt with User:",username,password);
	var sqlite3 = require('sqlite3');
	var db = new sqlite3.Database('./db/users.db');
	db.get('SELECT id,username,password,salt FROM users WHERE id = ?', username, function(err, row) {
		if (!row) {
			log.error("LocalStrategy FAILED: Username:",username,"does not exist!");
			return done(null, false);
			}
		var crypto = require('crypto');
		var hash = crypto.createHash('sha256');
			hash.update(password);
			hash.update(row.salt);
			var digest = hash.digest('hex');
		if (digest === row.password) {
			log.debug("Password Match for user:",username);
			return done(null, {id:username});	// PASSPORT puts this in the user object for serialization
			}
		else{
			log.error("LocalStrategy - FAILED: Invalid password for Username:",username,"Password:",password);
			return done(null, false);
			}
	  });
	}))

passport.serializeUser(function(user, done) {
	log.debug("Serialize User:",user);		// THIS IS WHERE THE user id is supposed to be put in an external session db)
	return done(null, user.id);
	})

passport.deserializeUser(function(id, done) {
	//console.log("AUTH - DeSerialize User:", id);
	log.debug("DeSerialize User:" + id);
	//if (!myusers[id]) {return done(null, false);}
	return done(null, {id:id});    // THIS IS WHERE THE user id is supposed to be removed from external session db)
	})

var auth = {}

auth.alreadyLoggedIn = function(req, res, next) {
	if (req.isAuthenticated()){
		//console.log("AUTH - ALREADY LOGGED IN");
		return next();
		}
	log.error("AUTH - NOT LOGGED IN, REDIRECTING TO LOGIN!","IP:",req.clientIp);
	res.redirect('/login?redir='+req.originalUrl);
	}

auth.login = function(req, res, next) {
	passport.authenticate('local', function(err, user, info) {				// LOGIN SEND post data to LocalStrategy body.username body.passport to CHECK11
		log.debug("authenticate: Username",user,"IP:",req.clientIp);										// LocalStrategy returns user object
		if (err) { log.error("authenticate ERROR:","IP:",req.clientIp);return next(err); }                    //If error return next with error
		if (!user) { log.error("authenticate: Invalid User ID Redirecting!","IP:",req.clientIp);return res.redirect('/login'); }  //If user is not there redirect it to login page
		req.logIn(user, function(err) {                                     //Request the actual Login from passport user object will be par or 'req'
			if (err) { 
				log.error("authenticate - ERROR User:",user,"IP:",req.clientIp)
				return next(err); //If error return next with error
				}				                    
			// ONCE LOGING IS COMPLETE!!!!
			log.info("authenticate - SUCCESS: User:",user,"IP:",req.clientIp)
			return res.redirect(req.body.redir ? req.body.redir : "/");
			});
			})(req, res, next);												// Go to next function
	}

auth.logout = function(req, res, next) {
	log.info("LOGOUT:", ( req.user !== undefined ? req.user: 'Anonnymous'));
	req.logOut();										// logout
	req.session.destroy(function(){						// delete the auth session 
		res.redirect('/login?redir='+req.body.redir);	// redir is sent from the logout header via JSON
		});								
	}

module.exports = auth ;