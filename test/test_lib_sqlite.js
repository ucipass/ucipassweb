//Mocha Test

var assert = require('assert')
var fs = require('fs')
var should = require('chai').should();
var db = require("../bin/lib_sqlite");


describe('in Memory Database Tests', function(){
  var json = {
      dbname:":memory:", 
      sqlstm: null,
      dbro:0, // optional
      dblog:0 // optional
  }

  it('Open DB', function(){
    db.open(json)
    //.then( ()=>{ console.log(json) })
    .then( ()=>{ json.db.open.should.equal(true) })
  });

  it('Create table in Memory', function(){
    return db.createTable("t1",[["f1","TEXT"],["f2","TEXT"]])(json)
    .then( db.readTable("t1") )
    .then( json=> json.results.slice(-1)[0].table.should.have.length(0) )
  });
  it('Create 1 row in Memory', function(){
    return db.insertRow( "t1", ["f1","f2"], ["a1","a2"])(json)
    .then( db.readTable("t1") )
    .then( json=> json.results.slice(-1)[0].table.should.have.length(1) )
  });
  it('Create 2 more rows in Memory', function(){
    return db.insertRows("t1", ["f1","f2"], [ ["b1","b2"], ["c1","c2"] ])(json)
    .then( db.readTable("t1") )
    .then( json=> json.results.slice(-1)[0].table.should.have.length(3) )
  });

  it('Close DB', function(){
    db.close(json)
    //.then( ()=>{ console.log(json) })
    .then( ()=>{ json.db.open.should.equal(false) })
  });
})

describe('File Database Tests', function(){
  var json = {
      dbname:"mocha_test.db", 
      sqlstm: null,
      dbro:0, // optional
      dblog:0 // optional
  }

  it('Open DB', function(){
    return db.open(json)
    //.then( ()=>{ console.log(json) })
    .then( ()=>{ json.db.open.should.equal(true) })
    .catch( (e) => { console.log("ASSERT Exception",e); assert(false,"Exception") })
  });
  it('Create table', function(){
    return db.createTable("t1",[["f1","TEXT"],["f2","TEXT"]])(json)
    .then( db.readTable("t1") )
    .then( json=> json.results.slice(-1)[0].table.should.have.length(0) )
    .catch( (e) => { console.log("ASSERT Exception",e); assert(false,"Exception") })
  });
  it('Create 1 row', function(){
    return db.insertRow( "t1", ["f1","f2"], ["a1","a2"])(json)
    .then( db.readTable("t1") )
    .then( json=> json.results.slice(-1)[0].table.should.have.length(1) )
    .catch( (e) => { console.log("ASSERT Exception",e); assert(false,"Exception") })
  });
  it('Create 2 more rows', function(){
    return db.insertRows("t1", ["f1","f2"], [ ["b1","b2"], ["c1","c2"] ])(json)
    .then( db.readTable("t1") )
    .then( json=> json.results.slice(-1)[0].table.should.have.length(3) )
    .catch( (e) => { console.log("ASSERT Exception",e); assert(false,"Exception") })
  });
  it('Delete 1 row', function(){
    return db.deleteRow( "t1", ["f1","f2"], ["a1","a2"])(json)
    .then( db.readTable("t1") )
    .then( json=> json.results.slice(-1)[0].table.should.have.length(2) )
    .catch( (e) => { console.log("ASSERT Exception",e); assert(false,"Exception") })
  });
  it('Delete Table', function(){
    return db.dropTable( "t1" )(json)
    .then( ()=>{ json.db.open.should.equal(true) })
    .catch( (e) => { console.log("ASSERT Exception",e); assert(false,"Exception") })
  });
  it('Close DB', function(){
    if (!json.db.open){ 
      assert.fail("DB not Open anymore!") 
    }
    return db.close(json)
    .then( ()=>{ json.db.open.should.equal(false) })
    .catch( (e) => { console.log("ASSERT Exception",e); assert(false,"Exception") })
  });
  it('Delete File', function(){
    fs.access(json.dbname, fs.constants.R_OK | fs.constants.W_OK, (err) => {
      if (err){
        console.log("ASSERT Exception",e); assert(false,"Exception")
      }
      else { 
        fs.unlink(json.dbname,function(err){
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

