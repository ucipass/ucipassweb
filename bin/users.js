
/************************************************************************
This Library processes and responds to ioData database requests
type:	value defines sqlite3 database name without .db extenstions 
id:		user id
attributes: abbreviated by (att) includes all the data
att.cmd:			ioData command like 'get_dbnames'
att.dbname:			database name
att.tablename:		table name
att.data.table:		Array of Array of unformatted table with the data
att.data.columns:	Array Column header names
att.data.oldRow:	Array old row to be updated or deleted
att.data.newRow:	Array new row to be updated or inserted(replace)
att.filter.col:		Array Column filter strings used with like '%att.filter.col#'
att.filter.not:		boolean for NOT like '%att.filter.col#'
att.filter.limit:	String for limiting the results
*************************************************************************/
var path = require("path")
var log = require('./logger.js').loggers.get('USERS');
var dbname = path.join(__dirname, "../db/", "users.db")
var JSONData = require('./jsondata.js');
var ioData = new JSONData();
var express = require('express');
var router = express.Router();
var db = require('./lib_sqlite.js');

router.get("/", function (req, res) {
	res.render('users',{title:"Users" ,user:req.user?req.user.id:null ,message: "Users",redir:req.query.redir });
	});

router.post("/", users); 

function users(req, res) {	// All data is posted here with the exception if login

	if (req.body.data){
		ioData.setjson(req.body);
		log.info("RECV:",ioData.id(),ioData.att().cmd);
		log.debug("RECV ATT:",ioData.att());
	}
	else{
		log.error("POST INVALID: ",req.body);
		res.end("INVALID POST received by Nodejs!\n");
		return;
	}
	
	if (ioData.cmd() === "user_list") {
		var db = require('./lib_sqlite.js');
		db.sReadTable(dbname,"users",["id","username"])
		.then(data => {
			ioData.json.error = null;
			ioData.json.data.type = ioData.json.data.type+'-reply';
			ioData.json.data.attributes.data = data;
			log.info('SEND:', ioData.id(),  ioData.cmd(), "reply");
			res.json(ioData.getjson()); //THIS IS WHERE THE RESPONSE IS SENT
			return;
		})
		.catch( e => {
			ioData.json.error = e;
			ioData.json.data.type = ioData.json.data.type+'-error';
			ioData.json.data.attributes.data = null;
			log.error('SEND:', ioData.type(),'ID:',ioData.id()+" ATT:"+ ioData.attributes());
			res.json(ioData.getjson()); //THIS IS WHERE THE RESPONSE IS SENT
			return;			
		})
	}
	else if (ioData.cmd() === "user_add") {
		var id = ioData.att().id;
		var password = ioData.att().password
		var salt = "1234567890"
		var crypto = require('crypto');
		var hash = crypto.createHash('sha256');
		hash.update(password);
		hash.update(salt);
		var digest = hash.digest('hex');
		var table 	= "users"
		var columns = ["id","username","salt","password"]
		var newrow 	= [id,id,salt,digest]

		var db = require('./lib_sqlite.js');
		db.sInsertRow(dbname,table,columns,newrow)
		.then(data => {
			ioData.json.error = null;
			ioData.json.data.type = ioData.json.data.type+'-reply';
			ioData.json.data.attributes.data = data;
			log.info('SEND:', ioData.id(),  ioData.cmd(), "reply");
			res.json(ioData.getjson()); //THIS IS WHERE THE RESPONSE IS SENT
			return;
		})
		.catch( e => {
			ioData.json.error = e;
			ioData.json.data.type = ioData.json.data.type+'-error';
			ioData.json.data.attributes.data = null;
			log.error('SEND:', ioData.type(),'ID:',ioData.id()+" ATT:"+ ioData.attributes());
			log.error(e)
			res.json(ioData.getjson()); //THIS IS WHERE THE RESPONSE IS SENT
			return;			
		})
	}
	else if (ioData.cmd() === "user_del") {
		var table 	= "users"
		var id = ioData.att().id;
		var columns = ["id"]
		var oldRow 	= [id]
		var db = require('./lib_sqlite.js');
		db.sDeleteRow(dbname,table,columns,oldRow)
		.then(data => {
			ioData.json.error = null;
			ioData.json.data.type = ioData.json.data.type+'-reply';
			ioData.json.data.attributes.data = data;
			log.info('SEND:', ioData.id(),  ioData.cmd(), "reply");
			res.json(ioData.getjson()); //THIS IS WHERE THE RESPONSE IS SENT
			return;
		})
		.catch( e => {
			ioData.json.error = e;
			ioData.json.data.type = ioData.json.data.type+'-error';
			ioData.json.data.attributes.data = null;
			log.error('SEND:', ioData.type(),'ID:',ioData.id()+" ATT:"+ ioData.attributes());
			log.error(e)
			res.json(ioData.getjson()); //THIS IS WHERE THE RESPONSE IS SENT
			return;			
		})
	}
	else if (ioData.cmd() === "user_pwd") {
		var table 	= "users"
		var id = ioData.att().id;
		var columns = ["id","username","salt","password"]
		var oldRow 	= [id]
		var password = ioData.att().password
		var salt = "1234567890"
		var crypto = require('crypto');
		var hash = crypto.createHash('sha256');
		hash.update(password);
		hash.update(salt);
		var digest = hash.digest('hex');
		var newRow = [id,id,salt,digest]
		var db = require('./lib_sqlite.js');
		db.sUpdateRow(dbname,table,columns,oldRow,newRow)
		.then(data => {
			ioData.json.error = null;
			ioData.json.data.type = ioData.json.data.type+'-reply';
			ioData.json.data.attributes.data = data;
			log.info('SEND:', ioData.id(),  ioData.cmd(), "reply");
			res.json(ioData.getjson()); //THIS IS WHERE THE RESPONSE IS SENT
			return;
		})
		.catch( e => {
			ioData.json.error = e;
			ioData.json.data.type = ioData.json.data.type+'-error';
			ioData.json.data.attributes.data = null;
			log.error('SEND:', ioData.type(),'ID:',ioData.id()+" ATT:"+ ioData.attributes());
			log.error(e)
			res.json(ioData.getjson()); //THIS IS WHERE THE RESPONSE IS SENT
			return;			
		})
	}
	else {
		ioData.json.error = "no matching command";
		ioData.json.data.type = ioData.json.data.type+'-nomatch';
		ioData.json.data.attributes.data = null;
		log.error('SEND:', ioData.type(),'ID:',ioData.id()+" ATT:"+ ioData.attributes());
		res.json(ioData.getjson()); //THIS IS WHERE THE RESPONSE IS SENT
		return;	
	}

}

