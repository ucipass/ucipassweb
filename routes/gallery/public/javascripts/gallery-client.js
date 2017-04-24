var filearray = [] // result table from server
var galleryFiles = [] // array of URLs with full resolution pictures
var totalFiles = 0; // Number of files matching the search
var thumb64 = null;

$(document).ready(function(){
	selectfill();
	$('#filter-frdate').datepicker({format: 'yyyy-mm-dd',todayHighlight: true,autoclose: true});
	$('#filter-todate').datepicker({format: 'yyyy-mm-dd',todayHighlight: true,autoclose: true});
	$('#edit-date').datepicker({format: 'yyyy-mm-dd',todayHighlight: true,autoclose: true});
	$("#filter").click(function(e){ e.preventDefault(); $('#modal-filter').modal("toggle")	});
	$("#selectall").click(function(e) {  if($('#selectall').is(':checked')) {$('.cell').addClass('pic-select');} else{$('.cell').removeClass('pic-select');}   } );
	$("#filter-search").click(function(e){ e.preventDefault(); filterSearch(0); $('#modal-filter').modal("toggle")	});
	$("#edit").click(function(e){ e.preventDefault(); edit("0");} );
	$("#edit-save").click(function(e){ e.preventDefault(); save();} );
	
	$('#modal-filter').modal("show")
	//filterSearch(0)
})

function clickPic(index){
	if( $('#select-mode').val() == 'view'   ) { blueimp.Gallery(galleryFiles, {index: index}) ;  }
	if( $('#select-mode').val() == 'edit'   ) { edit(index)   }
	if( $('#select-mode').val() == 'select' ) { $('#cell'+index.toString()).toggleClass('pic-select');  }
	}


function selectfill(){
	pager(0)
	var people = [	{ id: "None", text: "None" }, 
					{ id: "Ottone", text: "Ottone" },
					{ id: "Istvanne", text: "Istvanne" }, 
					{ id: "Gabor", text: "Gabor" }, 
					{ id: "Iren", text: "Iren" }, 
					{ id: "Andras", text: "Andras" },
					{ id: "Eva", text: "Eva" }, 
					{ id: "Adam", text: "Adam" },
					{ id: "Alexandra", text: "Alexandra" }];

	$("#filter-limit").select2({
		data: [  { id: "50", text: "50" },{ id: "100", text: "100" },{ id: "250", text: "250" }, { id: "500", text: "500" },{ id: "1000", text: "1000" }]
		});
	$("#filter-rating").select2({
		allowClear: true,
		placeholder: "Rating",
		data: [  { id: 5, text: "Best" },{ id: 4, text: "Good" }, { id: 3, text: "Average" },{ id: 2, text: "Poor" },{ id: 1, text: "Delete" }]
		});
	$("#filter-people").select2({
		allowClear: true,
		placeholder: "People",
		data: people
		});
	$("#select-mode").select2({
		data: [  { id: "view", text: "view" }, { id: "edit", text: "edit" }, { id: "select", text: "select" }]
		});
	$("#edit-people").select2({
		allowClear: true,
		placeholder: "People",
		data: people
		});
	$("#edit-rating").select2({
		allowClear: true,
		placeholder: "Picture Rating",
		data: [  { id: 0, text: "Hidden" }, { id: 1, text: 'Delete' }, { id: 2, text: 'Bad' }, { id: 3, text: 'Average' }, { id: 4, text: 'Good' }, { id: 5, text: 'Best' }]
		});
	(new JSONData(username,"gallery",{cmd:"getselect2"})).post(function(res){
		console.log("SELECT2 Countries",res.data.attributes.countries)
		console.log("SELECT2 Events",res.data.attributes.event)
		$("#edit-cc").select2({
			allowClear: true,
			placeholder: "Country",
			data: res.data.attributes.countries
			});		
		$("#filter-cc").select2({
			allowClear: true,
			placeholder: "Country",
			data: res.data.attributes.countries
			});		
		$("#filter-event").select2({
			allowClear: true,
			placeholder: "Event",
			data: res.data.attributes.event
			});		
		});
	}
