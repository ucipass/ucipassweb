// Mocha Test

var fs = require('fs')
var path = require('path')
var assert = require('assert')
var should = require('chai').should();
var db = require("../bin/lib_sqlite");
var dbfile = "users.db"

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

describe('Users Database Tests', function(){

  it('Init DB File', function(){
    var users = new Users(dbfile)
    return users.init()
    .then(db.open)
    .then(db.stm("select * from users where id = 'admin'"))
    .then(db.read)
    .then(db.close)
    .then( (json) => {
        //console.log(json.results) ; 
        json.results[json.results.length-2].size.should.equal(0)
    })
    .catch( (e) => {  assert(false) })
    
  });
  it('Create Admin and Test Users', function(){
    var users = new Users(dbfile)
    return users.init()
    .then(()=> users.create_user("admin","admin"))
    .then(()=> users.create_user("admin","admin"))
    .then(()=> users.create_user("test","test"))
    .then(db.open)
    .then(db.stm("select * from users"))
    .then(db.read)
    .then(db.close)
    .then( (json) => {
        //console.log(json.results) ; 
        json.results[json.results.length-2].size.should.equal(2)
    })
    .catch( (e) => {  assert(false) })
    
  });
  it('Delete Test User', function(){
    var users = new Users(dbfile)
    return users.delete_user("test","test")
    .then(db.open)
    .then(db.stm("select * from users where id = 'test'"))
    .then(db.read)
    .then(db.close)
    .then( (json) => {
        //console.log(json.results) ; 
        json.results.splice(-2)[0].size.should.equal(0)
    })
    .catch( (e) => {  assert(false) })
    
  });
  it('Check correct admin password', function(){
    var users = new Users(dbfile)
    return users.check_password("admin","admin")
    .then( (pass) => { pass.should.equal(true) } )
    .catch( (e) => {  assert(false) })
  });
  it('Check incorrect admin password', function(){
    var users = new Users(dbfile)
    return users.check_password("admin","adminn")
    .then( (pass) => { pass.should.equal(false) } )
    .catch( (e) => {  assert(false) })
  });
  it('Check incorrect username', function(){
    var users = new Users(dbfile)
    return users.check_password("adminn","adminn")
    .then( (pass) => { pass.should.equal(false) } )
    .catch( (e) => {  assert(false) })
  });
  it('Change Admin User Password', function(){
    var users = new Users(dbfile)
    return users.change_password("admin","admin1")
    .then( (json) => users.check_password("admin","admin1") )
    .then( (pass) => { pass.should.equal(true) } )
    .catch( (e) => {  assert(false) })
  });
  it('Delete DB File', function(){
    fs.access(dbfile, fs.constants.R_OK | fs.constants.W_OK, (err) => {
      if (err){
        console.log("ASSERT Exception",e); assert(false,"Exception")
      }
      else { 
        fs.unlink(dbfile,function(err){
          if (err){
            console.log("ASSERT Exception",e); assert(false,"Exception")
          }
          else{
            assert(true,"File Deleted")
          }
        })
      }
    });
  });

})

