"# kibana-multitenant-proxy"


该Proxy实现Kibana4.x/5.x 访问Elasticsearch时数据的多租户数据访问隔离（一个用户只能看到限定的index）、字段脱敏、单Index查询范围限制等功能。欢迎试用和pr，提出宝贵意见和Star~

离线包还未上传，请稍候，  着急用的可以先在线安装后自己打包放到无法连接互联网的环境中即可~

A proxy behind nginx while before kibana to provide data isolation for different users


##Why Nodejs?
因为Kibana发行版自带了一个node，为了部署简便并且鉴于Kibana实际访问不会有太大的并发量，因此选择NodeJS，并非对此语言熟悉。

##架构图
![](https://raw.githubusercontent.com/gnuhpc/kibana-multitenant-proxy/master/docs/arch.jpg)

* 如图所示，通过将Kibana的配置文件kibana.yml配置为server.host: "localhost" ，可以屏蔽本地地址之外的IP对Kibana的5601端口进行访问，从而保证本地地址之外的IP只能通过9999和对Kibana进行访问，而通过代理的访问将是可控的，并且有相应访问日志可供查询。
* 代理借助Nginx的Basic Auth实现了用户的认证。
* 客户端浏览器通过9999端口访问Kibana时，首先需要进行用户认证，Nginx验证通过后，Kibana Proxy对请求中的用户名和访问的Index进行校验，只有符合权限的请求才会被放行，实现了不同用户组的数据隔离。用户名和所能访问的index前缀，例如配置了logstash-cbank权限后，该用户将可以访问所有以logstash-cbank开头的index，如logstash-cbank-2016.08.26等。

##安装准备
* 安装nodejs（安装完Kibana即可）
* 离线安装包kibana_proxy.tar.gz
* 若无离线安装包亦可连接至公网通过npm进行在线下载


##安装步骤
* 离线模式：解压kibana_proxy.tar.gz
 *  `tar -zxvf kibana_proxy.tar.gz`
* 在线模式：通过npm安装
 * `npm install kibana_proxy`
* 添加环境变量：将nodejs路径添加到PATH中
 * `export PATH=/logger/kibana-4.5.1-linux-x64/node/bin:$PATH`
* 运行
 * 进入工程目录 `cd kibana_proxy`
 * 启动 `nohup node app.js &`
 * 显示 `The proxy is listening on port xxxx` 说明启动成功

##代理配置
* kibana_proxy配置采用json格式，相关信息配置在config.json文件中
  *  `"port": "8888",` 代理监听端口
  * `"refreshPort": "8889",` 配置以及用户信息刷新监听端口
  * `"kibanaServer": "http://127.0.0.1:5601",`后端指向kibana地址以及端口
  * `"es_Server":"http://127.0.0.1:9201/",` ElacticSaearch地址以及端口
  * `"es_UserInfoUrl":"http://127.0.0.1:9201/.cmbc/user_info/",` 存放用户权限的地址
  * `"chkTimeRange":"false",` 配置是否开启查询时间跨度检查
  * `"totalNum":40000,` 当开启时间跨度检查时，单次查询最大支持的数据记录数
  * `"dataMask":"true",` 配置是否开启数据脱敏
  * 数据脱敏配置dataMaskConfig支持多个index前缀以及多个字段，并且支持正则表达式匹配，如下所示，将index前缀为logstash-sfshm的index中message字段里所有的2016替换为xxxx，@version字段中所有的1替换为x
  * `{"indexPrefix":"logstash-sfshm","maskFields":[{"maskField":"message","maskReg":"/2016/g","maskValue":"xxxx"},{"maskField":"@version","maskReg":"/1/g","maskValue":"x"}]},`

##使用注意事项
* Nginx相关配置
  * 本代理借助Nginx的Basic Auth实现了用户的认证，需要使用htpassword在Nginx服务器端生成用户密码文件，可使用附带shell脚本进行快速配置，可使用三个参数： sh add_user_inES.sh 用户名 密码 可访问的index前缀 （如果用户名为root，则可以访问所有index） 
  * 本代理在架构层面位于Nginx和Kibana之间，需要在Nginx中配置相应的端口映射，将用户访问的Nginx端口映射至proxy监听端口
* Kibana相关配置
  * 通过将Kibana的配置文件kibana.yml配置为server.host: "localhost" ，可以屏蔽本地地址之外的IP对Kibana的5601端口访问，从而保证本地地址之外的IP只能通过Nginx和代理对Kibana进行访问，而通过代理的访问将是可控的，并且Nginx有相应访问日志可供查询
* Proxy相关配置信息刷新
  * 代理启动时会对用户权限和相关配置信息进行同步，如果在运行状态，需要刷新相关信息，可访问代理的8889端口（可以进行配置）进行刷新
