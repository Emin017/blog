---
title: 上手使用 GEM5
permalink: /IC/gem5/start/
categories:
  - 学习笔记
  - 体系结构&数字 IC
  - GEM5 使用
tags:
  - 体系结构&数字 IC
  - GEM5
abbrlink: 61123
date: 2024-03-18 09:07:21
---

GEM5 是一个开源计算机架构模拟器，包括系统级架构以及处理器微架构。GEM5 的前身为密歇根大学的 m5 项目与威斯康星大学的 GEMS 项目。2011 年 m5 与 GEMS 合并为 Gem5，目前被广泛用于学术界和工业界。通过谷歌学术可以看到，Gem5 目前被引用超过 5000 次，大量论文采用 Gem5 作为研究工具。同时也被许多工业界公司使用，包括 ARM、AMD、Google、Micron、Metempsy、HP、Samsung 等。
<!-- more -->
# 上手 GEM5
Gem5 主要由 C++和 python 编写的。其中 C++占绝大多数，主要负责底层架构的具体实现等，Python 则负责对象的初始化、配置和模拟控制等。另外包含了两个领域特定语言 DSL，其中 ISADSL 负责统一二进制指令的解码和语义规范，SLICC 用于实现缓存一致性协议。

## 安装 GEM5
[First Step](https://www.gem5.org/getting_started/)
1. 获取源码
```
git clone https://github.com/gem5/gem5
```
2. 安装依赖

推荐在 ubuntu 环境下进行构建（或者在 docker 中进行）

::: tip
我也尝试过在 arch 或是 fedora 这些滚动发行版上进行构建，但是似乎是因为 python 版本过高会导致 scons 构建工具出现问题。如果你在使用这些滚动发行版，建议在 docker 下进行构建
:::
```
sudo apt install build-essential git m4 scons zlib1g zlib1g-dev libprotobuf-dev protobuf-compiler libprotoc-dev libgoogle-perftools-dev python3-dev python3 
suod apt install libboost-all-dev pkg-config libhdf5-dev libpng-dev mold pip libcapstone-dev #可选
```
3. 开始构建
```
cd gem5
scons build/RISCV/gem5.opt -j`nproc`
```

4. 运行 Hello
```
build/X86/gem5.opt configs/learning_gem5/part1/simple-riscv.py
```

## 常见问题
GEM5 官网列出了很多常见的错误：https://www.gem5.org/documentation/learning_gem5/part1/building/
