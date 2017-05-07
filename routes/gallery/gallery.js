var path = require('path')
var fs = require('fs')
var express = require('express');
var JSONData = require('./lib/jsondata.js');
var GalleryDB = require("./gallerydb.js")
var logger = require('winston');

logger.emitErrs = true;
logger.loggers.add('GALLERY', { console: { level: 'info', label: "GALLERY", handleExceptions: true, json: false, colorize: true}});
var log = logger.loggers.get('GALLERY');
var router	=	express.Router();
var galleryDir = path.join(__dirname,"files")
var dbname = path.join(__dirname,"gallery.db")
var db = new GalleryDB(galleryDir,dbname)
db.init()
.then(()=>{db.getNewFiles()})


router.get("/", function (req, res) {
	var render = path.join(__dirname,"gallery")
	//console.log(render)
	res.render(render,{title:"gallery" ,user:req.user?req.user.id:null ,message: "gallery",redir:req.query.redir });
});
router.post("/", function (req, res) {
	if (req.body && req.body.data){
		var ioData = new JSONData();
		ioData.setjson(req.body);
		log.info("IO: RECV:",ioData.id(),ioData.type(),ioData.att().cmd);
		log.debug("IO: RECV ATT:",ioData.att());
		}
	else{
		console.log("IO: POST INVALID: ",req.body);
		res.end("IO: INVALID POST received by Nodejs!\n");
		return;
	}

	if ( db.validFn( ioData.att().cmd )) {
		var fnName = ioData.att().cmd
		ioData.att().cmd += "-reply";
		db[fnName](ioData)
		.then( ioData => {
			log.info("IO: SEND:",ioData.id(),ioData.type(),ioData.att().cmd);
			log.debug("IO: SEND ATT:",ioData.att());
			res.json(ioData.getjson()); //THIS IS WHERE THE RESPONSE IS SENT
		})
	}
	else {
		ioData.att().cmd += "-nomatch";
		log.error("IO: SEND:",ioData.id(),ioData.type(),ioData.att().cmd);
		res.json(ioData.getjson()); //THIS IS WHERE THE RESPONSE IS SENT
	}
})

router.use(express.static(path.join(__dirname, 'public')));
router.use(express.static(path.join(__dirname, 'files')));

router.post("*", function (req, res) {
	console.log("NO MATCH", req.url,req,method)
})
module.exports = router




