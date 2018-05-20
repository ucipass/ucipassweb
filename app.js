var path	= require("path")
var app     = require('./bin/www.js').app		// Express.js
var auth 	= require('./bin/auth.js');			// Authentication middleware using Passport (using "app")
var users 	= require('./bin/users.js').router;	// Router for User Management




function root(req,res){
	res.render('index',{
		title:"Login" ,
		user:req.user?req.user.id:null ,
		message: "Welcome!",
		redir:req.query.redir });
	}

app.post('/login' ,auth.login);		//Just redirects to login page or original URL based on ?redir=
app.post('/logout',auth.logout);	//just redirects to login page
app.get( '/login', root);
app.get( '/', auth.alreadyLoggedIn,root);
app.use( "/users",auth.alreadyLoggedIn,users)


//
// CATCH ALL BAD ONE REQUEST
//
app.use(function(req, res, next) {
	var message ="<p>Invalid URL! Your session is being logged! Unauthorized access to this site is strictly prohibited!</p>"
	message += "<p>"+req.clientIp+"</p>"	
	res.status(404).send(message);
});

module.exports = app;