function pager(offset){
	//Turn off Event handlers before changes and delete content of selector
	$('#pages').off()
	$('#next').off()
	$('#prev').off()
	elemClear("pages");
	var imagePerPage = parseInt($('#filter-limit').val())
	imagePerPage = imagePerPage ? imagePerPage : 50
	var pages = Math.ceil(totalFiles ? totalFiles : 1  / imagePerPage);
	pages = pages ? pages : 1
	var selectData = []
	//Create Selector Index
	for (i=0; i < pages ; i++){
		var start = (i*imagePerPage + 1).toString();
		var end = ((i+1)*imagePerPage).toString();
		selectData.push( {id:i, text:  start+"-"+end+" of "+totalFiles })
		}
	//Initiate page selector
	$("#pages").select2({
		data: selectData
		});
	//Change page select to correct index	
	$("#pages").select2("val",( offset ? (offset/imagePerPage).toString() : "0" ))
	//EVENTS
	$('#pages').on('change', function (evt) {
		console.log("OFFSET",$(this).prop('selectedIndex'));
		var index = $(this).prop('selectedIndex')
		var offset = index * imagePerPage;
		filterSearch(offset);
		})
	$("#next").click(function(e){
		e.preventDefault();
		var index = parseInt($("#pages").val()) + 1;
		var max = ( totalFiles / imagePerPage ) -1 
		if(index > max) index = Math.ceil(max);
		$("#pages").select2("val",index.toString())
		});
	$("#prev").click(function(e){
		e.preventDefault();
		var index = parseInt($("#pages").val()) - 1;
		if(index < 0) index = 0;
		$("#pages").select2("val",index.toString())
		});
	}


function filterSearch(offset){
	elemClear("links");
	$('#links').append('<h1>Waiting for server...</h1>')
	galleryFiles = []
	console.log("SUBMIT VIEW")
	json = {}
	json.limit = $('#filter-limit').val()
	json.offset = offset
	json.hash = $('#filter-hash').val()
	json.fpath = $('#filter-fpath').val()
	json.fname = $('#filter-fname').val()
	json.fsize = $('#filter-fsize').val()
	json.frdate = $('#filter-frdate').val()
	json.todate = $('#filter-todate').val()
	json.event = $('#filter-event').val()
	json.desc = $('#filter-desc').val()
	json.location = $('#filter-location').val()
	json.cc = $('#filter-cc').val()
	json.people = $('#filter-people').val()
	json.rating = $('#filter-rating').val()
	json.cmd = "getimages"
	ioData = new JSONData(username,"gallery",json)
	console.log("SEND:",ioData.att().cmd,ioData.att());
	ioData.post(function(res){
		elemClear("links");
		elemClear("links");
		if( !res.data.attributes.images || !res.data.attributes.images.table) {
			elemClear("links");
			pager(0)
			console.log("RECEIVE No images received!",res);
			return
		}
		filearray = res.data.attributes.images.table
		totalFiles = res.data.attributes.images.count
		thumb64 = res.data.attributes.images.thumb
		var offset = res.data.attributes.images.offset
		console.log("RESULT:",offset,totalFiles,res);
		pager(offset)
		addElements({elemID:"links",index:0,filearray:filearray})
		.catch(function(e){console.log("FAIL:",e)})
		})
	}

