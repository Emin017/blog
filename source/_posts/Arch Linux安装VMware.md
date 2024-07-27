---
title: Arch Linux 安装 VMware
permalink: /tool/vmware/
categories:
  - Tools
tags:
  - Tools
abbrlink: 64135
date: 2024-07-27 19:54:41
---

记录一下 Arch Linux 安装 VMware 过程以及需要打的一些补丁包
<!--more-->

# Arch Linux 安装 VMware

## 安装 vmware workstation
AUR 仓库上已经有打包好的 vmware workstation 包，可以直接通过 yay 进行安装：
```shell
sudo pacman -S fuse2 gtkmm linux-headers pcsclite libcanberra # 安装相关依赖
yay -S --noconfirm --needed ncurses5-compat-libs # 安装 ncurses5-compat-libs 依赖
yay -S vmware-workstation # 安装 vmware
```
这样子安装后的版本为 17.5.2-3，然后我们要启动相关的系统服务：
```shell
# vmware-networks.service 用于访客网络访问
# vmware-usbarbitrator.service 用于将 USB 设备连接到访客
sudo systemctl enable vmware-networks.service  vmware-usbarbitrator.service  # 设置开机自启动
sudo systemctl start vmware-networks.service  vmware-usbarbitrator.service # 启动系统服务
```
我们可以查看系统服务的启动情况：
```shell
sudo systemctl status vmware-networks.service  vmware-usbarbitrator.service
```
如果没输出什么报错，即安装完毕

## vmware host modules 补丁

有时候当我们在 vmware 中启动系统时，可能会遇到有关 `vmmon` 内核模块出错的问题，这时我们就需要打一下内核补丁包。
我们使用这个仓库的补丁：[vmware-host-modules](https://github.com/mkubecek/vmware-host-modules)
```shell
git clone https://github.com/mkubecek/vmware-host-modules.git # 获取源码
# 如果 vmware 的版本为 17.5.2，请参考这个 pull request 进行修改：
# https://github.com/mkubecek/vmware-host-modules/pull/252
cd vmware-host-modules
make
sudo make install
```
然后进行卸载模块和加载模块：
```shell
sudo modprobe -r vmmon
sudo modprobe -a vmmon
```
如果还是无法加载，则再执行 `sudo depmod`

执行完这些操作后，再次启动虚拟机，应该是可以正常进行使用了。

## vmware tools 安装
如果要开启主机和虚拟机之间共享文件夹或剪切板之类的操作，可以安装 open-vm-tools 工具：
```
git clone https://github.com/vmware/open-vm-tools
cd open-vm-tools/open-vm-tools
autoreconf -i
./configure --without-kernel-modules
make
sudo make install
sudo ldconfig
```

# vmware tools 补丁
使用这个仓库提供的补丁：[vmware-tools-patches](https://github.com/rasa/vmware-tools-patches)
```shell
git clone https://github.com/rasa/vmware-tools-patches.git
cd vmware-tools-patches
./patched-open-vm-tools.sh
```
更详细操作请参考：https://github.com/rasa/vmware-tools-patches?tab=readme-ov-file#quick-start