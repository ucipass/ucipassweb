var gallery = require("../bin/gallery")
var assert = require('assert')
var fs = require('fs')
var moment = require('moment')
var path = require('path')
var mkdirp = require('mkdirp')
var should = require('chai').should();
var sql = require('../bin/lib_sqlite.js')
var f = require('../bin/lib_files.js')

describe('Gallery Unit Tests', function(){

    var galleryDB = path.join(__dirname,"../test/gallery/gallery.db")
    var galleryDir = path.join(__dirname,"../test/gallery/files")

    var testfile1 = path.join(galleryDir,"dir1/1.jpg")
    var testfile2 = path.join(galleryDir,"dir2/2.jpg")
    var testfile3 = path.join(galleryDir,"dir3/3.jpg")
    var testfile4 = path.join(galleryDir,"dir4/4.jpg")
    var testfile5 = path.join(galleryDir,"dir5/5.jpg")
    
    before("Deleting and Setting Directories Only", async function(){
        try{
            var files = await f.getFullDirListRecursive(galleryDir)
            if(files.length <20 && files.length > 1) {
                t = await f.rmdir(galleryDir)
            }
                
        }catch(e){
            console.log("nothing to do")
        }
        mkdirp.sync(path.dirname(testfile1))   
        mkdirp.sync(path.dirname(testfile2))   
        mkdirp.sync(path.dirname(testfile3)) 
        mkdirp.sync(path.dirname(testfile4)) 
        mkdirp.sync(path.dirname(testfile5))
        
    })

    it('Create File', async function(){
        await gallery.createImageFile(testfile1,"testfile1",1024,768)
        return f.isFile(testfile1)
        .then(async (isFile)=> {
            isFile.should.equal(true)
        })

    });

    it('Hash Creation', async function(){
        if(! await f.isFile(testfile1)) { await gallery.createImageFile(testfile1,"testfile1",1024,768) }
        var json = new gallery.JSONGallery(galleryDir,galleryDB)
        json.file.fname = path.basename(testfile1)
        json.file.fpath = path.dirname(testfile1)
        json.file.fsize = 323443
        var hash = await gallery.getHash(json.file)
        json.file.hash.should.equal("2e612028e6b80f01ec0bc2781e829a78")
        return Promise.resolve(true)
    });

    it('Thumb Creation', async function(){
        if(! await f.isFile(testfile1)) { await gallery.createImageFile(testfile1,"testfile1",1024,768) }
        return gallery.getThumb( testfile1 )
        .then(async (base64)=> {
            assert(true)
        })
        .catch((error)=> console.log("ERROR",error))
    });

    it('Add Exif to Image, Get Exif from Image', async function(){
        if(! await f.isFile(testfile1)) { await gallery.createImageFile(testfile1) }
        //var testfile1 = path.join(galleryDir,"../usa.jpg")
        var json = { file: {}}
        json.file.fname = path.basename(testfile1)
        json.file.fpath = path.dirname(testfile1)
        json.file.buffer = fs.readFileSync(testfile1);
        json.exif = {
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
        await gallery.setExif( json )
        return gallery.getExif( json )
        .then(async (exif)=> {
            exif.Make.should.equal("NodeJS")
            exif.Model.should.equal("JIMP")
            exif.Rating.should.equal(0)
            exif.ImageDescription.should.equal("Test Description, Hello, Andras, Alexandra, Eva, Adam ,Gabor")
            exif.DateTimeOriginal.should.equal("2011:11:11 11:11:11")
        })
    });

    it('Change/Add Date to Image Exif', async function(){
        if(! await f.isFile(testfile1)) { await gallery.createImageFile(testfile1) }
        var json = { file: {}}
        json.file.fname = path.basename(testfile1)
        json.file.fpath = path.dirname(testfile1)
        json.file.buffer = null;
        var stat = await f.stat( path.join(json.file.fpath,json.file.fname) )
        var date = moment(stat.mtime).subtract(1,"year").toDate()
        var dateString = moment(date).format("YYYY:MM:DD HH:mm:ss")
        await gallery.setExifDate( json.file, date)
        return gallery.getExif( json )
        .then(async (exif)=> {
            exif.DateTimeOriginal.should.equal(dateString)
        })
    });

    it('Change filename based on Image Exif Date', async function(){
        if(! await f.isFile(testfile1)) { await gallery.createImageFile(testfile1) }
        var json = { file: {}}
        json.file.fname = path.basename(testfile1)
        json.file.fpath = path.dirname(testfile1)
        json.file.buffer = null;
        //Set Exif for test file based on mtime
        var stat = await f.stat( path.join(json.file.fpath,json.file.fname) )
        var date = moment(stat.mtime).toDate()
        var dateString = moment(date).format("YYYY:MM:DD HH:mm:ss")
        await gallery.setExifDate( json.file, date)
        //Create conflicting images to affect renaiming
        var exifFilename0 = path.join(json.file.fpath,  moment(date).format("YYYYMMDD_HHmmss")+"_000.jpg"   )    
        var exifFilename1 = path.join(json.file.fpath,  moment(date).format("YYYYMMDD_HHmmss")+"_001.jpg"   )    
        var exifFilename2 = path.join(json.file.fpath,  moment(date).format("YYYYMMDD_HHmmss")+"_002.jpg"   )
        await gallery.createImageFile(exifFilename0)
        await gallery.createImageFile(exifFilename1)
        //The actual rename
        await gallery.renameImageByExif(json.file)
        //Test
        return f.isFile( exifFilename2)
        .then(async (isFile)=> {
            isFile.should.equal(true)
            await f.unlink(exifFilename0);
            await f.unlink(exifFilename1);
            await f.rename(exifFilename2,testfile1);
        })
    });

    it("GPS Location retrival", async function(){
        var json = new gallery.JSONGallery(galleryDir,galleryDB)
        json.exif = {gps: { lat: '37.1779528', lon: '-3.5855306' } } 
        return gallery.getLocation(json)
         .then(async (geo)=> {
            geo.location.should.equal("Armilla")
        })
       
    })

    it('Test Init DB File', async function(){
        var json = new gallery.JSONGallery( galleryDir, path.join(galleryDir,"..","gallery-init.db") )
        return gallery.initDB(json)
        .then( async () => {
            await new Promise( (resolve,reject) => { fs.unlink(json.dbname, ()=> resolve(1))  } )
            assert(true)
        })
    });

})

describe.skip('Test Gallery Full Test', function(){

    var galleryDB = path.join(__dirname,"../test/gallery/gallery.db")
    var galleryDir = path.join(__dirname,"../test/gallery/files")

    var testfile1 = path.join(galleryDir,"dir1/1.jpg")
    var testfile2 = path.join(galleryDir,"dir2/2.jpg")
    var testfile3 = path.join(galleryDir,"dir3/3.jpg")
    var testfile4 = path.join(galleryDir,"dir4/4.jpg")
    var testfile5 = path.join(galleryDir,"dir5/5.jpg")
    
    
    before("Setting Up  2 Test Files, Directories & Database",async function(){
        var json = new gallery.JSONGallery(galleryDir,galleryDB)

        try{
            var files = await f.getFullDirListRecursive(galleryDir)
            if(files.length <10 && files.length > 2) {
                t = await f.rmdir(galleryDir)
            }
                
        }catch(e){
            console.log("BEFORE DIRECTORY DELETE ERROR")
        }

        mkdirp.sync(path.dirname(testfile1))
        await gallery.createImageFile(testfile1,"testfile1",1024,768)
        var json = new gallery.JSONGallery(galleryDir,galleryDB)
        json.file = {}
        json.file.fname = path.basename(testfile1)
        json.file.fpath = path.dirname(testfile1)
        json.file.buffer = fs.readFileSync(testfile1);
        json.exif = {}
        json.exif.DateTimeOriginal = "2011:11:11 11:11:11"
        json.exif.ImageDescription = "Testfile1, user11, user12"
        json.exif.Rating = "0"
        json.exif.Make = "NodeJS"
        json.exif.Model = "JIMP"
        json.exif.gps = {}
        json.exif.gps.GPSLatitudeRef = 'N'
        json.exif.gps.GPSLatitude = [[44,1],[51,1],[31,1]]
        json.exif.gps.GPSLongitudeRef = 'W'
        json.exif.gps.GPSLongitude = [[86,1],[4,1],[0,1]]
        await gallery.setExif( json )

        mkdirp.sync(path.dirname(testfile2))
        await gallery.createImageFile(testfile2,"testfile2",1024,768)
        json.file.fname = path.basename(testfile2)
        json.file.fpath = path.dirname(testfile2)
        json.file.buffer = fs.readFileSync(testfile2);
        json.exif.DateTimeOriginal = "2022:22:22 22:22:2"
        json.exif.ImageDescription = "Testfile2, user21, user22"
        json.exif.Rating = "0"
        json.exif.Make = "NodeJS"
        json.exif.Model = "JIMP"
        json.exif.gps.GPSLatitudeRef = 'N'
        json.exif.gps.GPSLatitude = [[44,1],[51,1],[31,1]]
        json.exif.gps.GPSLongitudeRef = 'W'
        json.exif.gps.GPSLongitude = [[1,1],[4,1],[0,1]]
        await gallery.setExif( json )

        mkdirp.sync(path.dirname(testfile3))
        mkdirp.sync(path.dirname(testfile4))
        mkdirp.sync(path.dirname(testfile5))
    })

    afterEach("Deleting created test files", async function(){
        var isFile = await f.isFile( testfile3 )
        if ( isFile) { 
            fs.unlink(testfile3,()=>{})
        }
        isFile = await f.isFile( testfile4 )
        if ( isFile) { 
            fs.unlink(testfile4,()=>{})
        }
        isFile = await f.isFile( testfile5 )
        if ( isFile) { 
            fs.unlink(testfile5,()=>{})
        }

    })

    it('Start Process 2 different files = 2 hashes, 2 images, 2 thumbs', async function(){
        var json = new gallery.JSONGallery(galleryDir,galleryDB)
        await gallery.initDB(json)
        .then(sql.open)
        .then(sql.stm("delete from files"))
        .then(sql.write)
        .then(sql.stm("delete from images"))
        .then(sql.write)
        .then(sql.stm("delete from thumbs"))
        .then(sql.write)
        .then(sql.close)

        await gallery.processFiles(json)

        return sql.open(json)
        .then(sql.stm("select count(*) from files where active = '1' "))
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
            c_files.should.equal(2)
            c_images.should.equal(2)
            c_thumbs.should.equal(2)
            return json;
        })   
    });
       
    it('Copy Testfile2 as testfiles3 and testfile4 then delete testfile3', async function(){
        await f.copy(testfile2,testfile3)
        await f.copy(testfile2,testfile4)

        var json = new gallery.JSONGallery(galleryDir,galleryDB)
        await gallery.initDB(json)
        .then(sql.open)
        .then(sql.stm("delete from files"))
        .then(sql.write)
        .then(sql.stm("delete from images"))
        .then(sql.write)
        .then(sql.stm("delete from thumbs"))
        .then(sql.write)
        .then(sql.close)

        await gallery.processFiles(json)
        await f.unlink(testfile4)
        await gallery.processFiles(json)

        return sql.open(json)
        .then(sql.stm("select count(*) from files "))
        .then(sql.read)
        .then(sql.stm("select count(*) from files where active = '1' "))
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
            var c_filesall = json.results.pop().table[0][0]
            c_filesall.should.equal(4)
            c_files.should.equal(3)
            c_images.should.equal(2)
            c_thumbs.should.equal(2)
            return json;
        })

    });

    it('Copy Testfile2 as testfiles3 then rename testfile3 to testfile4', async function(){
        await f.copy(testfile2,testfile3)

        var json = new gallery.JSONGallery(galleryDir,galleryDB)
        await gallery.initDB(json)
        .then(sql.open)
        .then(sql.stm("delete from files"))
        .then(sql.write)
        .then(sql.stm("delete from images"))
        .then(sql.write)
        .then(sql.stm("delete from thumbs"))
        .then(sql.write)
        .then(sql.close)

        await gallery.processFiles(json)
        await sql.open(json)
        .then(sql.stm("select count(*) from files "))
        .then(sql.read)
        .then(sql.stm("select count(*) from files where active = '1' "))
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
            var c_filesall = json.results.pop().table[0][0]
            return true;
        })

        await f.rename(testfile3,testfile4)
        await gallery.processFiles(json)

        return sql.open(json)
        .then(sql.stm("select count(*) from files "))
        .then(sql.read)
        .then(sql.stm("select count(*) from files where active = '1' "))
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
            var c_filesall = json.results.pop().table[0][0]
            c_filesall.should.equal(4)
            c_files.should.equal(3)
            c_images.should.equal(2)
            c_thumbs.should.equal(2)
            return json;
        })

    });

})

