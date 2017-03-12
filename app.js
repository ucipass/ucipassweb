var app     = require('./bin/www.js').app			// express.js
var server  = require('./bin/www.js').server		// http server to start service at the end
var auth 	= require('./bin/auth.js');			// Authentication middleware using Passport (using "app")

function root(req,res){
	res.render('index',{
		title:"Login" ,
		user:req.user?req.user.id:null ,
		message: "Welcome!",
		redir:req.query.redir });
	}

app.post('/login' ,auth.login); //Just redirects to either login or original URL
app.post('/logout',auth.logout); //just redirects to login page
app.get('/login', root);
app.get('/', auth.alreadyLoggedIn, root);

var users 	= require('./bin/users.js');
app.use("/users",auth.alreadyLoggedIn,users)

//
// CATCH ALL BAD ONE REQUEST
//
app.use(function(req, res, next) {
	var message ="<p>Invalid URL! Your session is being logged! Unauthorized access to this site is strictly prohibited!</p>"
	message += "<p>"+req.clientIp+"</p>"	
	res.status(404).send(message);
});



