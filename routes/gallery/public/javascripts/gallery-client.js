var filearray = [] // result table from server
var galleryFiles = [] // array of URLs with full resolution pictures
var totalFiles = 0; // Number of files matching the search
var thumb64 = null;

$(document).ready(function(){
	elementSetup();
	//$('#modal-filter').modal("show")
	filterSearch(0)
})

function clickPic(index){
	if( $('#select-mode').val() == 'view'   ) { blueimp.Gallery(galleryFiles, {index: index}) ;  }
	if( $('#select-mode').val() == 'edit'   ) { edit(index)   }
	if( $('#select-mode').val() == 'select' ) { $('#cell'+index.toString()).toggleClass('pic-select');  }
	}


function elementSetup(){
	// Setup Static Select Elements
	//pager(0)
	var people = [	{ id: "None", text: "None" }, 
					{ id: "Ottone", text: "Ottone" },
					{ id: "Istvanne", text: "Istvanne" }, 
					{ id: "Gabor", text: "Gabor" }, 
					{ id: "Iren", text: "Iren" }, 
					{ id: "Andras", text: "Andras" },
					{ id: "Eva", text: "Eva" }, 
					{ id: "Adam", text: "Adam" },
					{ id: "Alexandra", text: "Alexandra" }];
	$("#pages").select2({
		data: [{id:0, text:  "0-0 of 0" }]
	});
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
	// Setup Dynamic Select Elements from Database
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
	// Setup Datepickers
	$('#filter-frdate').datepicker({format: 'yyyy-mm-dd',todayHighlight: true,autoclose: true});
	$('#filter-todate').datepicker({format: 'yyyy-mm-dd',todayHighlight: true,autoclose: true});
	$('#edit-date').datepicker({format: 'yyyy-mm-dd',todayHighlight: true,autoclose: true});
	// Setup Events
	$("#filter").click(function(e){ e.preventDefault(); $('#modal-filter').modal("toggle")	});
	$("#selectall").click(function(e) {  if($('#selectall').is(':checked')) {$('.cell').addClass('pic-select');} else{$('.cell').removeClass('pic-select');}   } );
	$("#filter-search").click(function(e){ e.preventDefault(); filterSearch(0); $('#modal-filter').modal("toggle")	});
	$("#edit").click(function(e){ e.preventDefault(); edit("0");} );
	$("#main-mode").change(function() { filterSearch(0); })
	$("#edit-save").click(function(e){ e.preventDefault(); save();} );
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


async function filterSearch(offset){
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
	var res = await ioData.post().catch( (err)=>{console.log("FAILED POST:",e)} )
	elemClear("links");
	elemClear("links");
	if( !res || !res.data || !res.data.attributes.images || !res.data.attributes.images.table) {
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
	var hash = file[0]
	var fpath = "/gallery/"+file[1]
	var size = file[2]
	var date  = file[3]
	var event  = file[4]
	var desc = file[5]  
	var location= file[6]
	var cc		= file[7]
	var people		= file[8]
	var rating   = file[9]
	//var att   = file[9]
	var thumb64 = file[11]
	var hover = "Hash: "+file[0]+"\nFile: "+file[1]+"\nNotes: "+desc+"\nLocation: "+location+"\nCountry: "+cc
	//console.log("BEFORE APPEND ELEMENT",json)

	var htmlString1 = '<a id="cell'+index.toString()+'"  style="padding:2px">\
								<img id="img'+index.toString()+'" src="data:image/jpg;base64,'+ "thumb64" +'" \
								onload=adjust(this) onclick="clickPic('+index.toString()+')"  \
								data-toggle="tooltip" data-placement="top" title="'+hover+'"></a>'

	var htmlString2 = '<div class=row>\
							<div class=col-lg-6>\
								<a id="cell'+index.toString()+'"> \
								<img id="img'+index.toString()+'" src="data:image/jpg;base64,'+ "thumb64" +'" \
								</a>\
							</div>\
							<div class=col-lg-6>\
								<table>\
									<tr><td><label>Hash</label></td><td><input id="hash'+index.toString()+' type="text" value="'+hash+'" class="form-control" (placeholder="File path" size="30")"></td></tr>\
									<tr><td><label>Filename</label></td><td><input id="fpath'+index.toString()+' type="text" value="'+fpath+'" class="form-control" (placeholder="File path" size="30")"></td></tr>\
									<tr><td><label>Size</label></td><td><input id="size'+index.toString()+' type="text" value="'+size+'" class="form-control" (placeholder="File path" size="30")"></td></tr>\
									<tr><td><label>Date</label></td><td><input id="date'+index.toString()+' type="text" value="'+date+'" class="form-control" (placeholder="File path" size="30")"></td></tr>\
									<tr><td><label>Event</label></td><td><input id="event'+index.toString()+' type="text" value="'+event+'" class="form-control" (placeholder="File path" size="30")"></td></tr>\
									<tr><td><label>Description</label></td><td><input id="desc'+index.toString()+' type="text" value="'+desc+'" class="form-control" (placeholder="File path" size="30")"></td></tr>\
									<tr><td><label>Location</label></td><td><input id="location'+index.toString()+' type="text" value="'+location+'" class="form-control" (placeholder="File path" size="30")"></td></tr>\
									<tr><td><label>Counrty</label></td><td><input id="cc'+index.toString()+' type="text" value="'+cc+'" class="form-control" (placeholder="File path" size="30")"></td></tr>\
									<tr><td><label>People</label></td><td><input id="people'+index.toString()+' type="text" value="'+people+'" class="form-control" (placeholder="File path" size="30")"></td></tr>\
									<tr><td><label>Rating</label></td><td><input id="rating'+index.toString()+' type="text" value="'+rating+'" class="form-control" (placeholder="File path" size="30")"></td></tr>\
								</table>\
							</div>\
						</div>\
						'
	var htmlString3 = '<div class="responsive">\
						<div class="gallery">\
						<a id="cell'+index.toString()+'">\
							<img id="img'+index.toString()+'" src="data:image/jpg;base64,'+ "thumb64" +'" \
						</a>\
						</div>\
						</div>'
	var t = $("#main-mode").prop('checked')
	if(  $("#main-mode").prop('checked')  ){
		$('#'+elemID).append(htmlString2) 
	}
	else{
		$('#'+elemID).append(htmlString1) 
	}
	//class="img-responsive"

	galleryFiles.push(fpath);
	//console.log("SUCCESS",index,json.filearray.length)
	json.index++
	resolve(json)
	}catch(e){console.log(e);reject(e)}})}
	

async function addElements(json){try{
	jcopy = JSON.parse(JSON.stringify(json))
	console.log("Number of Pictures Retrieved:",jcopy.filearray.length)
	// Add pictures
	for(let x = 0 ; x < jcopy.filearray.length; x++){
		json.index = x;
		await addElement(json)
	}
	// Add Thumbs
	for(let index = 0 ; index < jcopy.filearray.length; index++){
		var file = json.filearray[index];
		var thumb64 = file[11]
		$("#img"+index.toString()).attr('src', 'data:image/png;base64,'+thumb64)
		await new Promise((res,rej)=>{  setTimeout(()=>{res(true)},10)  })  // Slow down thumb generation
	}
	return true;
	}catch(e){console.log(e);reject(e)}}
	
function elemClear(elemId){
	var myNode = document.getElementById(elemId);
	while (myNode.firstChild) {
		myNode.removeChild(myNode.firstChild);
		}
	}
	
function adjust(img){
	var MAX_WIDTH = 320;
	var MAX_HEIGHT = 240;
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

