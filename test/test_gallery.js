var gallery = require("../bin/gallery")
var assert = require('assert')
var fs = require('fs')
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
        return gallery.getThumb( testfile1 )
        .then(async (base64)=> {
            assert(true)
        })
        .catch((error)=> console.log("ERROR",error))
    });

    it('Add Exif to Image', async function(){
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
        return gallery.setExif( json )
        .then(async (result)=> {
            result.should.equal(true)
        })
    });

    it('Exif retrieval', async function(){
        //var testfile1 = path.join(galleryDir,"../usa.jpg")
        var json = new gallery.JSONGallery(galleryDir,galleryDB)
        json.file.fname = path.basename(testfile1)
        json.file.fpath = path.dirname(testfile1)
        json.file.fsize = 323443
        json.file.buffer = fs.readFileSync(path.join(json.file.fpath,json.file.fname));
        return gallery.getExif( json )
        .then(async (exif)=> {
            exif.Make.should.equal("NodeJS")
            exif.Model.should.equal("JIMP")
            exif.Rating.should.equal(0)
            exif.ImageDescription.should.equal("Test Description, Hello, Andras, Alexandra, Eva, Adam ,Gabor")
            exif.DateTimeOriginal.should.equal("2011:11:11 11:11:11")
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

describe('Gallery Full Test', function(){

    var galleryDB = path.join(__dirname,"../test/gallery/gallery.db")
    var galleryDir = path.join(__dirname,"../test/gallery/files")

    var testfile1 = path.join(galleryDir,"2016/2016-06-25-MichiganSandDunes/usa.jpg")
    var testfile2 = path.join(galleryDir,"2016/2016-06-25-SpainMalaga/spain.jpg")
    var testfile3 = path.join(galleryDir,"2011/2011-11-01/nolocation.JPG")
    var testfile4 = path.join(galleryDir,"2017/2017-04/004.jpg")
    var testfile5 = path.join(galleryDir,"2017/2017-04/005.jpg")
    
    
    before("Setting Up Test Database and Directories",async function(){
        var json = new gallery.JSONGallery(galleryDir,galleryDB)
        mkdirp.sync(path.dirname(testfile1))   
        mkdirp.sync(path.dirname(testfile2))   
        mkdirp.sync(path.dirname(testfile3)) 
        mkdirp.sync(path.dirname(testfile4)) 
        mkdirp.sync(path.dirname(testfile5)) 
        if( ! await f.isFile(testfile1)) { 
            await f.copy( path.join( galleryDir,"..",path.basename(testfile1)) , testfile1 )
        }
        if( ! await f.isFile(testfile2)) {
            f.copy( path.join( galleryDir,"..",path.basename(testfile2)) , testfile2  )
        }
        if( ! await f.isFile(testfile3)) { 
            f.copy( path.join( galleryDir,"..",path.basename(testfile3)) , testfile3  )
        }

        var files = await f.getFullDirListRecursive(galleryDir)
        for(var i=0 ; i < files.length ; i++){
            var file = path.join(files[i][1],files[i][0])
            if (file == testfile1 || file == testfile2 || file == testfile3 ){
                // we keep these files
                //console.log("Kept:",file)
            }
            else{
                await f.unlink(file)
                console.log("Deleted:",file)
            }
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

    it('ProcessFiles 3 different files', async function(){
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
    });
       
    it('ProcessFiles - GENERATE testfile4 twice testfile4 and testfile5', async function(){
        var json = new gallery.JSONGallery(galleryDir,galleryDB)
        await gallery.createImageFile(testfile4,"TESTFILE4")
        await f.copy(testfile4,testfile5)
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
            c_files.should.equal(5)
            c_images.should.equal(4)
            c_thumbs.should.equal(4)
            return json;
        })   
    });

    it('ProcessFiles - Delete testfile5 ', async function(){
        var json = new gallery.JSONGallery(galleryDir,galleryDB)
        await f.unlink(testfile5)
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
            c_files.should.equal(4)
            c_images.should.equal(4)
            c_thumbs.should.equal(4)
            return json;
        })   
    });

    it('ProcessFiles - COPY testfile4 as testfile5', async function(){
        var json = new gallery.JSONGallery(galleryDir,galleryDB)
        await f.copy(testfile4,testfile5)
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
            c_files.should.equal(5)
            c_images.should.equal(4)
            c_thumbs.should.equal(4)
            return json;
        })   
    });

})

describe.only('Gallery Bulk Exif Change on Directory', function(){

    var galleryDB = path.join(__dirname,"../test/gallery/gallery.db")
    var galleryDir = path.join(__dirname,"../test/gallery/files")

    var testfile1 = path.join(galleryDir,"dir1/1.jpg")
    var testfile2 = path.join(galleryDir,"dir1/2.jpg")
    var testfile3 = path.join(galleryDir,"dir1/3.jpg")
    var testfile4 = path.join(galleryDir,"dir1/4.jpg")
    var testfile5 = path.join(galleryDir,"dir1/5.jpg")
    
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

    it.only('Create 5 Files with Exif', async function(){
        await gallery.createImageFile(testfile1,"testfile1",640,480)
        await gallery.createImageFile(testfile2,"testfile2",640,480)
        await gallery.createImageFile(testfile3,"testfile3",640,480)
        await gallery.createImageFile(testfile4,"testfile4",640,480)
        await gallery.createImageFile(testfile5,"testfile5",640,480)

        var json = { file: {}}

        for(var i = 1 ; i <= 5 ; i++){
            var testfile = path.join(path.dirname(testfile1),i.toString()+".jpg")
            var digit = "0"+i.toString()
            var testdate = "1999".concat( ":",digit,":",digit," 11:11:11")
            json.file.fname = path.basename(testfile)
            json.file.fpath = path.dirname(testfile)
            json.file.buffer = fs.readFileSync(testfile);
            json.exif = {
                "DateTimeOriginal" : testdate,
                "ImageDescription" : "Testfile",
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
        }

        return f.isFile(testfile1)
        .then(async (isFile)=> {
            isFile.should.equal(true)
        })

    });

    it('Exif retrieval', async function(){
        //var testfile1 = path.join(galleryDir,"../usa.jpg")
        var json = new gallery.JSONGallery(galleryDir,galleryDB)
        json.file.fname = path.basename(testfile1)
        json.file.fpath = path.dirname(testfile1)
        json.file.fsize = 323443
        json.file.buffer = fs.readFileSync(path.join(json.file.fpath,json.file.fname));
        return gallery.getExif( json )
        .then(async (exif)=> {
            exif.Make.should.equal("NodeJS")
            exif.Model.should.equal("JIMP")
            exif.Rating.should.equal(0)
            exif.ImageDescription.should.equal("Test Description, Hello, Andras, Alexandra, Eva, Adam ,Gabor")
            exif.DateTimeOriginal.should.equal("2011:11:11 11:11:11")
        })

    });


})



describe.skip('Gallery Test Directory', function(){
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