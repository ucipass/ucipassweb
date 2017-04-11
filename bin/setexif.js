var fs = require('fs')
var path = require('path')
var f = require('./lib_files.js')
var gallery = require("./gallery")

if (process.argv.length <= 3) {
    console.log("Usage: " + __filename + " rootGalleryDir galleryDir renameFiles");
    process.exit(-1);
}
 
var rootGalleryDir = process.argv[2];
var galleryDir = process.argv[3];
var renameFiles = process.argv[4]

function findFile(rootfiles,file){
    var matches =[];
    for(var i=0 ;i<rootfiles.length;i++){
        var rfile = {}
        rfile.fname = rootfiles[i][0]
        rfile.fpath = rootfiles[i][1]
        rfile.fsize = rootfiles[i][2]
        rfile.ctime = rootfiles[i][3]
        rfile.mtime = rootfiles[i][4]

        //console.log(rfile,rfile.fsize , file.fsize)
        var fpath = path.join(path.relative(rootGalleryDir,file.fpath) ,file.fname)
        var rpath = path.join(path.relative(rootGalleryDir,rfile.fpath) ,rfile.fname)
        if (rfile.fsize == file.fsize && fpath != rpath){
            matches.push(rfile)
            //console.log("\tMATCH:",path.join(  path.relative(rootGalleryDir,rfile.fpath) ,rfile.fname), "\tDate:",rfile.mtime)
            //console.log(fpath,rpath)
        }
    }
    return matches;
}

async function setexif(galleryDir){ try{

    var rootfiles = await f.getFullDirListRecursive(rootGalleryDir)
    var files = await f.getFullDirListRecursive(galleryDir)

    console.log("No of Files:", files.length, rootfiles.length)
    var cNoExif = 0;
    var cExif = 0;
    for(var i = 0 ; i < files.length ; i++){
        var json = { file: {}}
        json.file.fname = files[i][0]
        json.file.fpath = files[i][1]
        json.file.fsize = files[i][2]
        json.file.ctime = files[i][3]
        json.file.mtime = files[i][4]
        json.file.type = json.file.fname.slice((json.file.fname.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase()
        if (json.file.type != 'jpg') {continue}
        var filename = path.join(json.file.fpath,json.file.fname)
        var moment = require("moment")
        var fileDate = moment(json.file.mtime.toISOString())

        json.file.buffer = fs.readFileSync(filename);
        var exif  = await gallery.getExif( json )
        var duplicates = findFile(rootfiles,json.file)
        if ( !(exif && exif.DateTimeOriginal) ){
            cNoExif++
            var newFileNameDate = fileDate.add(i,'seconds').format("YYYYMMDD_HHmmss_SSS")+".jpg"
            var newFileNameExif = null
            json.exif = { "DateTimeOriginal" : fileDate.format("YYYY:MM:DD HH:mm:ss") }
            console.log("No EXIF File: #",cNoExif, path.relative(galleryDir,filename) ,"\tDate:", newFileNameDate)
            await gallery.setExif( json )
        }
        else {
            cExif++
            var newFileNameDate = fileDate.format("YYYYMMDD_HHmmss_SSS")+".jpg"
            var newFileNameExif = null
            var exifDate = moment(exif.DateTimeOriginal,"YYYY:MM:DD HH:mm:ss")
            var duration = moment.duration(exifDate.diff(fileDate));
            var days = Math.floor(duration.asDays())
            newFileNameExif = exifDate.format("YYYYMMDD_HHmmss_SSS")+".jpg"
            console.log("EXIF File: #",cExif, path.relative(galleryDir,filename) ,"DIFF:",days, "\tDate:",newFileNameDate, "EXIF:", newFileNameExif)
            if(renameFiles){
                await new Promise((res,rej)=>{    
                    fs.rename( filename, path.join(json.file.fpath, newFileNameExif ), (err)=>{
                        if(err){rej(err)}
                        res(true)
                    })    
                })
            }            
        }
        
        if(duplicates){
            for(var x = 0; x< duplicates.length ;x++) {
                var rfile = duplicates[x]
                console.log("\tMATCH:",path.join(  path.relative(rootGalleryDir,rfile.fpath) ,rfile.fname), "\tDate:",rfile.mtime)
            }
        }
        
    }
}catch(e){ console.log(e) }}

setexif(galleryDir);