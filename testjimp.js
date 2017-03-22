

async function createTestImages(imagePath){
	var Jimp = require("jimp");
	var path = require("path");
	for( var x = 1 ; x <=3 ; x++) {
		var resolve,reject
		var final = new Promise((res,rej)=>{resolve=res,reject=rej})
		var tesfile = path.join ( imagePath ? imagePath : "." , "test" + x.toString() + ".jpg" )
		var testmsg = "Picture " + x.toString()
		console.log("Creating Test Image:",testfile)
		var j = new Jimp(1024, 768, function (err, image) {
			Jimp.loadFont(Jimp.FONT_SANS_128_WHITE)
			.then(function (font) { image.print(font, 10, 10, testmsg) })
			.then( ()=> image.write( testfile ) )
			.then( ()=> { 
				//console.log("Test Image",x,"Created !") ;
				resolve(true) 
			})
			.catch( reject )
		});
		await final;
	}
	return Promise.resolve(true)
}

createTestImages(".")