function edit(index){
	if( $(".pic-select").length > 1){
		l = $(".pic-select").length
		$("#preview-bulk").show();
		$("#preview").hide();
		var filenames = ""
		for(var i=0; i< l; i++){
			var index = parseInt( $(".pic-select")[i].id.replace("cell","")  )
			filenames = filenames + filearray[index][1]+"/"+filearray[index][2] + "\n"
			}
		$('#edit-totalfiles').val("Total Files Selected: "+l.toString())
		$('#edit-filenames').val(filenames)
		}
	else{
		$("#preview-bulk").hide();
		$("#preview").show();
		$('.col-md-3').removeClass("pic-select")
		$('#cell'+index.toString()).toggleClass('pic-select');
		}
	var thumbFile = "/gallery/thumbs/"+filearray[index][0]+'.jpg'
	//var thumbFile = "/private/"+username+"/thumbs/"+filearray[index][0]+'.jpg'
	//console.log("CLICK EDIT",thumbFile)
	elemClear('edit-image')
	$('#edit-hash').val(filearray[index][0])
	$('#edit-filename').val(filearray[index][1]+"/"+filearray[index][2])
	$('#edit-size').val(filearray[index][3])
	$('#edit-date').val(filearray[index][4])
	$('#edit-event').val(filearray[index][5])
	if(filearray[index][6]) { $('#edit-desc').val(filearray[index][6]) }
	else{$('#edit-desc').val(filearray[index][1]+"/"+filearray[index][2])}
	$('#edit-location').val(filearray[index][7])
	$('#edit-cc').select2('val',filearray[index][8]) 
	//$('#edit-people').select2('val', (filearray[index][9]).split[","]) 
	var people = filearray[index][9] && filearray[index][9].indexOf(",") > 0 ? filearray[index][9].split(",") : filearray[index][9]
	console.log(people)
	$('#edit-people').select2('val',people) 
	$('#edit-rating').select2('val', filearray[index][10]);
	$('#edit-image').append('<img src="'+thumbFile+'" alt="THUMBS" onload=adjust(this) class="img-responsive" ></div>')
	$('#modal-edit').modal('toggle');
	}

function save(){
	var columns = ["hash"];
	var rows = [];
	var json = {} ;
	if($('#edit-chk-date').is(':checked'))		{ json.date = $('#edit-date').val() ; columns.push("date")}
	if($('#edit-chk-event').is(':checked'))		{ json.event = $('#edit-event').val() ; columns.push("event")}
	if($('#edit-chk-desc').is(':checked'))		{ json.desc = $('#edit-desc').val() ; columns.push("desc")}
	if($('#edit-chk-location').is(':checked'))	{ json.location = $('#edit-location').val() ; columns.push("location")}
	if($('#edit-chk-cc').is(':checked'))		{ json.cc = $('#edit-cc').val() ; columns.push("cc")}
	if($('#edit-chk-people').is(':checked'))	{ json.people =  $('#edit-people').val() ; columns.push("people") }
	if($('#edit-chk-people-add').is(':checked'))	{ json.peopleadd = 1;}
	if($('#edit-chk-people-del').is(':checked'))	{ json.peopledel = 1;}
	if($('#edit-chk-rating').is(':checked'))	{ json.rating = $('#edit-rating').val() ; columns.push("rating")}
	if( Object.keys(json).length == 0 ) { console.log("Nothing to Save!"); return; }
	var selected = $(".pic-select")
	for (var i= 0 ; i < selected.length; i++){
		var index = parseInt(selected[i].id.replace("cell",""))
		var oldRow = [ filearray[index][0] ]
		var newRow = [ filearray[index][0] ]
		if(json.date){ newRow.push(json.date) }
		if(json.event){ newRow.push(json.event) }
		if(json.desc){ newRow.push(json.desc) }
		if(json.location){ newRow.push(json.location) }
		if(json.cc){ newRow.push(json.cc) }
		if(json.people){
			if(	json.peopleadd && filearray[index][9] && filearray[index][9] != "" ){
				s = new Set( filearray[index][9].split(",") ) ; 
				json.people.forEach(function(item){ s.add(item)})
				newRow.push( [...s].toString() )
				}
			else if(json.peopledel){
				if(	!filearray[index][9] || filearray[index][9] == "" ) { newRow.push( "" )}
				else{
					s = new Set(filearray[index][9].split(",")) ; 
					json.people.forEach(function(item){ s.delete(item)})
					newRow.push( [...s].toString() )
					}
				}
			else{newRow.push( json.people.toString() )}
			}
		if(json.rating){ newRow.push(json.rating) }
		rows.push( [oldRow,newRow] )

		}		

	elemClear("links");
	$('#links').append('<h1>Saving Changes...</h1>')
	$('#modal-edit').modal("toggle")

	ioData = new JSONData(username,"gallery",{cmd:"saveimage", columns:columns,rows:rows})
	ioData.log("SEND");
	ioData.post(function(res){
		console.log("RESULT:",res.data.attributes);
		select();
		filterSearch(0);
		})

	}

