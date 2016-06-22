/**
 *
 * Created by huangpengcheng on 2016/6/22 0022.
 */

var hoxy = require('hoxy');
var port = 8888;
var proxy = hoxy.createServer({
    reverse: 'http://192.168.145.128:5601',
});

proxy.intercept({
    phase: 'request',
    method: 'POST',
    as: 'string',
}, function (req, resp, cycle) {
    var requrl = req.url,
        requser = req.headers['remote_user'],
        indexname;

    if (requrl.indexOf('_msearch') != -1) {
        console.log('request made to: ' + requrl);
        console.log('request header:' + requser);
        indexname = JSON.parse(req.string.split('\n')[0]).index[0];
        console.log('indexname name:' + indexname);
        if (indexname.indexOf(requser) == -1){
            req.string = req.string.replace(indexname,'null');
            console.log(indexname+ ' has been changed to null');
        }
    }
});

proxy.listen(port, function () {
    console.log('The proxy is listening on port ' + port + '.');
});
