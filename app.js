/**
 *
 * Created by huangpengcheng on 2016/6/22 0022.
 */

var hoxy = require('hoxy');
var port = 8888;
var proxy = hoxy.createServer({
    reverse: 'http://192.168.145.128:5601',
});

var _MS_PER_DAY = 1000 * 60 * 60 * 24;
// a and b are javascript Date objects
function dateDiffInDays(a, b) {
    // Discard the time and time-zone information.
    var utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    var utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

proxy.intercept({
    phase: 'request',
    method: 'POST',
    as: 'string',
}, function (req, resp, cycle) {
    var requrl = req.url,
        requser = req.headers['remote_user'],
        indexname;

    if (requrl.indexOf('_msearch') != -1) {
        reqparams = req.string.split('\n');
        indexname = JSON.parse(reqparams[0])['index'];
        post_time = JSON.parse(reqparams[1])['query']['filtered']['filter']['bool']['must'][0]['range']['post_date'];
        starttime =  post_time.gte;
        endtime =  post_time.lte;
        console.log('request made to: ' + requrl);
        console.log("Request String is : " + req.string);
        console.log("Start Time :" + new Date(starttime) + ',' + starttime);
        console.log("End Time :" + new Date(endtime)+','+endtime);
        console.log("Time Diff in days:" + Math.floor((endtime-starttime)/_MS_PER_DAY));
        if(Math.floor((endtime-starttime)/_MS_PER_DAY)>7){
            console.log("Search Range is greater than 7 days, Change its start:" + (starttime+8*_MS_PER_DAY).toString());
            req.string = req.string.replace(starttime.toString(),(starttime+8*_MS_PER_DAY).toString());
            console.log("Request String has been modified: " + req.string);
        }
        if (indexname instanceof  Array) {
            indexname = indexname[0]
        }
         console.log('index name is :' + indexname);
         console.log('request users:' + requser);
        if (indexname.indexOf(requser) == -1){
            req.string = req.string.replace(indexname,'null');
            console.log(indexname+ ' has been changed to null');
        }
    }
});

proxy.listen(port, function () {
    console.log('The proxy is listening on port ' + port + '.');
});
