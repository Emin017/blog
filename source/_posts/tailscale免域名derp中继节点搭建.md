---
title: 免域名 Tailscale DERP 中继节点搭建
permalink: /tool/tailscale/derp/
categories:
  - Tools
tags:
  - Tools
abbrlink: 30459
date: 2024-07-25 11:04:01
---

简单记录一下使用阿里云服务器搭建 Tailscale 免域名 DERP 中继节点的过程

<!--more-->
# 免域名 Tailscale DERP 中继节点搭建
因为局域网内的设备无法直接访问到公网，所以需要一些代理服务工具来完成设备间的互联。Tailscale 是一款基于 WireGuard 的异地组网工具，它可以将不同网络环境的设备组成一个虚拟局域网，使其可以互相访问。

Tailscale 官方提供了一些中继节点，但是这些节点大多位于国外，延迟不是很理想，我使用 `tailscale netcheck` 命令进行 derp 的延迟检查，结果如下：

![官方 DERP 服务器延迟](https://emin-blog.oss-cn-shanghai.aliyuncs.com/img/tailscala-derp-offical-latency.jpeg)

可以看到，官方提供的这些 derp 服务器延迟都比较大，而我使用刚好有一台阿里云国内服务器，所以便想用这台服务器搭建一台中继节点。

## 安装 Go
安装下载依赖：
```shell
apt install -y wget git openssl curl
```
然后去 Go 语言的 [官网](https://go.dev/dl/) 下载对应版本即可

{% note warning %}
尽量选择最新的 Go 版本， 否则可能会导致无法编译后续的 tailscale derper 模块
{% endnote %}

## 安装 Tailscale derper
拉取 derper 工程：
```shell
go install tailscale.com/cmd/derper@main
```

### 修改证书并编译 DERP
证书一般位于 `/root/go/pkg/mod/tailscale.com@v1.61.0.xxxxxxxxx` (具体版本视实际情况) 的 cmd/derper 目录下：
```shell
ls /root/go/pkg/mod/tailscale.com@v1.61.0-pre.0.20240310014715-ad33e4727050/cmd/derper/
bootstrap_dns.go  bootstrap_dns_test.go  cert.go  depaware.txt  derper.go  derper_test.go  mesh.go  websocket.go
```
打开 cert.go 文件，注释掉下面几行：
```go
// 在第 91 至 92 行
func (m *manualCertManager) getCertificate(hi *tls.ClientHelloInfo) (*tls.Certificate, error) {
        // if hi.ServerName != m.hostname {
                // return nil, fmt.Errorf("cert mismatch with hostname: %q", hi.ServerName)
        // }

        // Return a shallow copy of the cert so the caller can append to its
        // Certificate field.
        certCopy := new(tls.Certificate)
        *certCopy = *m.cert
        certCopy.Certificate = certCopy.Certificate[:len(certCopy.Certificate):len(certCopy.Certificate)]
        return certCopy, nil
}
```
然后编译 derper:
```shell
cd /root/go/pkg/mod/tailscale.com@v1.61.0-pre.0.20240310014715-ad33e4727050/cmd/derper
go build -o /etc/derp/derper
```
检查 `/etc/derp/derper` 中是否存在 derper：
```shell
ls /etc/derp
derper
```

### 自签域名
如果没有域名证书，可以使用 openssl 自签域名，域名瞎编一个就行：
```shell
openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes -keyout /etc/derp/derp.myself.com.key -out /etc/derp/derp.myself.com.crt -subj "/CN=derp.myself.com" -addext "subjectAltName=DNS:derp.myself.com"
```

### 配置 DERP 服务
修改对应的端口，将下面这段代码写入 `/etc/systemd/system/derp.service` 中：
```
# 下面示例的端口为 33445 和 33446

[Unit]
Description=TS Derper
After=network.target
Wants=network.target
[Service]
User=root
Restart=always
ExecStart=/etc/derp/derper -hostname derp.myself.com -a :33445 -http-port 33446 -certmode manual -certdir /etc/derp
RestartPreventExitStatus=1
[Install]
WantedBy=multi-user.target
```
{% note warning %}
如果云服务器默认启动了网络防护规则，则需要将 33445 和 33445 的 tcp 和 udp 端口都放行
如果开启了 `ufw` 防火墙，则需要使用 `ufw allow 端口号` 对相应端口进行放行
{% endnote %}

然后启动 DERP 服务：
```shell
systemctl daemon-reload
```
重启 DERP 服务：
```shell
systemctl restart derp
```
设置开机自启动：
```shell
systemctl enable derp
```

### 检查 DERP 服务器状态
打开浏览器，输入服务器的 ip 地址，再加上端口号 `:3345`，浏览器出现如下页面则表明 DERP 服务启动成功：

![检查服务器状态](https://emin-blog.oss-cn-shanghai.aliyuncs.com/img/tailscale-browser-check.png)

### 配置 Access Controls
进入 Tailscale 网页端的 Access Controls 界面添加以下代码：
```
"derpMap": {
  "OmitDefaultRegions": true,
  "Regions": {
    "901": {
    "RegionID":   901,
    "RegionCode": "Myself",
    "RegionName": "Myself Derper",
    "Nodes": [
      {
        "Name":             "901a",
        "RegionID":         901,
        "DERPPort":         33445,
        "IPv4":            "服务器 IP",
        "InsecureForTests": true,
      },
      ],
    },
  },
},
```
其中 `IPv4` 为服务器的 ip，`DERPPort` 为上面章节中指定的服务器端口号

![ACL 界面](https://emin-blog.oss-cn-shanghai.aliyuncs.com/img/tailscale-acl.png)

## 测试 DERP 服务器是否接入
执行 `tailscale netcheck`，如果出现如下图的输出，则表明 DERP 服务器接入成功

![检查 DERP 服务器是否接入](https://emin-blog.oss-cn-shanghai.aliyuncs.com/img/tailscale-res-netcheck.png)

可以看到，自建的 DERP 服务器延迟要远远低于官方提供的 DERP 服务器，这样就可以在连接其他设备的时候拥有更好的体验了。