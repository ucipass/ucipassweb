var filearray = [] // result table from server
var galleryFiles = [] // array of URLs with full resolution pictures
var totalFiles = 0; // Number of files matching the search
var thumb64 = null;
class Image{
	constructor(){
	}
}
class Gallery{
	constructor(elemID){
		this.elemID = elemID;
		this.imageArray = [];
		this.columns = [];
		this.selected = new Set([])
		this.totalCount = 0	// total images for the filter are not the same as the size of the array as we're only getting a subset of the query
		this.filter = {
			limit : 25, //parseInt($('#filter-limit').val())
			offset : 0,
			hash : null,
			fpath : null,
			size : null,
			frdate : null,
			todate : null,
			event : null,
			desc : null,
			location : null,
			cc : null,
			people : null,
			rating : null,	
		}

	}
	elementSetup(){
		var _this = this;
		var people = [	{ id: "None", text: "None" }, 
						{ id: "Ottone", text: "Ottone" },
						{ id: "Istvanne", text: "Istvanne" }, 
						{ id: "Gabor", text: "Gabor" }, 
						{ id: "Iren", text: "Iren" }, 
						{ id: "Andras", text: "Andras" },
						{ id: "Eva", text: "Eva" }, 
						{ id: "Adam", text: "Adam" },
						{ id: "Alexandra", text: "Alexandra" }];
		
		// Setup Pager to show 0 of 0
		$("#pages").select2({
			data: [{id:0, text:  "0-0 of 0" }]
		});
		// Setup Toggles
		if(username != 'admin'){ // only make edit visible if username is admin
			$('#toggle-group').toggle()
		}
		// Setup Static Select Elements
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
		this.getSelectors()
		// Setup Datepickers
		$('#filter-frdate').datepicker({format: 'yyyy-mm-dd',todayHighlight: true,autoclose: true});
		$('#filter-todate').datepicker({format: 'yyyy-mm-dd',todayHighlight: true,autoclose: true});
		$('#edit-date').datepicker({format: 'yyyy-mm-dd',todayHighlight: true,autoclose: true});
		// Setup Events
		$("#filter").click(function(e){ e.preventDefault(); $('#modal-filter').modal("toggle")	});
		//$("#selectall").click(function(e) {  if($('#selectall').is(':checked')) {$('.cell').addClass('pic-select');} else{$('.cell').removeClass('pic-select');}   } );
		$("#filter-search").click(function(e){ e.preventDefault(); _this.refresh(); $('#modal-filter').modal("toggle")	});
		$("#edit").click(function(e){ e.preventDefault(); _this.edit(); $('#modal-edit').modal("toggle");} );
		$("#toggle-edit").change(function() { _this.changeElements(); })
		$("#edit-save").click(function(e){ e.preventDefault(); _this.save();} );
		$("#edit-SelectAll").click(function(e){
			e.preventDefault(); 
			_this.imageArray.forEach((item,index)=>{
				$('#div'+index.toString()).addClass('pic-select');
				_this.selected.add(index)
			})
			_this.edit()
		});
		$("#edit-ClearAll").click(function(e){
			e.preventDefault(); 
			_this.imageArray.forEach((item,index)=>{
				$('#div'+index.toString()).removeClass('pic-select');
				_this.selected.add(index)
			})
			$('#modal-edit').modal("toggle");
		});
		// CTRL and SHIFT event checking
		$(document.body).keydown(function (evt) {
			if (evt.keyCode == 16 && ! $('#'+_this.elemID).hasClass("shift_down") ) {
				$('#'+_this.elemID).addClass("shift_down")
				console.log("SHIFT DOWN")
			}
			if (evt.keyCode == 17 && ! $('#'+_this.elemID).hasClass("ctrl_down") ) {
				$('#'+_this.elemID).addClass("ctrl_down")
				console.log("CTRL DOWN")
			}
		});
		$(document.body).keyup(function (evt) {
			if (evt.keyCode == 16 &&  $('#'+_this.elemID).hasClass("shift_down") ) {
				$('#'+_this.elemID).removeClass("shift_down")
				console.log("SHIFT UP")
			}
			if (evt.keyCode == 17 &&  $('#'+_this.elemID).hasClass("ctrl_down") ) {
				$('#'+_this.elemID).removeClass("ctrl_down")
				console.log("CTRL UP")
			}
		});
	}
	elemClear(elemId){
		var myNode = document.getElementById(elemId);
		while (myNode.firstChild) {
			myNode.removeChild(myNode.firstChild);
			}
	}
	async refresh(){		
		this.elemClear(gallery.elemID)
		this.selected = new Set([])
		$('#links').append('<h1>Waiting for server...</h1>')
		await this.getImages()
		await this.changeElements()
		return true;
	}
	async getSelectors(){try{
		let ioData = new JSONData(username,"gallery",{cmd:"getselect2"})
		let res = await ioData.post()
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

		}catch(e){console.log(e);}
		return true
	}
	async getImages(){
		this.filter.limit = $('#filter-limit').val() ? $('#filter-limit').val() : 25
		this.filter.offset = this.filter.offset ? this.filter.offset : 0
		this.filter.hash = $('#filter-hash').val()
		this.filter.fpath = $('#filter-fpath').val()
		this.filter.size = $('#filter-fsize').val()
		this.filter.frdate = $('#filter-frdate').val()
		this.filter.todate = $('#filter-todate').val()
		this.filter.event = $('#filter-event').val()
		this.filter.desc = $('#filter-desc').val()
		this.filter.location = $('#filter-location').val()
		this.filter.cc = $('#filter-cc').val()
		this.filter.people = $('#filter-people').val()
		this.filter.rating = $('#filter-rating').val()

		var jsondata = { cmd:"imagesSelect", filter:this.filter}
		var ioData = new JSONData(username,"gallery",jsondata)
		console.log("SEND:",ioData.att().cmd,ioData.att());
		var result = await ioData.post().catch( (err)=>{console.log("FAILED POST:",e)} )
		if( !result || !result.data || !result.data.attributes.images || !result.data.attributes.images.table) {
			elemClear("links");
			this.imageArray = []
			console.log("RECEIVE No images received!",result);
			return ;
		}
		this.columns = result.data.attributes.images.columns
		this.imageArray = result.data.attributes.images.table.map((image)=>{
			let jimage = {}
			this.columns.forEach((col,index)=>{
				jimage[col] = image[index]
			})
			return jimage
		})
		this.totalCount = result.data.attributes.images.totalCount
		console.log("RECEIVE: ",this.imageArray)
		return;
	}
	async changeElements(){
		console.log("Number of Pictures Retrieved:",this.imageArray.length)
		this.pager()
		gallery.elemClear(gallery.elemID)
		// Add pictures
		for(let index = 0 ; index < this.imageArray.length; index++){
			var htmlString1 = '<div class="responsive">\
					<div class="gallery" id="div'+index.toString()+'">\
					<a id="cell'+index.toString()+'" >\
						<img id="img'+index.toString()+'" onclick="gallery.clickPic('+index.toString()+')" src="data:image/jpg;base64,'+ "thumb64" +'"> \
					</a>\
					</div>\
					</div>'

			var htmlString2 = '\
				<div class="responsive-edit">\
					<table>\
						<tr><td><label>Hash</label></td><td><input id="hash'+index.toString()+' type="text" value="'+this.imageArray[index].hash+'" class="form-control" (placeholder="File path" size="30")"></td></tr>\
						<tr><td><label>Filename</label></td><td><input id="fpath'+index.toString()+' type="text" value="'+this.imageArray[index].fpath+'" class="form-control" (placeholder="File path" size="30")"></td></tr>\
						<tr><td><label>Size</label></td><td><input id="size'+index.toString()+' type="text" value="'+this.imageArray[index].size+'" class="form-control" (placeholder="File path" size="30")"></td></tr>\
						<tr><td><label>Date</label></td><td><input id="idate'+index.toString()+' type="text" value="'+this.imageArray[index].idate+'" class="form-control" (placeholder="File path" size="30")"></td></tr>\
						<tr><td><label>Event</label></td><td><input id="event'+index.toString()+' type="text" value="'+this.imageArray[index].event+'" class="form-control" (placeholder="File path" size="30")"></td></tr>\
						<tr><td><label>Description</label></td><td><input id="desc'+index.toString()+' type="text" value="'+this.imageArray[index].desc+'" class="form-control" (placeholder="File path" size="30")"></td></tr>\
						<tr><td><label>Location</label></td><td><input id="location'+index.toString()+' type="text" value="'+this.imageArray[index].location+'" class="form-control" (placeholder="File path" size="30")"></td></tr>\
						<tr><td><label>Counrty</label></td><td><input id="cc'+index.toString()+' type="text" value="'+this.imageArray[index].cc+'" class="form-control" (placeholder="File path" size="30")"></td></tr>\
						<tr><td><label>People</label></td><td><input id="people'+index.toString()+' type="text" value="'+this.imageArray[index].people+'" class="form-control" (placeholder="File path" size="30")"></td></tr>\
						<tr><td><label>Rating</label></td><td><input id="rating'+index.toString()+' type="text" value="'+this.imageArray[index].rating+'" class="form-control" (placeholder="File path" size="30")"></td></tr>\
					</table>\
				</div>\
				<div class="responsive-edit">\
				<div class="gallery-edit" id="div'+index.toString()+'">\
					<a id="cell'+index.toString()+'" > \
					<img id="img'+index.toString()+'" onclick="gallery.clickPic('+index.toString()+')" src="data:image/jpg;base64,'+ "thumb64" +'" \
					</a>\
				</div>\
				</div>\
				'
				if(  $("#toggle-edit").prop('checked') ){
					$('#'+this.elemID).append(htmlString2)
				}
				else{
					$('#'+this.elemID).append(htmlString1) 
				}
		}
		// Restore Previous Selection
		this.selected.forEach((item,index)=>{
			$('#div'+index.toString()).toggleClass('pic-select');
		})
		// Add Thumbs
		for(let index = 0 ; index < this.imageArray.length; index++){
			//var file = json.filearray[index];
			//var thumb64 = file[11]
			$("#img"+index.toString()).attr('src', 'data:image/png;base64,'+this.imageArray[index].thumb)
			await new Promise((res,rej)=>{  setTimeout(()=>{res(true)},10)  })  // Slow down thumb generation
		}
		// Go to last selected item
		var lastSelected = this.selected.size ? [...this.selected].pop() : 0
		$('html,body').animate({ scrollTop: $("#div" + lastSelected.toString() ).offset().top}, 'fast')


		return true;		
	}
	edit(index){
		if( gallery.selected.size > 0){
			var filenames = ""
			for(let index of this.selected){
				filenames += this.imageArray[index].fpath + "\n"
				}
			$('#edit-totalfiles').val("Total Files Selected: "+this.selected.size)
			$('#edit-filenames').val(filenames)
		}
		else{
			$('#edit-totalfiles').val("No Files Were Selected!")
			$('#edit-filenames').val("No Files Were Selected!")
		}
	}
	save(){
		var _this = this
		var changes = {} ;
		var peopleadd = null;
		var peopledel = null;
		//if($('#edit-chk-date').is(':checked'))		{ json.date = $('#edit-date').val() ; columns.push("date")}
		if($('#edit-chk-event').is(':checked'))		{ changes.event = $('#edit-event').val() }
		if($('#edit-chk-desc').is(':checked'))		{ changes.desc = $('#edit-desc').val() }
		if($('#edit-chk-location').is(':checked'))	{ changes.location = $('#edit-location').val() }
		if($('#edit-chk-cc').is(':checked'))		{ changes.cc = $('#edit-cc').val() }
		if($('#edit-chk-people').is(':checked'))	{ changes.people =  $('#edit-people').val()  }
		if($('#edit-chk-people-del').is(':checked'))	{ peopledel = 1;}
		if($('#edit-chk-people-add').is(':checked'))	{ peopleadd = 1;}
		if($('#edit-chk-rating').is(':checked'))	{ changes.rating = $('#edit-rating').val() }
		if( this.selected.size == 0 || Object.keys(changes).length == 0 ) {
			console.log("Nothing to Save!");
			return; 
		}

		var newRows = []
		for(let index of this.selected){
			let file = this.imageArray[index]
			let newRow = JSON.parse(JSON.stringify(changes))
			newRow.hash = file.hash
			if (newRow.people){
				let existingPeople = null
				if(peopleadd){
					existingPeople = new Set(file.people.split(";").filter((item)=> item.length))
					newRow.people.forEach((people)=>{existingPeople.add(people)})
				}else if(peopledel){
					existingPeople = new Set(file.people.split(";").filter((item)=> item.length)) 
					newRow.people.forEach((people)=>{existingPeople.delete(people)})
				}else{ 
					existingPeople = new Set(changes.people)
				}
				newRow.people = existingPeople.size ? Array.from(existingPeople).join(";") : null
			}
			newRows.push(newRow)
		}
		console.log(newRows)	

		var ioData = new JSONData(username,"gallery",{cmd:"imagesUpdate", newRows:newRows})
		ioData.log("SEND");
		$('#modal-edit').modal("toggle")
		ioData.post(function(res){
			console.log("RESULT:",res.data.attributes);
			_this.refresh()
			// when save successfull for safety uncheck all checkboxes to prevent saving stuff again
			$( "#modal-edit [type=checkbox]" ).prop('checked', false)

			})
	}
	clickPic(index){ // This runs when a picture is clicked on

		if( $('#'+this.elemID).hasClass("ctrl_down")  ) {
			$('#div'+index.toString()).toggleClass('pic-select');
			if(this.selected.has(index)){
				this.selected.delete(index)
			}
			else{
				this.selected.add(index)
			}
		}
		else if( $('#'+this.elemID).hasClass("shift_down")  ) {
			if( this.selected.has(index)){
				this.selected.delete(index)
				while (index && index-1 >= 0 && $('#div'+(index-1).toString()).hasClass('pic-select') ) {
					index--
					this.selected.delete(index)
				}
				this.imageArray.forEach((image,index)=>{ 
					if( this.selected.has(index) ) {
						$('#div'+index.toString()).addClass('pic-select')
					}
					else{
						$('#div'+index.toString()).removeClass('pic-select')
					}
				})
			}
			else{
				this.selected.add(index)
				while (index && index-1 && !$('#div'+(index-1).toString()).hasClass('pic-select') ) {
					index--
					this.selected.add(index)
				}
				this.imageArray.forEach((image,index)=>{ 
					if( this.selected.has(index) ) {
						$('#div'+index.toString()).addClass('pic-select')
					}
					else{
						$('#div'+index.toString()).removeClass('pic-select')
					}
				})
			}
		}
		else{
			var array = this.imageArray.map((item)=>{return "gallery/"+item.fpath})
			blueimp.Gallery(array, {index: index}) ;
		}

	}
	pager(){
		//Turn off Event handlers before changes and delete content of selector
		$('#pages').off()
		$('#next').off()
		$('#prev').off()
		var _this = this;
		this.elemClear("pages");
		var offset = this.filter.offset ? this.filter.offset : 0
		var imagePerPage = this.filter.limit
		var totalFiles = this.totalCount
		imagePerPage = imagePerPage ? imagePerPage : 50
		var pages = Math.ceil( totalFiles  / imagePerPage);
		pages = pages ? pages : 1
		var selectData = []
		//Create Selector Index
		for (let i=0; i < pages ; i++){
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
			let pageindex = $(this).prop('selectedIndex')
			_this.filter.offset = pageindex * _this.filter.limit;
			console.log("PAGE",pageindex,"OFFSET", _this.filter.offset);
			_this.refresh();
			})
		$("#next").click(function(e){
			e.preventDefault();
			let imagePerPage = _this.filter.limit
			let totalCount = _this.totalCount
			var index = parseInt($("#pages").val())
			var maxindex =  Math.ceil( totalCount / imagePerPage ) -1
			if( maxindex >= index+1) {
				index++
				$("#pages").select2("val",index.toString())
			}

		});
		$("#prev").click(function(e){
			e.preventDefault();
			let imagePerPage = _this.filter.limit
			let totalCount = _this.totalCount
			var index = parseInt($("#pages").val())
			if(index > 0) {
				index--
				$("#pages").select2("val",index.toString())
			}
		});
	}

}
var gallery = new Gallery("links")
$(document).ready( function(){
	gallery.elementSetup();
	gallery.refresh()
})



/*	
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


















*/