describe.skip('Real Gallery Full Test', function(){
    var galleryDB = path.join(__dirname,"../test/gallery/realgallery.db")
    var galleryDir = path.join("/mnt/2016")


    before("Setting Up Test Database and Directories",async function(){
        /*
        var json1 = { dbname:"/home/aarato/node/pictures.db" }
        //await gallery.initDB(json)
        var t = await Promise.resolve(json1)
        .then(sql.open)
        .then(sql.stm("select * from thumbs"))
        .then(sql.read)
        .then(sql.close)
        t.results.pop()
        var table = t.results.pop().table
        console.log(table.length)
        for(var i = 0 ; i < table.length ; i++){
            var json = new gallery.JSONGallery( galleryDir, galleryDB)
            console.log(i,"of",table.length)
            try{
            await Promise.resolve(json)
            .then(sql.open)
            .then(sql.insertRow("thumbs",["hash","thumb"],table[i]))
            .then(sql.close)
            }catch(e){console.log(e)}
        }
        delete table
        */
        return true
    })

    after("Deleting created test files", async function(){
        return true
    })

    it('Test Large Directory', async function(){
        var json = new gallery.JSONGallery(galleryDir,galleryDB)
        await gallery.processFiles(json)
        return sql.open(json)
        .then(sql.stm("select count(*) from files where active = '1' "))
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
            c_files.should.equal(3)
            c_images.should.equal(3)
            c_thumbs.should.equal(3)
            return json;
        })   
    })
})

describe.only('Simple Code Tests', function(){

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
        galleryDir = '/media/aarato/10EACS/Gallery/2016'
        var files = await f.getFullDirListRecursive(galleryDir)
        for(var i = 0 ; i < files.length ; i++){
            var json = { file: {}}
            json.file.fname = files[i][0];
            json.file.fpath = files[i][1];
            json.file.mtime = files[i][4];
            var oldFilename = path.join(json.file.fpath,json.file.fname)
            var newfile = await gallery.renameImageByExif(json.file)
            if(newfile && newfile.fname){
                console.log(i,"of",files.length,oldFilename,"=>",newfile.fname)
            }
        }
        true.should.equal(true)
    });

})