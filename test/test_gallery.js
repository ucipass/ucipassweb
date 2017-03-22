var gallery = require("../bin/gallery")
var assert = require('assert')
var fs = require('fs')
var path = require('path')
var should = require('chai').should();


describe('Gallery Tests', function(){

    it('Init DB File', async function(){
        var json = new gallery.JSONGallery("test/gallery","test/gallery-init.db")    
        return gallery.initDB(json)
        .then( async () => {
            await new Promise( (resolve,reject) => { fs.unlink(json.dbname, ()=> resolve(1))  } )
            assert(true)
        })
    });

    it('Test Thumb Creation', async function(){
        var filename = path.join(__dirname,"../test/gallery",  "001.JPG")
        return gallery.getThumb( filename )
        .then(async (base64)=> {
            assert(true)
        })
        .catch((error)=> console.log("ERROR",error))
        
    });

    it.skip('Async TEst', async function(){
        //var resolve,reject
        //var final = new Promise((res,rej) => { resolve = res, reject = rej })
        //return final
        function delay (time){return new Promise((res,rej)=>{ setTimeout( ()=> {console.log("Delayed",time,"ms") ; res(time) }, time )  })}
        await delay(4000)
        var time = await delay(5000)
        time.should.equal(5000)
    });

    it('create Test Image', async function(){
        var filename = path.join(__dirname,"testfile.jpg")
        var message = "Test Message"
        await gallery.createImageFile(filename,message)
        .then(()=> assert(true))
    });

    it('ProcessFiles', async function(){
        var json = new gallery.JSONGallery("test/gallery","test/gallery.db")
        var t = await new Promise( (resolve,reject) => { fs.unlink(json.dbname, ()=> resolve(1)) } )
        return gallery.processFiles(json)
        .then( json => { 
            assert(json)
            return json;
        })   
    });
})