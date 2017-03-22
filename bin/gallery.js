var path = require('path')
var fs = require('fs')
var crypto = require('crypto');
var geolib = require('geolib')

var log = require('./logger.js').loggers.get('GALLERY');
var sql = require('./lib_sqlite.js')
var f = require("./lib_files.js")
var JSONData = require('./jsondata.js');


var baseDir     = path.normalize(path.join( __dirname,".."))
var galleryDir  = path.normalize(path.join(   baseDir, "gallery/files"));
var dbname      = path.normalize(path.join(   baseDir, "db/gallery.db"));


function delay (time){return new Promise((res,rej)=>{ setTimeout( ()=> {console.log("Delayed",time,"ms") ; res(time) }, time )  })}

function JSONGallery(galleryDir,dbname){

	var galleryDir = path.normalize(galleryDir)
	var dbname = path.normalize(dbname)
	this.baseDir	=	path.normalize(path.join( __dirname,".."))
	this.dbname		=	path.normalize(path.join(this.baseDir, dbname))
	this.galleryDir	=	path.normalize(path.join(this.baseDir, galleryDir))
	this.file		=	{ fname: null, fpath: null, fsize: null, ctime: null, mtime: null, hash: null ,type:null, buffer: null}
	this.image		=	{ type: null, date: null, event: null, desc: null, location: null, cc: null, people:null, rating:null, att:null}
	this.thumb		=	null ;
	this.fileBuffer =	null ;

}

async function initDB(json){ try{
    // Check and Skip file creation if database exists
	var isFile = await f.isFile(json.dbname)
    if ( isFile) { 
        log.info("Database file:", json.dbname )
		return Promise.resolve(json)
    }
	// If not create new database file one
	await Promise.resolve(json)
	.then(function(json){ log.info("Database File NOT found creating new one!",json.dbname) ; return json})
	.then(sql.open(json))
	.then(sql.stm("CREATE TABLE IF NOT EXISTS files (fname NOT NULL, fpath NOT NULL, fsize NOT NULL ,hash NOT NULL, ctime DATETIME NOT NULL, mtime DATETIME NOT NULL, PRIMARY KEY (fname,fpath)) "))
	.then(sql.write)
	.then(sql.stm("CREATE TABLE IF NOT EXISTS images (hash NOT NULL,type, date DATETIME, event, desc, location, cc, people, rating INTEGER, att, PRIMARY KEY (hash)) "))
	.then(sql.write)
	.then(sql.stm("CREATE TABLE IF NOT EXISTS locations (lat  REAL NOT NULL ,lon  REAL NOT NULL , location, cc) "))
	.then(sql.write)
	.then(sql.stm("CREATE TABLE IF NOT EXISTS thumbs (hash NOT NULL,thumb BLOB NOT NULL, PRIMARY KEY (hash)) "))
	.then(sql.write)
	.then(sql.loadCSV(  path.join( path.dirname(json.dbname),"locations.csv") ,"locations"))
	.then(sql.loadCSV(  path.join( path.dirname(json.dbname),"countries.csv") ,"countries"))
	.then(function(json){ log.info("Created tables: files,images,thumbs,locations,countries.",json.dbname) ; return json})
	return Promise.resolve(json);

}catch(err){ log.error(err); return Promise.reject(err) }}

async function getNewFiles(json){try{

	// Get all files from gallery
	var galleryFiles = await f.getFullDirListRecursive(json.galleryDir)
	var galleryFilesString = galleryFiles.map((item,index) => { return path.join(item[1],item[0])})
	log.debug("Total Gallery Files:",galleryFiles.length)
	// Get all files from SQL Database
	var sqlFiles = 	await sql.sReadTable(json.dbname,"files")
	sqlFilesSet = new Set ( sqlFiles.table.map((item,index) => { return path.join(item[1],item[0])}) )
	log.debug("Total SQL Files:", sqlFiles.table.length)
	var newGalleryFiles = galleryFiles.filter((item,index) => {
		var fileString = path.join(item[1],item[0])
		return !sqlFilesSet.has(fileString)
	})
	return Promise.resolve(newGalleryFiles)

}catch(err){ log.error(err); return Promise.reject(err) }}

