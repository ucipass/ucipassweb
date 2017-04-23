var path = require('path')
var fs = require('fs')
var crypto = require('crypto');
var geolib = require('geolib');
var moment = require('moment');
var piexif = require("piexifjs");
var express = require('express');
var File = require("ucipass-file")
var Directory = require("ucipass-directory")

var sql = require('./lib/lib_sqlite.js')
var JSONData = require('./lib/jsondata.js');

var logger = require('winston');
logger.emitErrs = true;
logger.loggers.add('JPG', { console: { level: 'info', label: "JPG", handleExceptions: true, json: false, colorize: true}});
var log = logger.loggers.get('JPG');



class JPG extends File {
	constructor(fpath) {
		super(fpath);
		this.exif	= {};
		this.thumb	= null
		this.idate	= null
		this.event	= null
		this.desc	= null
		this.location	= null
		this.cc		= null
		this.people = null
		this.rating = null
		this.att	= null
	}

	isValid() {
		return true;
	}

	async createImageFile(message, xsize ,ysize ){try{
		var filename = this.fpath;
		xsize = xsize ? parseInt(xsize) : 640
		ysize = ysize ? parseInt(ysize) : 480
		message = message ? message : filename
		var Jimp = require("jimp");
		var path = require("path");
		log.debug("Creating Image:", filename )
		
		var image = await new Jimp(xsize, ysize)
		var font = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE)
		var image = await image.print(font, 10, 10, message)
		await image.write(filename)
		log.debug("Image",filename,"with message:",message,"Created !")
		return this
	}catch(err){ log.error(err); return Promise.reject(err) }}

	async getThumb(){try{
		var jpg = this;
		var Jimp = require("jimp");
		var start = new Date().getTime();
		if (!jpg.buffer){ await jpg.read() }
		var buffer = this.buffer
		var image = await Jimp.read(buffer)
		log.debug("THUMB: resizing image W:",image.bitmap.width,"H:",image.bitmap.height)
		var xSize, ySize
		if (image.bitmap.width > image.bitmap.height ) { xSize = 640 ; ySize = Jimp.AUTO}
		else { xSize = Jimp.AUTO ; ySize = 480 }
		image = await image.resize( xSize, ySize)
		log.silly("THUMB: Resize completed!")
		var data = await new Promise((resolve,reject)=>{
			image.getBase64( Jimp.MIME_JPEG, (err,data)=> {
				if(err){reject(err)}
				else{resolve(data)}
			})
		})
		data = data.replace(/^data:image\/\w+;base64,/, '')
		log.debug("THUMB: base64 buffer created. W:",image.bitmap.width,"H:",image.bitmap.height)
		this.thumb = data
		return jpg				
	}catch(err){ log.error(err); return Promise.reject(err) }}

	async getExif(){try{
		//json.file is the only parameter that is used
		var file = this
		var exif = {}
		var resolve,reject
		var final = new Promise((res,rej) => { resolve = res, reject = rej })
		var ExifImage = require("exif").ExifImage
		if (!this.buffer){ await this.read() }
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
				exif.ImageDescription	= (exifData.image && exifData.image.ImageDescription) ?	exifData.image.ImageDescription : null
				exif.Make	= (exifData.image && exifData.image.Make) ?		exifData.image.Make : null
				exif.Model	= (exifData.image && exifData.image.Model) ?	exifData.image.Model : null
				exif.Rating	= (exifData.image && exifData.image.Rating >= 0 ) ?	exifData.image.Rating : null
				exif.Model	= (exifData.image && exifData.image.Model) ?	exifData.image.Model : null
				log.silly("Exif GPS Data",exif)
				if (exifData.gps && exifData.gps.GPSLongitude){
					exif.gps = {}
					exif.exifData = exifData
					log.silly("Exif GPS Conversion Start...")
					exif.gps.lat = file.convertGPS(exifData.gps.GPSLatitude[0], exifData.gps.GPSLatitude[1], exifData.gps.GPSLatitude[2], exifData.gps.GPSLatitudeRef) 
					log.silly("Exif Lat:",exif.gps.lat)
					exif.gps.lon = file.convertGPS(exifData.gps.GPSLongitude[0], exifData.gps.GPSLongitude[1], exifData.gps.GPSLongitude[2], exifData.gps.GPSLongitudeRef)
					log.silly("Exif Lon:",exif.gps.lon)
				}
				log.debug( "EXIF: Complete:" , exif)
				file.exif = exif;
				resolve(file) ;
			}
		})
		return final
	}catch(err){ log.error(err); return Promise.reject(err) }}

	async setExif(){try{
		//json.file is the only parameter that is used
		var file = this
		var exif = this.exif
		var resolve,reject
		var final = new Promise((res,rej) => { resolve = res, reject = rej })
		if (!exif ) {
			reject("No JSON EXIF Passed to set Exif!")
		}
		if (!this.buffer){ await this.read() }
		var exifObj =  piexif.load("data:image/jpg;base64,"+file.buffer.toString("base64"))
		//exifObj["0th"][piexif.ImageIFD.ImageDescription] = "Hello World";
		//exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal] = "2010:10:11 09:09:09";
		if(exif.DateTimeOriginal){
			exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal] = exif.DateTimeOriginal
		}
		if(exif.ImageDescription){
			exifObj["0th"][piexif.ImageIFD.ImageDescription] = exif.ImageDescription
		}
		if(exif.Make){
			exifObj["0th"][piexif.ImageIFD.Make] = exif.Make
		}
		if(exif.Model){
			exifObj["0th"][piexif.ImageIFD.Model] = exif.Model
		}
		if(exif.Rating){
			exifObj["0th"][piexif.ImageIFD.Rating] = parseInt(exif.Rating)
		}
		if(exif.gps){
			exifObj["GPS"][piexif.GPSIFD.GPSDateStamp] = "1999:99:99 99:99:99";
			exifObj["GPS"][piexif.GPSIFD.GPSLatitudeRef] = exif.gps.GPSLatitudeRef
			exifObj["GPS"][piexif.GPSIFD.GPSLatitude] = exif.gps.GPSLatitude
			exifObj["GPS"][piexif.GPSIFD.GPSLongitude] = exif.gps.GPSLongitude
			exifObj["GPS"][piexif.GPSIFD.GPSLongitudeRef] = exif.gps.GPSLongitudeRef
		}
		exifObj["0th"][piexif.ImageIFD.Copyright] ="Copyright, Andras Arato, 2017. All rights reserved."
		var exifBytes = piexif.dump(exifObj)
		var newData = piexif.insert(exifBytes, file.buffer.toString("binary"));
		file.buffer = new Buffer(newData, "binary");
		await file.write()
		resolve(file)
		return final
	}catch(err){ log.error(err); return Promise.reject(err) }}

	async setExifDate(fdate){try{
		var jpg = this
		if(!fdate) {throw "No date given to set EXIF"}
		jpg.exif.DateTimeOriginal = moment(fdate).format("YYYY:MM:DD HH:mm:ss")
        return this.setExif()
	}catch(err){ log.error(err); return Promise.reject(err) }}

	async renameByExifDate(){try{
		var file = this
		// At minimum file.fpath, file.fname has to be present
		if (  file.type().toLowerCase() != ".jpg") { 
			throw("Invalid file type NOT JPG!") 
		}
		await file.getExif()
		if ( ! file.exif.DateTimeOriginal) {
			if(!file.mtime) { await file.stat()}
			await file.setExifDate(file.mtime)
		}
		var exifDateString = file.exif.DateTimeOriginal
		var exifDate = moment(exifDateString,"YYYY:MM:DD HH:mm:ss")
		var exifDateFilename = path.join(path.dirname(file.fpath),  exifDate.format("YYYYMMDD_HHmmss_SSS")+".jpg" )
		// If the filename is already formatted correctly, do not change anything
		if ( exifDate.format("YYYYMMDD_HHmmss") == file.name().substring(0,15) && file.name().length == 23){
			return file
		}
		// If the new filename is taken increase the milliseconds in the filename until filename is NOT taken
		if( await file.isFile(exifDateFilename) ){
			for(var i = 1; i<991; i++){
				exifDate = exifDate.add(1,"milliseconds")
				exifDateFilename = path.join(path.dirname(file.fpath),  exifDate.format("YYYYMMDD_HHmmss_SSS")+".jpg" )
				if(await file.isFile(exifDateFilename)){
					// continue
				}
				else{
					if(i == 900){
						errorStr = "TOO MANY FILE ALREADY EXISTS WITH SAME DATETIME: " + path.join(file.fpath,file.fname)
						log.error(errorStr)
						throw(err)
					}
					i = 1000;
				}
			}
		}
		await file.rename(exifDateFilename )
		file.fpath = exifDateFilename;
		return file
		
	}catch(err){ log.error(err); return Promise.reject(err) }}

	async getLocation(dbname){try{
		var jpg = this;
		if ( !jpg || !jpg.exif || !jpg.exif.gps|| !jpg.exif.gps.lon || !jpg.exif.gps.lat  ) {
			log.silly("LOCATION: No location info found in Exif")
			jpg.geo = {}
			return Promise.resolve(jpg.geo) ; 
		}
		var lat = jpg.exif.gps.lat ;
		var lon = jpg.exif.gps.lon ;
		var hash = jpg.hash ? jpg.hash : await jpg.hashfn().hash;
		var json = {dbname:dbname}
		json.sqlstm = "SELECT * FROM locations WHERE "+	" lon < " + (lon+2).toString()+	" AND lon > " + (lon-2).toString()+	" AND lat < " + (lat+2).toString()+	" AND lat > " + (lat-2).toString() ;			
		return sql.open(json)
		.then(sql.stm(json.sqlstm))
		.then(sql.read)
		.then(function(json){
			var shortestRow = []
			var distance = 10000000 ;
			log.silly("LOCATION: MATCHES", json.results[json.results.length-1].table.length)
			var potGPS=json.results.pop().table.forEach(function(item,index){
				var from = {latitude: parseFloat(jpg.exif.gps.lat), longitude:  parseFloat(jpg.exif.gps.lon)}
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

	convertGPS(days, minutes, seconds, direction) {
		try{
			direction.toUpperCase();
			var dd = days + minutes/60 + seconds/(60*60);
			if (direction == "S" || direction == "W") {	dd = dd*-1;	} // Don't do anything for N or E
			return dd.toFixed(7);
		}
		catch(err){
			log.error("ConvertGPS Error: Incorrect Format")
			throw("ConvertGPS Error: Incorrect Format")
			return 0;
		}
	}




}

module.exports = JPG