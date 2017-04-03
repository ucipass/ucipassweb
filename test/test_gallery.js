var gallery = require("../bin/gallery")
var assert = require('assert')
var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var should = require('chai').should();
var sql = require('../bin/lib_sqlite.js')
var f = require('../bin/lib_files.js')
var galleryFile1 = path.join("test/gallery","001.jpg")
var galleryFile2 = path.join("test/gallery","002.jpg")
var galleryFile3 = path.join("test/gallery","003.jpg")
var galleryDir = path.join("test/gallery","files")
var galleryDir1 = path.join(galleryDir,"dir1")
var galleryDir2 = path.join(galleryDir,"dir2")
var galleryDB = path.join("test/gallery","gallery.db")
var testfile1 = path.join(galleryDir1,"001.jpg")
var testfile2 = path.join(galleryDir1,"002.jpg")
var testfile3 = path.join(galleryDir1,"003.jpg")
var testfile4 = path.join(galleryDir2,"004.jpg")
var testfile5 = path.join(galleryDir2,"005.jpg")

describe.only('Gallery Tests', function(){

    before("Setting Up Test Database",async function(){
        var json = new gallery.JSONGallery(galleryDir,galleryDB)
        mkdirp.sync(galleryDir)   
        mkdirp.sync(galleryDir1)   
        mkdirp.sync(galleryDir2)
        if (!fs.existsSync(testfile1)) {
            fs.createReadStream(galleryFile1).pipe(fs.createWriteStream(testfile1));
            }
        if (!fs.existsSync(testfile2)) {
            fs.createReadStream(galleryFile2).pipe(fs.createWriteStream(testfile2));
            }
        if (!fs.existsSync(testfile3)) {
            fs.createReadStream(galleryFile3).pipe(fs.createWriteStream(testfile3));
            }
        return gallery.initDB(json)
        .then(sql.open)
        .then(sql.stm("delete from files"))
        .then(sql.write)
        .then(sql.stm("delete from images"))
        .then(sql.write)
        .then(sql.stm("delete from thumbs"))
        .then(sql.write)
        .then(sql.close)
    })

    after("Deleting created test files", async function(){
        var isFile = await f.isFile( testfile4 )
        if ( isFile) { 
            fs.unlink(testfile4,()=>{})
        }
        isFile = await f.isFile( testfile5 )
        if ( isFile) { 
            fs.unlink(testfile5,()=>{})
        }


    })

    it.skip('Test Init DB File', async function(){
        var json = new gallery.JSONGallery("test/gallery","test/gallery-init.db")    
        return gallery.initDB(json)
        .then( async () => {
            await new Promise( (resolve,reject) => { fs.unlink(json.dbname, ()=> resolve(1))  } )
            assert(true)
        })
    });

    it('Hash Creation', async function(){
        var json = new gallery.JSONGallery(galleryDir,galleryDB)
        json.file.fname = path.basename(testfile1)
        json.file.fpath = path.dirname(testfile1)
        json.file.fsize = 323443
        var hash = await gallery.getHash(json.file)
        json.file.hash.should.equal("f7095d1465333e49e771c2b94771f581")
        return Promise.resolve(true)
    });


    it('Thumb Creation', async function(){
        return gallery.getThumb( testfile1 )
        .then(async (base64)=> {
            assert(true)
        })
        .catch((error)=> console.log("ERROR",error))
    });

    it('Exif retrieval', async function(){
        var json = new gallery.JSONGallery(galleryDir,galleryDB)
        json.file.fname = path.basename(testfile1)
        json.file.fpath = path.dirname(testfile1)
        json.file.fsize = 323443
        json.file.buffer = fs.readFileSync(path.join(json.file.fpath,json.file.fname));
        return gallery.getExif( json )
        .then(async (exif)=> {
            exif.Make.should.equal("LGE")
        })

    });
    it("Location retrival", async function(){
        var json = new gallery.JSONGallery(galleryDir,galleryDB)
        json.exif = {gps: { lat: '37.1779528', lon: '-3.5855306' } } 
        return gallery.getLocation(json)
         .then(async (geo)=> {
            geo.location.should.equal("Armilla")
        })
       
    })
    
    it('ProcessFiles 3 different files', async function(){
        var json = new gallery.JSONGallery(galleryDir,galleryDB)
        await gallery.processFiles(json)
        return sql.open(json)
        .then(sql.stm("select count(*) from files"))
        .then(sql.read)
        .then(sql.stm("select count(*) from images"))
        .then(sql.read)
        .then(sql.stm("select count(*) from thumbs"))
        .then(sql.read)
        .then(sql.close)
        .then( json => {
            json.results.pop()
            var c_thumbs = json.results.pop().table[0][0]
            var c_images = json.results.pop().table[0][0]
            var c_files = json.results.pop().table[0][0]
            c_files.should.equal(6)
            c_images.should.equal(3)
            c_thumbs.should.equal(3)
            return json;
        })   
    });
    

    
    it('ProcessFiles - 1 File (noexif/004.jpg) added', async function(){
        var json = new gallery.JSONGallery(galleryDir,galleryDB)
        var isFile = await f.isFile( testfile4 )
        if ( !isFile) { 
            await gallery.createImageFile(testfile4,"TESTFILE4")
        }
        await gallery.processFiles(json)
        return sql.open(json)
        .then(sql.stm("select count(*) from files"))
        .then(sql.read)
        .then(sql.stm("select count(*) from images"))
        .then(sql.read)
        .then(sql.stm("select count(*) from thumbs"))
        .then(sql.read)
        .then(sql.close)
        .then( json => {
            json.results.pop()
            var c_thumbs = json.results.pop().table[0][0]
            var c_images = json.results.pop().table[0][0]
            var c_files = json.results.pop().table[0][0]
            c_files.should.equal(7)
            c_images.should.equal(4)
            c_thumbs.should.equal(4)
            return json;
        })   
    });
})