function getHash(file){ try {
	// file.fname, file.fpath, file.fsize
    var resolve, reject
    var final = new Promise ( (res,rej) => { resolve = res ; reject = rej } )
	var maxBuffer = 20000000
	filename = path.join( file.fpath, file.fname )
	isBuffered = file.fsize < maxBuffer
	var stream =  fs.createReadStream(filename);
	var hash = crypto.createHash('md5')
	var start = new Date().getTime();
	var buffer = [];
	stream.on('error', function (err) {
		console.log("HASH: ERROR READING FILE:",err)
		reject(err)
		})
	stream.on('data', function (data) {
		if(isBuffered) {buffer.push(data);}
		hash.update(data, 'utf8');
	})
	stream.on('end', function () {
		if(isBuffered) {
			file.buffer = Buffer.concat(buffer);
		}
		file.hash = hash.digest('hex');
		var end = new Date().getTime();
		var totalTime = end-start;
		log.debug( "HASH:" , file.hash , " Time:" , totalTime.toString() , "ms " )
		resolve(file)
	})
	log.debug( "HASH: accessing file:", filename )
	stream.read();
    return final;
}catch(err){ log.error(err); return Promise.reject(err) }}

function getExif(json){try{
	//json.file is the only parameter that is used
	var file = json.file
	var exif = {}
	var resolve,reject
	var final = new Promise((res,rej) => { resolve = res, reject = rej })
	var ExifImage = require("exif").ExifImage
	if (!file.buffer) { 
		log.error("EXIF: Empty buffer passed!")
		resolve(exif);
	}
	else{
		new ExifImage( file.buffer , function (error, exifData) {
			if(error){
				log.debug("EXIF ERR: No Data:")
				resolve(exif)
			}
			else if (!exifData || !exifData.exif || !exifData.exif.DateTimeOriginal) {
				log.debug("EXIF: No Data:")
				resolve(exif)
			}
			else{
				log.silly("EXIF: Starting...",exif)
				exif.DateTimeOriginal = exifData.exif.DateTimeOriginal
				exif.Make	= (exifData.image && exifData.image.Make) ?		exifData.image.Make : null
				exif.Model	= (exifData.image && exifData.image.Model) ?	exifData.image.Model : null
				log.silly("Exif GPS Data",exif)
				if (exifData.gps && exifData.gps.GPSLongitude){
					exif.gps = {}
					log.silly("Exif GPS Conversion Start...")
					exif.gps.lat = convertGPS(exifData.gps.GPSLatitude[0], exifData.gps.GPSLatitude[1], exifData.gps.GPSLatitude[2], exifData.gps.GPSLatitudeRef) 
					log.silly("Exif Lat:",exif.gps.lat)
					exif.gps.lon = convertGPS(exifData.gps.GPSLongitude[0], exifData.gps.GPSLongitude[1], exifData.gps.GPSLongitude[2], exifData.gps.GPSLongitudeRef)
					log.silly("Exif Lon:",exif.gps.lon)
				}
				log.debug( "EXIF: Complete:" , exif) 
				resolve(exif) ;
			}
		})
	return final
	}
}catch(err){ log.error(err); return Promise.reject(err) }}

