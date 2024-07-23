---
title: 搭建 Verilator 仿真环境
date: 2024-03-16 17:31:10
categories:
  - 学习笔记
  - ysyx
tags:
  - 
---

搭建Verilator的环境跟着官方的文档来就行
<!-- more -->
# 搭建 Verilator 仿真环境

## Verilator介绍
**翻译自官方介绍**：

Verilator 的调用参数类似于 GCC 或 Synopsys 的 VCS。 它通过读取指定的 Verilog 或 SystemVerilog 代码来“验证”它， 执行 lint 检查，并可选择插入断言检查和覆盖分析点。它输出单线程或多线程的.cpp和.h 文件，"Verilated”代码。
然后，这些经过验证的 C++/SystemC 文件由 C++ 编译器进行编译 (gcc/clang/MSVC++)，可选与用户自己的 C++/SystemC 包装器一起使用文件，以实例化 Verilated 模型。执行结果可执行文件执行设计模拟。Verilator 还支持链接验证生成的库（可选加密）到其他模拟器中。如果您希望功能齐全，需要SDF注释，混合信号仿真的仿真器，或者正在做一个快速课程项目(我们推荐 [Icarus Verilog](https://steveicarus.github.io/iverilog/) 用于课堂作业)，Verilator 可能不是替代闭源Verilog模拟器的最佳选择。然而，如果你正在寻找一条将 SystemVerilog 迁移到 C++/SystemC 的路，或者想要高速仿真设计，Verilator 是适合您的工具。
## 安装教程
[verialtor官方安装说明](htts://verilator.org/guide/latest/install.html)

```bash
# Prerequisites:
#sudo apt-get install git perl python3 make autoconf g++ flex bison ccache
#sudo apt-get install libgoogle-perftools-dev numactl perl-doc
#sudo apt-get install libfl2  # Ubuntu only (ignore if gives error)
#sudo apt-get install libfl-dev  # Ubuntu only (ignore if gives error)
#sudo apt-get install zlibc zlib1g zlib1g-dev  # Ubuntu only (ignore if gives error)

git clone https://github.com/verilator/verilator   # Only first time

# Every time you need to build:
unsetenv VERILATOR_ROOT  # For csh; ignore error if on bash
unset VERILATOR_ROOT  # For bash
cd verilator
git pull         # Make sure git repository is up-to-date
git tag          # See what versions exist
#git checkout master      # Use development branch (e.g. recent bug fixes)
#git checkout stable      # Use most recent stable release
#git checkout v{version}  # Switch to specified release version

autoconf         # Create ./configure script
./configure      # Configure and create Makefile
make -j `nproc`  # Build Verilator itself (if error, try just 'make')
sudo make install
```

## 安装先决条件

要构建或运行 Verilator，您需要以下标准包：

```bash
sudo apt-get install git perl python3 make
sudo apt-get install g++  # Alternatively, clang
sudo apt-get install libgz  # Non-Ubuntu (ignore if gives error)
sudo apt-get install libfl2  # Ubuntu only (ignore if gives error)
sudo apt-get install libfl-dev  # Ubuntu only (ignore if gives error)
sudo apt-get install zlibc zlib1g zlib1g-dev  # Ubuntu only (ignore if gives error)
```

要构建或运行 Verilator，以下是可选的，但应安装以获得良好的性能：

```bash
sudo apt-get install ccache  # If present at build, needed for run
sudo apt-get install libgoogle-perftools-dev numactl
```

以下是可选的，但建议在运行 Verilator 时提供漂亮的命令行帮助：

```bash
sudo apt-get install perl-doc
```

要构建 Verilator，您需要安装这些软件包；这些不需要存在即可运行 Verilator：

```bash
sudo apt-get install git autoconf flex bison
```

那些开发 Verilator 本身的人可能也想要这些（参见 internals.rst）：

```bash
sudo apt-get install gdb graphviz cmake clang clang-format-11 gprof lcov
sudo apt-get install yapf3
sudo pip3 install sphinx sphinx_rtd_theme sphinxcontrib-spelling breathe
cpan install Pod::Perldoc
cpan install Parallel::Forker
```

---

## 编写cpp仿真文件

```cpp
#include <Vsw.h>
#include <verilated.h>
#include <stdio.h>
#include <stdlib.h>
#include <assert.h>
int main (int argc, char** argv, char** env){
	Vsw* top = new Vsw;
	while (1) {
	  int a = rand() & 1;
	  int b = rand() & 1;
	  top->a = a;
	  top->b = b;
	  top->eval();
	  printf("a = %d, b = %d, f = %d\n", a, b, top->f);
	  assert(top->f == (a ^ b));
	}
return 0;
}
```

### 生成波形
官方[实例](https://github.com/verilator/verilator/blob/master/examples/make_tracing_c/sim_main.cpp)
```cpp
#include <Vsw.h>
#include <verilated.h>
#include <stdio.h>
#include <stdlib.h>
#include <assert.h>

Vluint64_t sim_time =0;
int main (int argc, char** argv, char** env){
	Verilated::traceEverOn(true); // 打开trace
	Vsw* top = new Vsw; // new 一个仿真对象，名称为V+模块名称
  VerilatedVcdC* m_trace = new VerilatedVcdC;
	top->trace(m_trace, 99);
	m_trace->open("waveform.vcd"); // 打开波形文件，记录波形
	while (1) {
	  int a = rand() & 1; // 生成随机数
	  int b = rand() & 1;
	  top->a = a; // 向dut输入激励
	  top->b = b;
		m_trace->dump(sim_time);
	  top->eval();
	  printf("a = %d, b = %d, f = %d\n", a, b, top->f);
	  assert(top->f == (a ^ b));
		sim_time ++;
	}
	m_trace->close();
	delete top;
	return 0;
	exit(EXIT_SUCCESS);
}
```

::: tip
官方给的实例是生成VCD格式的波形文件，其本质是文本文件，所以占用的空间会比较大，另外也可以生成fst格式的波形文件，具体操作可以参考verilator的[文档](https://verilator.org/guide/latest/faq.html?highlight=fst)。
:::


## 一键仿真
可以编写Makefile脚本来进行一键仿真。
```makefile
run:
	verilator -Wall --cc --exe --build --trace sim_main.cpp sw.v

.PHONY : clean
clean :
	rm edit $(objects)
```