var path = require('path')
var assert = require('assert')
var fs = require('fs')
var moment = require('moment')
var mkdirp = require('mkdirp')
var should = require('chai').should();
var sql = require('../lib/lib_sqlite.js')
var File = require("ucipass-file")
var Gallery = require("../gallerydb.js")
var JPG = require('../jpg.js')

describe('JPG Unit Tests', function(){

    var galleryDB = path.join(__dirname,"../test/gallery/gallery.db")
    var galleryDir = path.join(__dirname,"../test/gallery/files")

    var testfile1 = path.join(galleryDir,"dir1/1.jpg")
    var testfile2 = path.join(galleryDir,"dir2/2.jpg")
    var testfile3 = path.join(galleryDir,"dir3/3.jpg")
    var testfile4 = path.join(galleryDir,"dir4/4.jpg")
    var testfile5 = path.join(galleryDir,"dir5/5.jpg")
    
    before("Deleting and Setting Directories Only", async function(){

        var file = new File("testfile1")
        if( await file.isFile(testfile1)) await file.unlink(testfile1)
        if( await file.isFile(testfile2)) await file.unlink(testfile2)
        if( await file.isFile(testfile3)) await file.unlink(testfile3)
        if( await file.isFile(testfile4)) await file.unlink(testfile4)
        if( await file.isFile(testfile5)) await file.unlink(testfile5)

        mkdirp.sync(path.dirname(testfile1))   
        mkdirp.sync(path.dirname(testfile2))   
        mkdirp.sync(path.dirname(testfile3)) 
        mkdirp.sync(path.dirname(testfile4)) 
        mkdirp.sync(path.dirname(testfile5))
        
    })

    it('Create File', async function(){
        var jpg = new JPG(testfile1)
        await jpg.createImageFile("testfile1",1024,768)
        return assert.equal( await jpg.isFile() , true )
    });

    it('Hash Creation', async function(){
        var jpg = new JPG(testfile1)
        await jpg.createImageFile("testfile1",1024,768)
        await jpg.hashfn(true)
        jpg.hash.should.equal("2e612028e6b80f01ec0bc2781e829a78")
        return Promise.resolve(true)
    });

    it('Thumb Creation', async function(){
        var jpg = new JPG(testfile1)
        if(! await jpg.isFile(testfile1)) { await jpg.createImageFile("testfile1",1024,768) }
        await jpg.getThumb()
        jpg.buffer = Buffer.from(jpg.thumb, 'base64')
        return true
    });

    it('Add Exif to Image, Get Exif from Image', async function(){
       var jpg = new JPG(testfile1)
        if(! await jpg.isFile(testfile1)) { await jpg.createImageFile("testfile1",1024,768) }
        jpg.exif = {
            "DateTimeOriginal" : "2011:11:11 11:11:11",
            "ImageDescription" : "Test Description, Hello, Andras, Alexandra, Eva, Adam ,Gabor",
            "Rating"    : "0",
            "Make" : "NodeJS",
            "Model" : "JIMP",
            "gps" : {
                GPSLatitudeRef: 'N',
                GPSLatitude: [[44,1],[51,1],[31,1]],
                GPSLongitudeRef: 'W',
                GPSLongitude: [[86,1],[4,1],[0,1]],
                lat: '34.1', 
                lon: '86.1'
            }
        }
        await jpg.setExif()
        await jpg.getExif()
        jpg.exif.Make.should.equal("NodeJS")
        jpg.exif.Model.should.equal("JIMP")
        jpg.exif.Rating.should.equal(0)
        jpg.exif.ImageDescription.should.equal("Test Description, Hello, Andras, Alexandra, Eva, Adam ,Gabor")
        jpg.exif.DateTimeOriginal.should.equal("2011:11:11 11:11:11")
        return true
    });

    it('Change/Add Date to Image Exif', async function(){
        var jpg = new JPG(testfile1)
        if(! await jpg.isFile(testfile1)) { await jpg.createImageFile("testfile1",1024,768) }
        await jpg.stat()
        var fdate = moment(jpg.mtime).subtract(1,"year").toDate()
        var dateString = moment(fdate).format("YYYY:MM:DD HH:mm:ss")
        await jpg.setExifDate(fdate)
        await jpg.getExif()
        return jpg.exif.DateTimeOriginal.should.equal(dateString)
    });

    it('Change filename based on Image Exif Date', async function(){
        var jpg = new JPG(testfile1)
        if(! await jpg.isFile(testfile1)) { await jpg.createImageFile("testfile1",1024,768) }
        await jpg.stat()
        //Set Exif for test file based on mtime
        await jpg.setExifDate(jpg.mtime)
        //Create conflicting images to affect renaiming
        var basedir = path.dirname(jpg.fpath)
        var newtestfile1 = path.join ( basedir,   moment(jpg.mtime).format("YYYYMMDD_HHmmss")+".jpg" )
        await jpg.rename(jpg.fpath,newtestfile1 )
        var exifFilename0 = path.join(basedir,  moment(jpg.mtime).format("YYYYMMDD_HHmmss")+"_000.jpg"   )    
        var exifFilename1 = path.join(basedir,  moment(jpg.mtime).format("YYYYMMDD_HHmmss")+"_001.jpg"   )
        var correctFilename = path.join(basedir,  moment(jpg.mtime).format("YYYYMMDD_HHmmss")+"_002.jpg"   )
        var jpg0 =new JPG(exifFilename0)  
        await jpg0.createImageFile()
        var jpg1 =new JPG(exifFilename1)  
        await jpg1.createImageFile()
        //The actual rename
        await jpg.renameByExifDate()
        //Test
        var isFile = await jpg.isFile( correctFilename)
        await jpg0.unlink();
        await jpg1.unlink();
        await jpg.rename(testfile1);
        return isFile.should.equal(true)
    });

    it("GPS Location retrival", async function(){
        var jpg = new JPG(testfile1)
        if(! await jpg.isFile(testfile1)) { await jpg.createImageFile("testfile1",1024,768) }
        jpg.exif = {
            "DateTimeOriginal" : "2011:11:11 11:11:11",
            "ImageDescription" : "Test Description, Hello, Andras, Alexandra, Eva, Adam ,Gabor",
            "Rating"    : "0",
            "Make" : "NodeJS",
            "Model" : "JIMP",
            "gps" : {
                GPSLatitudeRef: 'N',
                GPSLatitude: [[44,1],[51,1],[31,1]],
                GPSLongitudeRef: 'W',
                GPSLongitude: [[86,1],[4,1],[0,1]]
            }
        }
        await jpg.setExif()
        await jpg.getExif()
        var gps = await jpg.getLocation(galleryDB)
        assert.equal(gps.location,"Beulah")
        assert.equal(gps.cc,"US")
        return true;
    })

})

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
        jpg1.exif.DateTimeOriginal = "2011:11:11 11:11:11"
        jpg1.exif.ImageDescription = "Testfile1, user11, user12"
        jpg1.exif.Rating = "0"
        jpg1.exif.Make = "NodeJS"
        jpg1.exif.Model = "JIMP"
        jpg1.exif.gps = {}
        jpg1.exif.gps.GPSLatitudeRef = 'N'
        jpg1.exif.gps.GPSLatitude = [[44,1],[51,1],[31,1]]
        jpg1.exif.gps.GPSLongitudeRef = 'W'
        jpg1.exif.gps.GPSLongitude = [[86,1],[4,1],[0,1]]
        await jpg1.setExif()

        mkdirp.sync(path.dirname(jpg2.fpath))
        await jpg2.createImageFile("testfile2",1024,768)
        jpg2.exif.DateTimeOriginal = "2022:22:22 22:22:2"
        jpg2.exif.ImageDescription = "Testfile2, user21, user22"
        jpg2.exif.Rating = "0"
        jpg2.exif.Make = "NodeJS"
        jpg2.exif.Model = "JIMP"
        jpg2.exif.gps = {}
        jpg2.exif.gps.GPSLatitudeRef = 'N'
        jpg2.exif.gps.GPSLatitude = [[44,1],[51,1],[31,1]]
        jpg2.exif.gps.GPSLongitudeRef = 'W'
        jpg2.exif.gps.GPSLongitude = [[1,1],[4,1],[0,1]]
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