function addElement(json,error){return new Promise(function(resolve, reject){try{
	var elemID = json.elemID;
	var index = json.index;
	var file = json.filearray[index];
	console.log(file[0])
	var fname = "/gallery/"+file[1]
	var fsize = file[3]
	var date  = file[4]
	var desc  = file[5]
	var location = file[6]  
	var people= file[7]
	var rating   = file[9]
	//var att   = file[9]
	var thumb64 = file[11]
	var hover = file[0]+"\n"+fname+"\n"+file[3]+"\n"+file[4]+"\n"+file[5]+"\n"+file[6]+"\n"+file[7]
	var rowID = "row_"+(Math.floor(index/4)*4).toString()
	var imgId = "img_"+index.toString()
	//console.log("BEFORE APPEND ELEMENT",json)

	if (index % 4){
		$('#'+rowID).append('<div id="cell'+index.toString()+'" class="col-md-3 cell" style="padding:2px">\
								<img id="img'+index.toString()+'" src="data:image/jpg;base64,'+ "thumb64" +'" \
								onload=adjust(this) onclick="clickPic('+index.toString()+')" class="img-responsive" \
								data-toggle="tooltip" data-placement="top" title="'+hover+'"></div>')
		}
	else{
		$('#'+elemID).append('<div id="'+rowID+'"></div>')
		$('#'+rowID).append( '<div id="cell'+index.toString()+'" class="col-md-3 cell" style="padding:2px">\
								<img id="img'+index.toString()+'" src="data:image/jpg;base64,'+ "thumb64" +'" \
								onload=adjust(this) onclick="clickPic('+index.toString()+')" class="img-responsive" \
								data-toggle="tooltip" data-placement="top" title="'+hover+'"></div>')
		}

	galleryFiles.push(fname);
	//console.log("SUCCESS",index,json.filearray.length)
	json.index++
	resolve(json)
	}catch(e){console.log(e);reject(e)}})}

function addThumbs(json,error){return new Promise(function(resolve, reject){try{
	var index = json.index;
	var file = json.filearray[index];
	var thumb64 = file[11]
	$("#img"+index.toString()).attr('src', 'data:image/png;base64,'+thumb64)
	json.index++
	setTimeout(function() {
		resolve(json)
	}, 10);
	
	}catch(e){console.log(e);reject(e)}})}

function addElements(json){return new Promise(function(resolve, reject){try{
	jcopy = JSON.parse(JSON.stringify(json))
	console.log("Number of Pictures Retrieved:",jcopy.filearray.length)
	promiseWaterfall( jcopy, addElement ,jcopy.filearray.length)
	.then(function(jcopy){
		jcopy.index = 0; 
		return jcopy;
		})
	.then( jcopy  => promiseWaterfall( jcopy, addThumbs ,jcopy.filearray.length))
	.then(	resolve,	reject)
	}catch(e){console.log(e);reject(e)}})}
	
function promiseWaterfall(initObj,promiseFn,count){return new Promise(function(resolve,reject){try {
	var start = (new Date()).getTime()
	var promiseArray = [];
	for (var i = 0; i < count; i++) { promiseArray.push(promiseFn)}
	promiseArray.reduce(function(preFn,curFn,index,array){
		return(preFn.then(curFn))
		},new Promise(function(resolve, reject){resolve(initObj)})
		)
	//.then(function(res,rej){		$('#status').val("complete");		})
	.then(resolve,reject)
	}catch(err){console.log("LOAD CSV ERROR:",err);reject(err.toString())}})}
	
function elemClear(elemId){
	var myNode = document.getElementById(elemId);
	while (myNode.firstChild) {
		myNode.removeChild(myNode.firstChild);
		}
	}
	
function adjust(img){
	var MAX_WIDTH = 640;
	var MAX_HEIGHT = 480;
	var width = img.width;
	var height = img.height;
	if (width > height) {
		if (width > MAX_WIDTH) {
		height *= MAX_WIDTH / width;
		width = MAX_WIDTH;
		}
	} else {
		if (height > MAX_HEIGHT) {
			width *= MAX_HEIGHT / height;
			height = MAX_HEIGHT;
			}
		}
	img.setAttribute("width",width);
	img.setAttribute("height",height);

	}

