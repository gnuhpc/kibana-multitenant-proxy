var stream = require('stream');
var http = require('http');
var connect = require('connect');
var httpProxy= require('http-proxy');
var elasticsearch = require('elasticsearch');

var proxy = httpProxy.createProxyServer({
    target: {
        host: '192.168.145.128',
        port: 5601 
    }
});
var esclient = new elasticsearch.Client({
    host: 'localhost:9200',
    log: 'trace'
});

var app = connect()
    .use(function (req, res, next) {
        var bodyBuffer = '';
        var indexname,username;
        var requrl = req.url;

        req.on('data', function (data) {
            bodyBuffer += data;
        });
        req.on('end', function () {
            if (requrl.indexOf('_msearch') != -1) {
                username = req.headers.remote_user;
                indexname = JSON.parse(bodyBuffer.split('\n')[0]).index[0];
                
                console.log(requrl);
                console.log(username);
                console.log(indexname);
                
                if (indexname.indexOf(username) == -1){
                    bodyBuffer = bodyBuffer.replace(indexname,'null');
                }
                console.log(bodyBuffer);
            }
            req.body = bodyBuffer;

            var bufferStream = new stream.PassThrough();
            bufferStream.end(new Buffer(bodyBuffer));
            req.bodyStream = bufferStream;
            next();
        });
    })
    .use(function (req, res) {
        proxy.web(req, res, {buffer: req.bodyStream});
    });

http.createServer(app).listen(8888);