function getThumb(fileorbuffer){try{
	var Jimp = require("jimp");
	var start = new Date().getTime();
    return Jimp.read(fileorbuffer)
    .then(function (image) { return new Promise((res,rej)=>{
		log.debug("THUMB: resizing image W:",image.bitmap.width,"H:",image.bitmap.height)
		var xSize, ySize
		if (image.bitmap.width > image.bitmap.height ) { xSize = 640 ; ySize = Jimp.AUTO}
		else { xSize = Jimp.AUTO ; ySize = 480 }
        image.resize( xSize, ySize, (err,data)=> {
            log.silly("THUMB: Resize completed!")
            res(image)
        })        
    })})
    .then(function (image) { return new Promise((res,rej)=>{
        image.getBase64( Jimp.MIME_JPEG, (err,data) => {
			var end = new Date().getTime();
			var totalTime = end-start;
        	log.debug("THUMB: base64 buffer created. W:",image.bitmap.width,"H:",image.bitmap.height,"Time:",totalTime,"ms")
            res( data.replace(/^data:image\/\w+;base64,/, '') )
        })
    })})    
}catch(err){ log.error(err); return Promise.reject(err) }}

function getLocation(json){try{
	if ( !json || !json.exif || !json.exif.gps|| !json.exif.gps.lon || !json.exif.gps.lat  ) {
		log.silly("LOCATION: No location info found in Exif")
		json.geo = null
		return Promise.resolve(json) ; 
	}
	var lat = json.exif.gps.lat ;
	var lon = json.exif.gps.lon ;
	var hash = json.hash;
	json.sqlstm = "SELECT * FROM locations WHERE "+	" lon < " + (lon+2).toString()+	" AND lon > " + (lon-2).toString()+	" AND lat < " + (lat+2).toString()+	" AND lat > " + (lat-2).toString() ;			
	return sql.open(json)
	.then(sql.stm(json.sqlstm))
	.then(sql.read)
	.then(function(json){
		var shortestRow = []
		var distance = 10000000 ;
		log.silly("LOCATION: MATCHES", json.results[json.results.length-1].table.length)
		var potGPS=json.results.pop().table.forEach(function(item,index){
			var from = {latitude: parseFloat(json.exif.gps.lat), longitude:  parseFloat(json.exif.gps.lon)}
			var to = {latitude:  parseFloat(item[0]), longitude: parseFloat(item[1]) }
			var cDistance = geolib.getDistance(from,to)
			//log.silly(item);
			//log.silly("LOCATION: Distance",distance,cDistance,from,to);
			if (cDistance < distance) { distance = cDistance ; shortestRow=item}
			})
        var lat = shortestRow[0]
        var lon = shortestRow[1]
		var location = shortestRow[2]
		var cc = shortestRow[3]
        var geo = { location:location,cc:cc,lat:lat,lon:lon}
		log.debug("LOCATION:",geo)
        return(geo)
		})

}catch(err){ log.error(err); return Promise.reject(err) }}


function createImageFile(filename, message){
	var Jimp = require("jimp");
	var path = require("path");
    var resolve,reject
    var final = new Promise((res,rej)=>{resolve=res,reject=rej})
    console.log("Creating Image:", filename )
    var j = new Jimp(1024, 768, function (err, image) {
        Jimp.loadFont(Jimp.FONT_SANS_128_WHITE)
        .then(function (font) { 
            image.print(font, 10, 10, message)
            return true
        })
        .then( ()=> { return new Promise((res,rej)=>{
            image.write( filename, (err,data)=> {
                console.log("Image",filename,"with message:",message,"Created !")
                resolve(true)
                res(true)
            })
        })})
    });
    return final;
}