describe.skip('Simple Code Tests', function(){

    it.skip('Test Array Filter', async function(){
        var arr = ["apple", "bannana", "orange", "apple", "orange"];

        arr = arr.filter( function( item, index, inputArray ) {
                var findex = inputArray.indexOf(item)
                var final = findex == index
                return  final;
            });
        assert(true)
    })

    it.skip('Test Sort', async function(){

        var files = await f.getFullDirListRecursive('d:\\node')
        var total = files.length
        function compare(a,b){
            if( a[4] > b[4] ) {return 1}
            else if ( a[4] < b[4] ) {return -1}
            else return(0)
        }
        files.sort(compare)
        var set = 0 ;
        files.forEach((file,index,arr)=>{
            if( 
                arr[index+1] && 
                //arr[index][2] == arr[index+1][2] &&
                arr[index][4].getTime() == arr[index+1][4].getTime() 
                ){
                console.log(index,"of",total,"Set:",set,file[4], path.join(file[1],file[0]))
            }
            else if( 
                arr[index-1] && 
                //arr[index][2] == arr[index-1][2] &&
                arr[index][4].getTime() == arr[index-1][4].getTime() 
                ){
                console.log(index,"of",total,"Set:",set,file[4], path.join(file[1],file[0]))
                set++
            }
            
        })
        assert(true)
    })

    it.skip('Bulk Filename change based on Exif', async function(){
        galleryDir = '/media/aarato/10EACS/newGallery/Gallery/2013'
        var files = await f.getFullDirListRecursive(galleryDir)
        for(var i = 0 ; i < files.length ; i++){
            var json = { file: {}}
            json.file.fname = files[i][0];
            json.file.fpath = files[i][1];
            json.file.mtime = files[i][4];
            var oldFilename = path.join(json.file.fpath,json.file.fname)
            try{
                var newfile = await gallery.renameImageByExif(json.file)
                if(newfile && newfile.fname){
                    console.log(i,"of",files.length,oldFilename,"=>",newfile.fname)
                }
            }catch(e){
                console.log(e)
            }
        }
        true.should.equal(true)
    });

})