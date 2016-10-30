if [[ $# != 3 ]]; then
    echo "Para Num Error"
    echo "Right Way£add_user_inES.sh  username password indexprefix"
    echo ""
    echo ""
    echo "e.g. sh add_user_inES.sh xbank xbank123 logstash-xbank"
    exit 1
fi
 
htpasswd2 -b /logger/nginx/conf/.kibanahtpasswd $1 $2
pscp -r -v -l logger -t 0 -h ~/client_server /logger/nginx/conf/ /logger/nginx/.
 
str1='curl -XPUT '
str2=\'"http://localhost:9201/.cmbc/user_info/$1_$3"\'
str3=' -d '
str4=\'"{ \"user\" : \"$1\", \"indexname\" : \"$3\"}"\'
 
str=$str1$str2$str3$str4
echo $str
eval $str