function convertGPS(days, minutes, seconds, direction) {
	try{
		direction.toUpperCase();
		var dd = days + minutes/60 + seconds/(60*60);
		if (direction == "S" || direction == "W") {	dd = dd*-1;	} // Don't do anything for N or E
		return dd.toFixed(7);
	}
	catch(err){
		log.error("ConvertGPS Error: Incorrect Format")
		return 0;
	}
}
async function processFiles(json){ try {
    var resolve, reject
    var final = new Promise ( (res,rej) => { resolve = res ; reject = rej } )
    var json = new JSONGallery("test/gallery","test/gallery.db")
    await initDB(json)
	var newGalleryFiles = await getNewFiles(json)
    // For every new files execute the below code
    for( x=0 ; x<newGalleryFiles.length ; x++) {
		log.debug("-------------------------------------------------")
        var currentFile = newGalleryFiles[x]
        json.file.fname = currentFile[0]
        json.file.fpath = currentFile[1]
        json.file.fsize = currentFile[2]
        json.file.mtime = currentFile[3].toISOString()
        json.file.ctime = currentFile[4].toISOString()
		json.file.type = json.file.fname.slice((json.file.fname.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase()
		var filesColumns = ["fname","fpath","fsize","hash","ctime","mtime"]
		var FilesNewRow = [json.file.fname, path.relative(json.galleryDir,json.file.fpath), json.file.fsize,json.file.hash,json.file.ctime,json.file.mtime]
        log.info("Processing" ,x+1 ,"of" ,newGalleryFiles.length, path.join(json.file.fpath,json.file.fname) )
		 // Get HASH and BUFFER for next new file empty buffer before debug
		json.file = await getHash(json.file)
		await sql.sInsertRow(json.dbname,"files",filesColumns,FilesNewRow)

        // See if thumb is in the SQL thumbs table
		var existingThumbRow = await sql.sReadTable(json.dbname,"thumbs",["hash"], [[true,["hash"],"IS",json.file.hash]])
		if (existingThumbRow.table.length < 1){
			var columns = ["hash","thumb"]
			var hash = json.file.hash
			var thumb = await getThumb(json.file.buffer)
			var newRow = [hash,thumb]
			await sql.sInsertRow(json.dbname,"thumbs",columns,newRow)
		}
        // See if hash is in the SQL images table
        var existSqlImageRow = await sql.sReadTable(json.dbname,"images",["hash"], [[true,["hash"],"IS",json.file.hash]])
		if (existSqlImageRow.table.length < 1){
			json.exif = await getExif(json)
			json.geo = await getLocation(json)
			//json.file.buffer = null
			var columns = ["hash","type","date","event","desc","location","cc","people","rating","att"]
			var hash = json.file.hash
			var type = json.file.type
			var date = json.file.ctime
			var event = json.file.fpath
			var desc = json.file.fpath
			var location = json.geo.location
			var cc = json.geo.cc
			var people = null
			var rating = null
			var att = JSON.stringify(json.exif)
			var newRow = [hash,type,date,event,desc,location,cc,people,rating,att]
			await sql.sInsertRow(json.dbname,"images",columns,newRow)
		}
		json.file.buffer = null
        json.file.buffer = null
		// Insert into SQL files table
        //var newSqlFileRow = [ json.file.fname, json.file.fpath, json.file.fsize, json.hash, json.file.ctime.toISOString(), json.file.mtime.toISOString()]
        //await sql.sInsertRow(json.dbname,"files", ["fname", "fpath", "fsize", "hash" , "ctime", "mtime" ],newSqlFileRow)
        // Insert into SQL images table
        //var newSqlFileRow = [ json.file.fname, json.file.fpath, json.file.fsize, json.hash, json.file.ctime.toISOString(), json.file.mtime.toISOString()]
        //await sql.sInsertRow(json.dbname,"files", ["fname", "fpath", "fsize", "hash" , "ctime", "mtime" ],newSqlFileRow)
		}
	resolve(true)
    return final
}catch(err){ 
    log.error(err); 
    return Promise.reject(err) 
}}

exports.JSONGallery = JSONGallery;
exports.initDB          = initDB;
exports.getHash         = getHash;
exports.getThumb        = getThumb;
exports.getExif        = getExif;
exports.createImageFile    = createImageFile;
exports.convertGPS     = convertGPS;
exports.processFiles    = processFiles;

/*
var json = new JSONGallery("../test/gallery","../test/gallery.db")
new Promise( (resolve,reject) => { fs.unlink(json.dbname, ()=> resolve(1)) } )
.then(()=>processFiles(json))
*/