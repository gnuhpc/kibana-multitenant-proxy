/**
 *
 * Created by huangpengcheng on 2016/6/22 0022.
 * 
 * ChangeLog:
 * Add search range limit feature
 * Add Config file 
 * 
 * TODO: 
 * Bring the authorization process before the range limitation.
 */
var config = require("./config.json");
var hoxy = require('hoxy');
var port = config.port;
var kibanaServer = config.kibanaServer;
var proxy = hoxy.createServer({
    reverse: kibanaServer,
});
var totalNum = config.totalNum;
var es_Server = config.es_Server;
var es_UserInfoUrl = config.es_UserInfoUrl;

var arrUser = [];
var arrIndexName = [];
var refreshFlag;
var refreshDate;
var maxDays;

var _MS_PER_DAY = 1000 * 60 * 60 * 24;
// a and b are javascript Date objects
function dateDiffInDays(a, b) {
    // Discard the time and time-zone information.
    var utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    var utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}


function syncGetMaxDay(indexName) {
    //get how long time of index a can be used in query with sync way
    var request = require("sync-request");
    var strurl = es_Server + indexName + '/_count';
    var res = request('GET', strurl);
    var strResData;
    var cntOfIndex;
    var totalNum = 40;
    strResData = res.getBody().toString();
    console.log('get maxDay start');
    cntOfIndex = parseInt(JSON.parse(strResData)['count']);

    var strurl = es_Server + indexName + '/_search';

    var res = request('POST', strurl, {json: {'aggs': {'start': {'min': {'field': 'post_date'}}}}});
    strResData = res.getBody().toString();
    var strStartTime = JSON.parse(strResData)['aggregations']['start']['value_as_string'];
    var startTime = new Date(Date.parse(strStartTime.substr(0, 10)));
    console.log('startTime is ' + startTime);

    var res = request('POST', strurl, {json: {'aggs': {'end': {'max': {'field': 'post_date'}}}}});
    strResData = res.getBody().toString();
    var strEndTime = JSON.parse(strResData)['aggregations']['end']['value_as_string'];
    var endTime = new Date(Date.parse(strEndTime.substr(0, 10)));
    console.log('endTime is ' + endTime);

    var totalDay = dateDiffInDays(startTime, endTime);
    console.log("totalDay is " + totalDay);

    maxDays = Math.floor(totalNum * totalDay / cntOfIndex);
    console.log('max day of ' + indexName + ' is ' + maxDays);

}


function checkUserInfo(user, indexName) {
    // check if user a can get index b.
    console.log('check userinfo');
    for (i = 0; i < arrUser.length; i++) {

        if (arrUser[i] == user && indexName.indexOf(arrIndexName[i]) == 0) {
            return true;
        }
        if (arrUser[i] == user && arrIndexName[i] == 'root') {
            return true;
        }

    }
    return false;
}

function ifGetUserInfo() {
    // check need to get userinfo or not     
    var myDate = new Date();
    var curDate = myDate.getDate();

    if (typeof refreshFlag == 'undefined') {
        refreshFlag = true;
        refreshDate = curDate;
        console.log('fisrt time to run on ' + refreshDate);
    }
    if (refreshDate != curDate) {
        refreshFlag = true;
        refreshDate = curDate;
        console.log('change day to  ' + refreshDate);
    }
    if (refreshFlag == true) {
        syncGetUserInfo();
        refreshFlag = false;
        console.log('need to getUserInfo ');
    }
}

function syncGetUserInfo() {
    // get index which user can get
    var request = require("sync-request");
    var strurl = es_UserInfoUrl + '_search?q=user:*';
    console.log('get userinfo of all');
    var res = request('GET', strurl);
    var strResData;
    strResData = res.getBody().toString();

    var i;

    console.log('get userinfo start one by one');
    for (i = 0; i < JSON.parse(strResData)['hits']['hits'].length; i++) {
        arrUser.push(JSON.parse(strResData)['hits']['hits'][i]['_source']['user']);
        arrIndexName.push(JSON.parse(strResData)['hits']['hits'][i]['_source']['indexname']);

    }
    console.log('get userinfo end');


}


proxy.intercept({
    phase: 'request',
    method: 'POST',
    as: 'string',
}, function (req, resp, cycle) {
    var requrl = req.url,
        requser = req.headers['remote_user'],
        indexname;

    ifGetUserInfo();

    if (requrl.indexOf('_msearch') != -1) {
        reqparams = req.string.split('\n');

        console.log('main request start');

        indexname = JSON.parse(reqparams[0])['index'];


        post_time = JSON.parse(reqparams[1])['query']['filtered']['filter']['bool']['must'][0]['range']['post_date'];
        starttime = post_time.gte;
        endtime = post_time.lte;
        console.log('request made to: ' + requrl);
        console.log("Request String is : " + req.string);
        console.log("Start Time :" + new Date(starttime) + ',' + starttime);
        console.log("End Time :" + new Date(endtime) + ',' + endtime);
        console.log("Time Diff in days:" + Math.floor((endtime - starttime) / _MS_PER_DAY));

        if (indexname instanceof Array) {
            indexname = indexname[0]
        }
        console.log('index name is :' + indexname);
        console.log('request users:' + requser);

        syncGetMaxDay(indexname);
        console.log('max is ' + maxDays);
        if (Math.floor((endtime - starttime) / _MS_PER_DAY) > maxDays) {
            console.log("Search Range is too long, Change its start:" + (endtime - maxDays * _MS_PER_DAY).toString());
            req.string = req.string.replace(starttime.toString(), (endtime - maxDays * _MS_PER_DAY).toString());
            console.log("Request String has been modified: " + req.string);
        }
        if (checkUserInfo(requser, indexname) == false) {
            req.string = req.string.replace(indexname, 'null');
            console.log(indexname + ' has been changed to null');
        }
        console.log('main request end');
    }
});

proxy.listen(port, function () {
    console.log('The proxy is listening on port ' + port + '.');
});
