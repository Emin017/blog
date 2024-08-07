---
title: Chisel环境搭建
permalink: /IC/ysyx/chisel/
categories:
  - 体系结构&数字 IC
  - 一生一芯
  - chisel
tags:
  - 一生一芯
  - chisel
abbrlink: 56039
date: 2024-03-18 10:19:28
---
# Chisel 环境搭建

> 新手在最开始接触 Chisel 时可能会遇到各种各样的问题，例如怎么构建 Chisel、怎么生成 verilog，网上可能会有一些教程介绍了如何上手 Chisel，但是由于这些年 Chisel 的不断升级迭代，这些教程中提到的一些方法可能已经过时（例如 Chisel 更改了生成 Verilog 的 api、编译器从 SFC 换成了 MLIR)，
因此本文会记录一些我在搭建 Chisel 开发环境时遇到的坑和注意点。
<!-- more -->
但是我也还是无法保证本文提供的方法能和未来的 Chisel 兼容 ( Chisel 更新的越来越快了 qwq )。此外，由于我在 Linux 上进行开发，因此本文只介绍 Linux 上的配置方法（如有在 Windows 上开发的需求，请自行搜索）。
## 什么是 Chisel？
[Chisel](https://www.chisel-lang.org/)（Constructing Hardware In a Scala Embedded Language）是 UC Berkeley 开发的一种开源硬件构造语言。它是建构在 Scala 语言之上的领域专用语言（DSL），支持高度参数化的硬件生成器。
Chisel 将硬件构造原语添加到 Scala 编程语言中，为设计人员提供了现代编程语言的强大功能，可以编写复杂的、可参数化的电路生成器，从而生成可综合的 Verilog。 这种生成器方法可以创建可重用的组件和库，例如 Chisel 标准库 中的 FIFO 队列和仲裁器，从而提高了设计的抽象级别，同时保留了细粒度的控制。

## 获取 Chisel 模板工程 (template)
这里有一份 [Chipsalliance](https://www.chipsalliance.org/) 提供的 [模板工程](https://github.com/chipsalliance/chisel-template), 它同时提供了 SBT 和 MILL 的构建配置，我们只需要点击右上角的绿色按钮，选择“Create a new repository”就能开始使用模板了。
![使用 Chisel 工程模板](https://emin-blog.oss-cn-shanghai.aliyuncs.com/img/chise-template.png)
可以自由的选择创建仓库的设置。

![创建 Chisel 工程模板](https://emin-blog.oss-cn-shanghai.aliyuncs.com/img/create-template.png)
完成创建后将仓库下载到本地就能开始开发了。
![下载模板工程](https://emin-blog.oss-cn-shanghai.aliyuncs.com/img/clone-template.png)
{% note info %}
如果你不想在自己的 Github 上创建模板工程，也可以直接下载 chipsalliance 提供的模板（在 shell 中执行如下命令）。

```shell
git clone https://github.com/chipsalliance/chisel-template.git
```
{% endnote %}

## 安装依赖软件包
Chisel 主要依赖 JDK、SBT/MILL 和 Verilator ( 模板中的测试使用 svsim，需要 Verilator 作为测试后端 )。

### 安装 JDK
各种 Linux 发行版的包管理器上一般都会有提供 JDK 的下载
例如在 Ubuntu 上执行：
```shell
sudo apt-get install openjdk-11-jdk
```
在 Arch Linux 上执行：
```shell
sudo pacman -S jdk11-openjdk
```
要查看安装好的 Java 版本：
```shell
java -version
```
如果有正常输出，则表示安装成功
### 安装 Verilator
由于这个 Chisel 模板工程中的测试需要使用 Verilator 作为测试后端，所以我们还需要安装 Verilator，安装教程在 [这里](/notes/IC/verilator/start/)。

### 安装 MILL
Scala 构建工具主要有 SBT 和 MILL 两种，我选择的构建工具是 MILL ,[这里](https://www.lihaoyi.com/post/SoWhatsSoSpecialAboutTheMillScalaBuildTool.html) 介绍了不同构建工具之间的区别，MILL 的构建配置文件 (build.sc) 更为简洁、有更好的可读性，此外还可以在构建配置文件中使用函数式编程。
要获取 MILL 可以在 shell 中执行下面这行命令
```shell
curl -L https://github.com/com-lihaoyi/mill/releases/download/0.11.5/0.11.5 > mill && chmod +x mill
```
这时候你会发现在当前文件夹下面多出了一个 MILL，这时我们可以选择将其移动到系统路径 ( PATH ) 中，也可以选择在当前文件夹下面使用 （执行`./mill`) 。
{% note info %}
关于 MILL 工具的教程，可以看这个 [博客](https://alvinalexander.com/scala/mill-build-tool/intro/)
{% endnote %}

## 开始构建
接下来我们可以开始测试 Chisel 代码能否正常构建了，我们来到刚刚下载好的模板工程文件夹下面执行：
```shell
mill %NAME%.test # %NAME%应该被替换为我们工程的名字，build.sc 中的%NAME%也应该做相应的修改
```
会得到如下的输出：
```shell
$ mill -i playground.test # 我这将%NAME%替换为了 playground
[build.sc] [48/52] compile
Compiling compiler interface...
[info] compiling 1 Scala source to /home/emin/workbench/test/chisel-template/out/mill-build/compile.dest/classes ...
[info] done compiling
[50/83] playground.compile
Compiling compiler interface...
[info] compiling 2 Scala sources to /home/emin/workbench/test/chisel-template/out/playground/compile.dest/classes ...
[info] done compiling
[76/83] playground.test.compile
[info] compiling 1 Scala source to /home/emin/workbench/test/chisel-template/out/playground/test/compile.dest/classes ...
[info] done compiling
[83/83] playground.test.test
GCDSpec:
- Gcd should calculate proper greatest common denominator
```
这说明我们已经成功构建 Chisel 。
{% note danger %}
如果没有修改 %NAME% 直接执行`mill %NAME%.test`则会得到类似于下面的输出：
```shell
1 targets failed
generateScriptSources build.sc:10:9 expected ("}" | end-of-input)
object %NAME% extends SbtModule { m =>
        ^
```
这时我们需要到 `build.sc` 中将`%NAME`替换为我们工程的名字。我这将`%NAME%`修改为了`playground`，所以 `build.sc` 应该是：
{% fold 点击展开 %}
```scala
object playground extends SbtModule { m =>
  override def millSourcePath = os.pwd
  override def scalaVersion = "2.13.12"
  override def scalacOptions = Seq(
    "-language:reflectiveCalls",
    "-deprecation",
    "-feature",
    "-Xcheckinit",
  )
  override def ivyDeps = Agg(
    ivy"org.chipsalliance::chisel:6.2.0",
  )
  override def scalacPluginIvyDeps = Agg(
    ivy"org.chipsalliance:::chisel-plugin:6.2.0",
  )
  object test extends SbtModuleTests with TestModule.ScalaTest {
    override def ivyDeps = m.ivyDeps() ++ Agg(
      ivy"org.scalatest::scalatest::3.2.16"
    )
  }
}
```
{% endfold %}
{% endnote %}

如果需要生成 Verilog 文件，则执行下面这行命令
```shell
$ mill -i playground.runMain gcd.GCD
```
{% note info %}
这里的`playground`是我们刚刚修改的`%NAME%`，`gcd`是`GCD.scala`文件所在的软件包（在 src/main/scala/gcd 目录下），在`GCD.scala`中定义了如下的伴生对象：
```scala
object GCD extends App {
  ChiselStage.emitSystemVerilogFile(
    new GCD,
    firtoolOpts = Array("-disable-all-randomization", "-strip-debug-info")
  )
}
```
其中`ChiselStage.emitSystemVerilogFile`就是生成 System Verilog 文件的 Api，我们执行这个伴生对象就可以生成 Verilog 了。
模板工程中其实还提供了`DecoupledGCD`，如果想要生成它的 System Verilog 文件，则只需将`new GCD`替换为`new DecoupledGCD`就可以生成对应的文件 (`DecoupledGCD`需要提供宽度参数，因此需要改成类似于`new Decoupled(2)`)。
你也可以将生成 Verilog 文件的对象改为其他名称，只需要修改对应的生成命令，保持上文提到的规则就可以了 ( `mill -i %NAME%.runMain 软件包。对象名` )。
{% endnote %}

## 使用 MILL 生成 IDE Support
MILL 的 [文档](https://mill-build.com/mill/Installation_IDE_Support.html) 中有对如何生成 IDE 支持进行说明。
要生成 BSP Support：
```shell
mill mill.bsp.BSP/install
```
要生成 IDEA 支持：
```shell
mill mill.idea.GenIdea/idea
```
{% note success %}
JetBrains 公司推出 Java 开发工具 [IDEA](https://www.jetbrains.com/idea/) 有较为智能的补全提示和无缝的开箱即用体验，因此我个人更推荐使用 IDEA 进行 Chisel 开发
{% endnote %}
## 可能会遇到的坑
### ~~Verilator 需要 C++14 特性~~
{% note warning %}
chisel-template 工程中的 chisel 版本已经更新为 6.2.0，本章所提及的问题已经在[#3876](https://github.com/chipsalliance/chisel/blob/main/svsim/src/main/resources/simulation-driver.cpp)中修复。
如果在使用时遇到该问题，请升级 chisel 版本至 6.2.0 以上！
{% endnote %}
如果你安装的 Verilator 是 `5.020` 以上的版本，同时使用了 `Chisel6.2.0` 以下的版本，在运行`mill -i __.test`时可能会遇到如下报错：
{% fold 点击展开 %}
```shell
[info] done compiling
[83/83] playground.test.test
GCDSpec:
- Gcd should calculate proper greatest common denominator *** FAILED ***
  java.lang.Exception: make: Entering directory '/tmp/chisel3.simulator.EphemeralSimulator/721927@archlinux/workdir-default'
ls . | grep -v Makefile | grep -v execution-script.txt | xargs rm -rf
\
/usr/local/bin/verilator \::: details
        '--cc' \
        '--exe' \
        '--build' \
        '-o' \
        '../simulation' \
        '--top-module' \
        'svsimTestbench' \
        '--Mdir' \
        'verilated-sources' \
        '-CFLAGS' \
        '-std=c++11 -I/tmp/chisel3.simulator.EphemeralSimulator/721927@archlinux/workdir-default -DSVSIM_ENABLE_VERILATOR_SUPPORT' \
        '../primary-sources/DecoupledGcd.sv' 'testbench.sv' '../generated-sources/c-dpi-bridge.cpp' '../generated-sources/simulation-driver.cpp'
make[1]: Entering directory '/tmp/chisel3.simulator.EphemeralSimulator/721927@archlinux/workdir-default/verilated-sources'
ccache clang++  -I.  -MMD -I/usr/local/share/verilator/include -I/usr/local/share/verilator/include/vltstd -DVM_COVERAGE=0 -DVM_SC=0 -DVM_TRACE=0 -DVM_TRACE_FST=0 -DVM_TRACE_VCD=0 -faligned-new -fbracket-depth=4096 -fcf-protection=none -Qunused-arguments -Wno-bool-operation -Wno-c++11-narrowing -Wno-constant-logical-operand -Wno-non-pod-varargs -Wno-parentheses-equality -Wno-shadow -Wno-sign-compare -Wno-tautological-bitwise-compare -Wno-tautological-compare -Wno-uninitialized -Wno-unused-but-set-parameter -Wno-unused-but-set-variable -Wno-unused-parameter -Wno-unused-variable    -std=c++11 -I/tmp/chisel3.simulator.EphemeralSimulator/721927@archlinux/workdir-default -DSVSIM_ENABLE_VERILATOR_SUPPORT   -Os -c -o c-dpi-bridge.o c-dpi-bridge.cpp
ccache clang++  -I.  -MMD -I/usr/local/share/verilator/include -I/usr/local/share/verilator/include/vltstd -DVM_COVERAGE=0 -DVM_SC=0 -DVM_TRACE=0 -DVM_TRACE_FST=0 -DVM_TRACE_VCD=0 -faligned-new -fbracket-depth=4096 -fcf-protection=none -Qunused-arguments -Wno-bool-operation -Wno-c++11-narrowing -Wno-constant-logical-operand -Wno-non-pod-varargs -Wno-parentheses-equality -Wno-shadow -Wno-sign-compare -Wno-tautological-bitwise-compare -Wno-tautological-compare -Wno-uninitialized -Wno-unused-but-set-parameter -Wno-unused-but-set-variable -Wno-unused-parameter -Wno-unused-variable    -std=c++11 -I/tmp/chisel3.simulator.EphemeralSimulator/721927@archlinux/workdir-default -DSVSIM_ENABLE_VERILATOR_SUPPORT   -Os -c -o simulation-driver.o simulation-driver.cpp
In file included from simulation-dri::: detailsver.cpp:883:
In file included from ./VsvsimTestbench.h:11:
In file included from /usr/local/share/verilator/include/verilated.h:42:
/usr/local/share/verilator/include/verilatedos.h:265:3: error: "Verilator requires a C++14 or newer compiler"
  265 | # error "Verilator requires a C++14 or newer compiler"
      |   ^
In file included from simulation-driver.cpp:883:
In file included from ./VsvsimTestbench.h:11:
/usr/local/share/verilator/include/verilated.h:76:22: error: expected namespace name
   76 | using namespace std::literals;  // "<std::string literal>"s; see SF.7 core guideline
      |                 ~~~~~^
In file included from simulation-driver.cpp:883:
In file included from ./VsvsimTestbench.h:11:
In file included from /usr/local/sha::: detailsre/verilator/include/verilated.h:950:
/usr/local/share/verilator/include/verilated_types.h:266:24: error: invalid suffix on literal; C++11 requires a space between literal and identifier [-Wreserved-user-defined-literal]
  266 |     return "triggered="s + (e.isTriggered() ? "true" : "false");
      |                        ^
      |                         
/usr/local/share/verilator/include/verilated_types.h:266:24: error: expected ';' after return statement
  266 |     return "triggered="s + (e.isTriggered() ? "true" : "false");
      |                        ^
      |                        ;
/usr/local/share/verilator/include/verilated_types.h:277:24: error: invalid suffix on literal; C++11 requires a space between literal and identifier [-Wreserved-user-defined-literal]
  277 |     return "triggered="s + (e.isTriggered() ? "true" : "false");
      |                        ^
      |                         
/usr/local/share/verilator/include/verilated_types.h:277:24: error: expected ';' after return statement
  277 |     return "triggered="s + (e.isTriggered() ? "true" : "false");
      |                        ^
      |                        ;
/usr/local/share/verilator/include/verilated_types.h:1651:18: error: no member named 'exchange' in namespace 'std'; did you mean 'vlstd::exchange'?
 1651 |         : m_objp{std::exchange(moved.m_objp, nullptr)} {}
      |                  ^~~~~~~~~~~~~
      |                  vlstd::exchange
/usr/local/share/verilator/include/verilatedos.h:642:3: note: 'vlstd::exchange' declared here
  642 | T exchange(T& obj, U&& new_value) {
      |   ^
In file included from simulation-driver.cpp:883:
In file included from ./VsvsimTestbench.h:11:
In file included from /usr/local/share/verilator/include/verilated.h:950:
/usr/local/share/verilator/include/verilated_types.h:1661:18: error: no member named 'exchange' in namespace 'std'; did you mean 'vlstd::exchange'?
 1661 |         : m_objp{std::exchange(moved.m_objp, nullptr)} {}
      |                  ^~~~~~~~~~~~~
      |                  vlstd::exchange
/usr/local/share/verilator/include/verilatedos.h:642:3: note: 'vlstd::exchange' declared here
  642 | T exchange(T& obj, U&& new_value) {
      |   ^
In file included from simulation-driver.cpp:883:
In file included from ./VsvsimTestbench.h:11:
In file included from /usr/local/share/verilator/include/verilated.h:950:
/usr/local/share/verilator/include/verilated_types.h:1676:18: error: no member named 'exchange' in namespace 'std'; did you mean 'vlstd::exchange'?
 1676 |         m_objp = std::exchange(moved.m_objp, nullptr);
      |                  ^~~~~~~~~~~~~
      |                  vlstd::exchange
/usr/local/share/verilator/include/verilatedos.h:642:3: note: 'vlstd::exchange' declared here
  642 | T exchange(T& obj, U&& new_value) {
      |   ^
In file included from simulation-driver.cpp:883:
In file included from ./VsvsimTestbench.h:11:
In file included from /usr/local/share/verilator/include/verilated.h:950:
/usr/local/share/verilator/include/verilated_types.h:1691:18: error: no member named 'exchange' in namespace 'std'; did you mean 'vlstd::exchange'?
 1691 |         m_objp = std::exchange(moved.m_objp, nullptr);
      |                  ^~~~~~~~~~~~~
      |                  vlstd::exchange
/usr/local/share/verilator/include/verilatedos.h:642:3: note: 'vlstd::exchange' declared here
  642 | T exchange(T& obj, U&& new_value) {
      |   ^
10 errors generated.
make[1]: *** [VsvsimTestbench.mk:65: simulation-driver.o] Error 1
make[1]: Leaving directory '/tmp/chisel3.simulator.EphemeralSimulator/721927@archlinux/workdir-default/verilated-sources'
%Error: make -C verilated-sources -f VsvsimTestbench.mk -j 1 exited with 2
%Error: Command Failed ulimit -s unlimited 2>/dev/null; exec /usr/local/bin/verilator_bin --cc --exe --build -o ../simulation --top-module svsimTestbench --Mdir verilated-sources -CFLAGS -std=c++11\ -I/tmp/chisel3.simulator.EphemeralSimulator/721927\@archlinux/workdir-default\ -DSVSIM_ENABLE_VERILATOR_SUPPORT ../primary-sources/DecoupledGcd.sv testbench.sv ../generated-sources/c-dpi-bridge.cpp ../generated-sources/simulation-driver.cpp
make: *** [Makefile:12: simulation] Error 2
make: Leaving directory '/tmp/chisel3.simulator.EphemeralSimulator/721927@archlinux/workdir-default'
  at svsim.Workspace.compile(Workspace.scala:390)
  at chisel3.simulator.Simulator$WorkspaceCompiler.liftedTree1$1(Simulator.scala:60)
  at chisel3.simulator.Simulator$WorkspaceCompiler.process(Simulator.scala:53)
  at chisel3.simulator.SingleBackendSimulator.processBackends(Simulator.scala:139)
  at chisel3.simulator.SingleBackendSimulator.processBackends$(Simulator.scala:138)
  at chisel3.simulator.EphemeralSimulator$DefaultSimulator.processBackends(EphemeralSimulator.scala:27)
  at chisel3.simulator.Simulator._simulate(Simulator.scala:116)
  at chisel3.simulator.Simulator._simulate$(Simulator.scala:97)
  at chisel3.simulator.EphemeralSimulator$DefaultSimulator._simulate(EphemeralSimulator.scala:27)
  at chisel3.simulator.SingleBackendSimulator.simulate(Simulator.scala:146)
  ...
1 targets failed
playground.test.test 1 tests failed: 
  gcd.GCDSpec Gcd should calculate proper greatest common denominator
```
{% endfold %}
这是因为 Verilator 从`5.020`版本起需要 `C++14` 标准，而 `Chisel6.2.0` 版本之前的代码中限制了 C++标准为 [C++11](https://github.com/chipsalliance/chisel/pull/3876)。
解决方法：
1. 使用 `Chisel6.2.0` 。
2. 放弃使用 svsim 测试（大部分时候都不需要，但是个人觉得 svsim 用作单元测试还是挺不错的）。

### firtool 引发的一系列问题
从 Chisel3.6 版本开始，Chisel 开始使用 firtool (LLVM [CIRCT](https://github.com/llvm/circt) 项目的一部分）来生成 Verilog，好消息是现在 Chisel 开始使用 [firtool-resolver](https://github.com/chipsalliance/firtool-resolver) 来自动下载 firtool 依赖。
如果你在系统中已经安装了 firtool, 但是 firtool 版本和 Chisel 不适配，那么在生成 Verilog 的时候会报错。
要解决这个问题问题，需要 [下载](https://github.com/llvm/circt/releases) 对应版本的 firtool ，并将它加入到`PATH`中。
{%note warning%}
根据这里的版本对应 [说明](https://www.chisel-lang.org/docs/appendix/versioning)，下载对应的 firtool ！
{%endnote%}