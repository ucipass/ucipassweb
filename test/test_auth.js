// Mocha Test

var fs = require('fs')
var path = require('path')
var assert = require('assert')
var should = require('chai').should();
var db = require("../bin/lib_sqlite");
var dbfile = path.join(__dirname,"users.db")
var Users = require("../bin/users").Users

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

