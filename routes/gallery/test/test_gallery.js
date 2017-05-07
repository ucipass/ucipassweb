var path = require('path')
var assert = require('assert')
var fs = require('fs')
var moment = require('moment')
var mkdirp = require('mkdirp')
var should = require('chai').should();
var sql = require('../lib/lib_sqlite.js')
var File = require("ucipass-file")
var Gallery = require("../gallerydb.js")
var gallery = require("../gallery.js")
var JPG = require('ucipass-jpg')
var request = require("supertest")
var JSONData = require(path.join(__dirname,"../../../bin","jsondata.js"))
var agent = request.agent("http://localhost:3000")
var app = require("express")()

describe('Gallery Unit Test', function(){

    var galleryDB = path.join(__dirname,"../test/gallery/gallery.db")
    var galleryDir = path.join(__dirname,"../test/gallery/files")

    var jpg1 = new JPG( path.join(galleryDir,"dir1/1.jpg") )
    var jpg2 = new JPG( path.join(galleryDir,"dir2/2.jpg") )
    var jpg3 = new JPG( path.join(galleryDir,"dir3/3.jpg") )
    var jpg4 = new JPG( path.join(galleryDir,"dir4/4.jpg") )
    var jpg5 = new JPG( path.join(galleryDir,"dir5/5.jpg") )
    
    
    beforeEach("Setting Up  2 Test Files, Directories & Database",async function(){

        var g = new Gallery( galleryDir, path.join(galleryDir,"..","gallery.db") )
        var json = {dbname:g.dbname}
        await g.init()
        await Promise.resolve(json)
        .then(sql.open)
        .then(sql.stm("delete from files"))
        .then(sql.write)
        .then(sql.stm("delete from images"))
        .then(sql.write)
        .then(sql.stm("delete from thumbs"))
        .then(sql.write)
        .then(sql.close)
        if(await jpg3.isFile()) await jpg3.unlink()
        if(await jpg4.isFile()) await jpg4.unlink()
        if(await jpg5.isFile()) await jpg5.unlink()
        mkdirp.sync(path.dirname(jpg1.fpath))
        await jpg1.createImageFile("testfile1",1024,768)
        jpg1.DateTimeOriginal = "2011:11:11 11:11:11"
        jpg1.ImageDescription = "Testfile1, user11, user12"
        jpg1.Rating = "0"
        jpg1.Make = "NodeJS"
        jpg1.Model = "JIMP"
        jpg1.ImageDescription = "Description of Testfile1"
        jpg1.XPSubject = "Event Testfile1"
        jpg1.XPKeywords = "Andras;Eva"
        jpg1.XPComment = JSON.stringify({
            location : "Debrecen",
            cc : "HU",
            lat : 44.1,
            lon : 86.1
        })
        jpg1.gps = {}
        jpg1.gps.GPSLatitudeRef = 'N'
        jpg1.gps.GPSLatitude = [[44,1],[51,1],[31,1]]
        jpg1.gps.GPSLongitudeRef = 'W'
        jpg1.gps.GPSLongitude = [[86,1],[4,1],[0,1]]
        await jpg1.setExif()

        mkdirp.sync(path.dirname(jpg2.fpath))
        await jpg2.createImageFile("testfile2",1024,768)
        jpg2.DateTimeOriginal = "2022:22:22 22:22:2"
        jpg2.ImageDescription = "Testfile2, user21, user22"
        jpg2.Rating = "0"
        jpg2.Make = "NodeJS"
        jpg2.Model = "JIMP"
        jpg2.ImageDescription = "Description of Testfile2"
        jpg2.XPSubject = "Event Testfile2"
        jpg2.XPKeywords = "Adam;Alexandra"
        jpg2.gps = {}
        jpg2.gps.GPSLatitudeRef = 'N'
        jpg2.gps.GPSLatitude = [[44,1],[51,1],[31,1]]
        jpg2.gps.GPSLongitudeRef = 'W'
        jpg2.gps.GPSLongitude = [[1,1],[4,1],[0,1]]
        await jpg2.setExif()

        mkdirp.sync(path.dirname(jpg3.fpath))
        mkdirp.sync(path.dirname(jpg4.fpath))
        mkdirp.sync(path.dirname(jpg5.fpath))
    })

    afterEach("Deleting created test files", async function(){
        // Nothing right now!!
    })

    it('Test Init DB File', async function(){
        var g = new Gallery( galleryDir, path.join(galleryDir,"..","gallery-init.db") )
        await g.init()
        var f = new File(g.dbname)
        await f.unlink()
        return true
    });

    it('Start Process 2 different files = 2 hashes, 2 images, 2 thumbs', async function(){
        var g = new Gallery( galleryDir, path.join(galleryDir,"..","gallery.db") )
        await g.getNewFiles()

        var filesActive = await sql.sReadTable(g.dbname,"files" , ["fpath","active"], [ [true,"active","IS","1"] ])
        var images = await sql.sReadTable(g.dbname,"images" , ["hash"])
        var thumbs = await sql.sReadTable(g.dbname,"thumbs" , ["hash"])
        filesActive.table.length.should.equal(2)
        images.table.length.should.equal(2)
        thumbs.table.length.should.equal(2)
        return true;
    });
       
    it('Copy Testfile2 as testfiles3 and testfile4 then delete testfile3', async function(){
        var g = new Gallery( galleryDir, path.join(galleryDir,"..","gallery.db") )
        await g.getNewFiles()

        await jpg2.write(jpg3.fpath)
        await jpg2.write(jpg4.fpath)

        await g.getNewFiles()
        var files = await sql.sReadTable(g.dbname,"files",  ["fpath"])
        var filesActive = await sql.sReadTable(g.dbname,"files" , ["fpath","active"], [ [true,"active","IS","1"] ])
        var images = await sql.sReadTable(g.dbname,"images" , ["hash"])
        var thumbs = await sql.sReadTable(g.dbname,"thumbs" , ["hash"])
        files.table.length.should.equal(4)
        filesActive.table.length.should.equal(4)
        images.table.length.should.equal(2)
        thumbs.table.length.should.equal(2)

        await jpg4.unlink()

        await g.getNewFiles()

        var files = await sql.sReadTable(g.dbname,"files",  ["fpath"])
        var filesActive = await sql.sReadTable(g.dbname,"files" , ["fpath","active"], [ [true,"active","IS","1"] ])
        var images = await sql.sReadTable(g.dbname,"images" , ["hash"])
        var thumbs = await sql.sReadTable(g.dbname,"thumbs" , ["hash"])
        files.table.length.should.equal(4)
        filesActive.table.length.should.equal(3)
        images.table.length.should.equal(2)
        thumbs.table.length.should.equal(2)
        return true;

    });

    it('Copy Testfile2 as testfiles3 then rename testfile3 to testfile4', async function(){
        var g = new Gallery( galleryDir, path.join(galleryDir,"..","gallery.db") )
        await g.getNewFiles()

        await jpg2.write(jpg3.fpath)
 
        await g.getNewFiles()
        var files = await sql.sReadTable(g.dbname,"files",  ["fpath"])
        var filesActive = await sql.sReadTable(g.dbname,"files" , ["fpath","active"], [ [true,"active","IS","1"] ])
        var images = await sql.sReadTable(g.dbname,"images" , ["hash"])
        var thumbs = await sql.sReadTable(g.dbname,"thumbs" , ["hash"])
        files.table.length.should.equal(3)
        filesActive.table.length.should.equal(3)
        images.table.length.should.equal(2)
        thumbs.table.length.should.equal(2)

        await jpg3.rename(jpg4.fpath)

        await g.getNewFiles()

        var files = await sql.sReadTable(g.dbname,"files",  ["fpath"])
        var filesActive = await sql.sReadTable(g.dbname,"files" , ["fpath","active"], [ [true,"active","IS","1"] ])
        var images = await sql.sReadTable(g.dbname,"images" , ["hash"])
        var thumbs = await sql.sReadTable(g.dbname,"thumbs" , ["hash"])
        files.table.length.should.equal(4)
        filesActive.table.length.should.equal(3)
        images.table.length.should.equal(2)
        thumbs.table.length.should.equal(2)
        return true;
    });

    it('Overwrite Testfile2 with testfiles3', async function(){
        var g = new Gallery( galleryDir, path.join(galleryDir,"..","gallery.db") )
        await g.getNewFiles()

        await jpg3.createImageFile()
        await jpg3.rename(jpg2.fpath)
 
        await g.getNewFiles()
        var files = await sql.sReadTable(g.dbname,"files",  ["fpath"])
        var filesActive = await sql.sReadTable(g.dbname,"files" , ["fpath","active"], [ [true,"active","IS","1"] ])
        var images = await sql.sReadTable(g.dbname,"images" , ["hash"])
        var thumbs = await sql.sReadTable(g.dbname,"thumbs" , ["hash"])
        files.table.length.should.equal(2)
        filesActive.table.length.should.equal(2)
        images.table.length.should.equal(3)
        thumbs.table.length.should.equal(3)
        return true
    });

})

describe.only('Web Server Test', function(){

    before("Setup",()=>{
        var bodyParser = require('body-parser');
        var server = require('http').createServer(app);
        server.listen(3000, function () {
            console.log('Node JS Test listening on port 3000!');
        });
        app.use( bodyParser.json() );
        app.use(bodyParser.urlencoded({
            extended: true
        }));
        app.get("/",(req,res)=>{
            res.send("Hello!")
        })
        app.post("/",gallery)
        
    })

    it("Root HTTP get", function(done){
        agent
        //.get('/')
        //.expect(302)
        .get('/')
        .expect(200)
        .end(function(err, res) {
            if (err) {
                throw err;
            }
            done()
        })
    })
    it("Gallery HTTP post", function(done){
        let ioData = new JSONData("admin","gallery",{cmd:"getselect2"})
        ioData = ioData.getjson()
        agent
        .post('/')
        .send(ioData)
        .expect(200)
        .end(function(err, res) {
            if (err) {
                throw err;
            }
            done()
        })
    })
})