class Users{
    //Return promise with json object except check_password which is true/false
    constructor(dbname){
        this.json =  {dbname:dbname} ;
    }

    init(){
        return db.open( this.json )
		.then(db.stm("CREATE TABLE IF NOT EXISTS users (id NOT NULL, username NOT NULL, salt NOT NULL ,password NOT NULL, PRIMARY KEY (id)) "))
        .then(db.write)
        .then(db.close) 
    }
    create_user(id,password){

        var crypto = require('crypto');
        var hash = crypto.createHash('sha256');
        var salt = "1234567890"
        hash.update(password);
        hash.update(salt);
        var digest = hash.digest('hex');
        var table 	= "users";
        var columns = ["id","username","salt","password"]
        var newrow 	= [id,id,salt,digest]

       return  db.open(this.json)
        .then(db.insertRow(table,columns,newrow))
        .then(db.close)
        
    }
    delete_user(id){
       return  db.open(this.json)
        .then(db.deleteRow("users",["id"],[id]))
        .then(db.close)
    }
    check_password(id,password){
        var columns = ["id","username","salt","password"]
        return db.open(this.json)
        .then( db.readTable("users",columns,[[true,"id","IS",id]]) )
        .then( db.close)
        .then( json => {
            if( !json.results || !json.results[json.results.length-2].table || !json.results[json.results.length-2].table[0]) {
                return false
            }
            var row = json.results[json.results.length-2].table[0]
            var salt = row[2]
            var dbpass = row[3]
            var crypto = require('crypto');
            var hash = crypto.createHash('sha256');
            var salt = "1234567890"
            hash.update(password);
            hash.update(salt);
            var digest = hash.digest('hex');
            if (digest == dbpass) {
                return true
            }
            else {
                return false
            }
        })
        
    }
    change_password(id,password){ 
        var table 	= "users"
        var columns = ["id","username","salt","password"]
        var oldRow 	= [id]
        var salt = "1234567890"
        var crypto = require('crypto');
        var hash = crypto.createHash('sha256');
        hash.update(password);
        hash.update(salt);
        var digest = hash.digest('hex');
        var newRow = [id,id,salt,digest]
        var db = require('../bin/lib_sqlite.js');
        //db.updateRow(table,columns,oldRow,newRow)
        return db.open(this.json)
        .then( db.updateRow(table,columns,oldRow,newRow) )
        .then( db.close)
    }


}

exports.router = router;
exports.Users = Users;