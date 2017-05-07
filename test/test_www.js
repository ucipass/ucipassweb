var path = require("path")
var request = require("supertest")
var app = require(path.join(__dirname,"..","app.js"))
var agent = request.agent("http://localhost:3000")

describe('Web Server Test', function(){
    it("Login Authentication as admin", function(done){
        agent
        .post('/login')
        .send({
            username: 'admin',
            password: 'admin'
        })
        .expect(302)
        .end(function(err, res) {
            if (err) {
                throw err;
            }
            done()
        })
    })
    it("Logged-in as admin", function(done){
        agent
        //.get('/')
        //.expect(302)
        .get('/')
        .expect(200)
        .end(function(err, res) {
            if (err) {
                throw err;
            }
            done()
        })
    })
})