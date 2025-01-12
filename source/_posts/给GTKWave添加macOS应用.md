---
title: 给 GTKWave 添加 macOS 应用包
permalink: /IC/Tools/GTKWave/
categories:
  - GTKWave
  - macOS
tags:
  - nixos
abbrlink: 873
date: 2025-01-12 10:36:09
---

# 给 GTKWave 添加 macOS 应用包

旧版本的 GTKWave 提供了一个 [macOS 应用包](https://gtkwave.sourceforge.net/gtkwave.zip)，但是这个版本的 GTKWave 无法在新版本的 macOS 上运行，因此我基本上都是选择自己拉取源码编译的方式来使用 GTKWave。不过编译出的 GTKWave 只有命令行版本，没有 macOS App Bundle，我觉得这对于在 macOS 上安装 GTKWave 来说不太友好（虽然有 [Homebrew Formula](https://github.com/Emin017/homebrew-gtkwave)）。因此我决定给 GTKWave 添加 macOS 应用包，这样用户可以在应用文件夹中直接打开 GTKWave，也可以在 Launchpad 中直接打开 GTKWave，用户体验会更好。

刚好最近给一个用 zig 编写的终端模拟器 [Ghostty](https://ghostty.org/) 添加了 [Homebrew Formula](https://github.com/Emin017/homebrew-ghostty)，这个终端模拟器在 macOS 下只能编译出 App Bundle，因此我大致明白了如何给应用添加 macOS 应用包，对如何给 GTKWave 添加 macOS 应用包也有了一些思路，那么这篇文章就是记录我给 GTKWave 添加 macOS App Bundle 的过程。

## 借鉴 Ghostty 的 macOS App 构建流程

### 了解 Ghostty 的 macOS App Bundle 构建流程
由 Ghostty 的 [文档](https://ghostty.org/docs/install/build#mac-.app) 可以得知，Ghostty 的 macOS Application Bundle 构建流程是这样的：
1. 使用 `zig build` 编译出 Ghostty 的可执行文件
2. 进入 `macos` 文件夹，使用 `xcodebuild` 编译出 Ghostty 的 macOS Application Bundle

然后我阅读了一些 Ghostty 的 `macos` 文件夹下面的源代码，发现了许多用 Swift 编写的代码，这些代码中写了很多图形界面相关的函数和类，似乎 Ghostty 在 macOS 上的图形界面是用 Swift 原生实现的，但是 GTKWave 已经使用了 GTK+ 这个跨平台的图形界面库，因此我不再需要用 Swift 重新实现 GTKWave 的图形界面，我只需要将 GTKWave 的可执行文件 copy 到 macOS Application Bundle 中，然后写一个 Swift 程序用于引导 GTKWave 的可执行文件即可。

![Ghostty-source-code](https://emin-blog.oss-cn-shanghai.aliyuncs.com/img/gtkwave-macos-app/ghostty-source-code.png)

### 借助 Swift 构建 GTKWave 的 macOS App Bundle
然后我找到了一个已经被 archive 的示例项目 [rust-mac-app-examples](https://github.com/kattrali/rust-mac-app-examples)，这个项目中的第三个实例 [3-packaging-a-mac-app](https://github.com/kattrali/rust-mac-app-examples/tree/master/3-packaging-a-mac-app) 就介绍了如何给一个 Rust 程序添加 macOS Application Bundle，并使用 Swift 程序引导 Rust 程序的可执行文件，这个示例项目中的 Swift 程序就是用于引导 Rust 程序的可执行文件的。
不过可惜的是，这个项目的 Swift 版本还停留在 Swift 3，而目前新版本的 Xcode 已经不再支持 Swift 3，因此我需要将这个 Swift 代码升级到 Swift 5/6，这样才能在新版本的 Xcode 中编译通过。

#### 编写 Swift 程序
由于 macOS Application Bundle 是一个目录，我需要将 GTKWave 的可执行文件和动态链接库放在这个目录中，大致结构是这样的：
```
GTKWave.app
├── Contents
│   ├── Info.plist # 应用程序的信息
│   ├── MacOS
│   │   └── gtkwave # Swift 程序引导 GTKWave 的可执行文件
│   └── Resources
│       ├── bin
│       │   └── gtkwave # GTKWave 的可执行文件
│       └── lib
│           ├── libgtkwave.dylib # GTKWave 的动态链接库
│           └── ...
└── ...
```

我计划将 GTKWave 的可执行文件放在 `Resources/bin/gtkwave` 中，将动态链接库放在 `Resources/lib` 中，然后编写一个 Swift 程序，放置在`Contents/MacOS`目录下，用于引导 GTKWave 的可执行文件，这段 Swift 程序可以通过 `bundle.resourceURL?.appendingPathComponent("bin/gtkwave")` 来获取 GTKWave 的可执行文件。

我借助了一下 GPT，然后再自己稍微修改了一下，就得到了这个可以正常使用的版本：
```swift
//
//  macosApp.swift
//  macos
//
//  Created by Emin017 on 2025/1/9.
//
//  Ref: https://github.com/kattrali/rust-mac-app-examples/blob/master/3-packaging-a-mac-app/app/main.swift

import Cocoa

@main
class macOSApp {
    static func main() {
        let task = Process()
        let bundle = Bundle.main

        if let resourceURL = bundle.resourceURL?.appendingPathComponent("bin/gtkwave") {
            task.executableURL = resourceURL
        } else {
            fatalError("Binary 'gtkwave' not found in Resources/app folder")
        }

        let stdOut = Pipe()
        let stdErr = Pipe()

        stdOut.fileHandleForReading.readabilityHandler = { fileHandle in
            log(fileHandle.availableData)
        }

        stdErr.fileHandleForReading.readabilityHandler = { fileHandle in
            log(fileHandle.availableData)
        }

        task.standardOutput = stdOut
        task.standardError = stdErr

        task.terminationHandler = { task in
            (task.standardOutput as AnyObject?)?.fileHandleForReading.readabilityHandler = nil
            (task.standardError as AnyObject?)?.fileHandleForReading.readabilityHandler = nil
        }

        do {
            try task.run() // Start task
            task.waitUntilExit() // Keep syncing, until task end
        } catch {
            NSLog("Failed to start task: \(error)")
        }
    }
    // Log function
    static func log(_ data: Data) {
        if let message = String(data: data, encoding: .utf8) {
            NSLog("%@", message)
        }
    }
}
```
OK，Swift 程序写好了，接下来就是将 GTKWave 的可执行文件和动态链接库 copy 到 macOS App Bundle 中，这个过程可以通过直接在 Xcode 中添加 Build Phase 来实现：

![add-build-phase](https://emin-blog.oss-cn-shanghai.aliyuncs.com/img/gtkwave-macos-app/gtkwave-build-phase.png)

我在 Xcode 中添加了一个 Copy Files Build Phase，将 GTKWave 的可执行文件和动态链接库以及手册等文件都 copy 到 macOS Application Bundle 中，这样当构建完成后，我们就能软件包的`Contents/Resources`中找到这些文件了。
{% note info %}
但是后面发现，这里直接 copy 的文件夹中会存在一些不需要的 Meson 脚本，因此这种方式并不好。所以我后面换了一种打包方式。
{% endnote %}

#### 测试构建
然后我们就可以开始测试这个 macOS App Bundle 能不能正常使用了。首先我们仍然需要在 GTKWave 项目的根目录先进行二进制文件的构建：
```shell
meson setup build # 我这台 mac 上不知出了什么问题，需要加上 -Dintrospection=false 才能完成编译
meson compile -C build
```
然后进入 `macOS` 文件夹，然后直接执行 `xcodebuild` 就能开始构建了，构建的结果会输出到 `macos/build/Release/gtkwave.app`，双击 `gtkwave.app` 就能打开了。

#### 创建 GTKWave 的图标
GTKWave App Bundle 的程序功能基本上就解决了，但是我们还缺一个软件图标。
于是我就去翻了翻 GTKWave 仓库，发现仓库中有提供新版的 GTKWave 的图标：https://github.com/gtkwave/gtkwave/blob/master/share/icons/io.github.gtkwave.GTKWave.svg

同时又由于在 Xcode 中添加图标需要多个尺寸的 png 图片，于是我就将这个 SVG 图标导入到 Figma 中进行了缩放，然后导出了多个尺寸的 png 格式图标，然后打开 Xcode 的 Assets 里的 AppIcon，把这些图标拖进去就行了。

![xcode-icons](https://emin-blog.oss-cn-shanghai.aliyuncs.com/img/gtkwave-macos-app/gtkwave-icon-xcode.jpg)

OK，图标添加也完成了。

### 提 Pull Request 尝试合并到上游
然后我就提了一个 pull request: [#401](https://github.com/gtkwave/gtkwave/pull/401)
很快我就得到了 maintainer 的反馈：

![pr-review](https://emin-blog.oss-cn-shanghai.aliyuncs.com/img/gtkwave-macos-app/gtkwave-maintainer.png)

Maintainer 似乎不太想要引入 Xcode 的构建流程，他建议我使用 Meson 来构建 macOS App bundle，我也觉得额外引入 Xcode 的构建流程确实有点多余，因此我又开始尝试使用 Meson 来构建 macOS App bundle

## 使用 Meson 构建 macOS App Bundle
然后我就开始阅读 Meson 的文档和 GTKWave 的 Meson 构建文件，尝试将构建 macOS App Bundle 的流程添加到 Meson 的构建流程中。

### 修改 Meson 构建文件
首先，Meson 中提供了 `host_machine.system() == 'darwin'` 来判断当前系统是否是 macOS，因此我可以专门为 macOS 添加一些构建流程。
然后为了让用户能够自由选择是否需要构建 macOS App Bundle，我添加了一个 `build_macos_app` 的选项，用户可以通过 `-Dbuild_macos_app=true` 来构建 macOS App Bundle:
```python
option(
    'build_macos_app',
    type: 'feature',
    value: 'disabled',
    description: 'Build MacOS application bundle',
)

# Run: meson setup build -Dbuild_macos_app=true
```
我可以通过下面这个语句来判断用户是否选择了构建 macOS App Bundle：
```python
get_option('build_macos_app').enabled()
```
由于构建 macOS App Bundle 需要将 GTKWave 的可执行文件和动态链接库 copy 到 macOS App Bundle 中，因此我需要在 Meson 的构建流程中给二进制文件和链接库的安装路径都添加上 rpath，这样 Meson 才能正确的将这些文件 copy 到 macOS App Bundle 中：
```python
if get_option('set_rpath').enabled() or (get_option('set_rpath').auto() and get_option('prefix') != '/usr')
    if host_machine.system() == 'darwin' and get_option('build_macos_app').enabled()
        app_path = get_option('prefix')
        app_contents = app_path / 'Contents'

        install_rpath = app_path
        install_libs_rpath = app_contents / 'Resources' / 'lib'
        install_headers_rpath = install_libs_rpath
    else
        install_rpath = get_option('prefix') / get_option('libdir')
        install_libs_rpath = install_rpath
        install_headers_rpath = install_rpath
    endif
else
    install_rpath = ''
endif
```
`app_path` 是 macOS App Bundle 的根目录，`app_contents` 是 macOS App Bundle 的 `Contents` 目录，`install_rpath` 是 GTKWave 的可执行文件的 `rpath`。此外又由于 GTKWave 之前并没有为共享库的安装路径设置 `rpath`，因此我设置了 `install_libs_rpath` 和 `install_headers_rpath`，为所有共享库添加了 `rpath`，这样 Meson 才能正确的将这些共享库 copy 到 macOS App Bundle 中。

具体修改的内容可以参考我的这个 pull request：https://github.com/gtkwave/gtkwave/pull/402/files

### 添加引导脚本、图标和 Info.plist
然后我就需要将 GTKWave 的引导脚本、图标和 Info.plist 文件 copy 到 macOS App Bundle 中，这个过程在 Meson 中还挺容易实现：
```python
if host_machine.system() == 'darwin' and get_option('build_macos_app').enabled()
    app_macos = app_contents / 'MacOS'
    app_resources = app_contents / 'Resources'

    install_data(
        'macos/launcher.sh',
        rename: 'gtkwave',
        install_dir: app_macos,
        install_mode: 'rwxr-xr-x'
    )

    install_data(
        'macos/Info.plist',
        install_dir: app_contents,
    )

    install_data(
        'macos/AppIcon.icns',
        install_dir: app_resources
    )

    install_data(
        'macos/gtkwave.entitlements',
        install_dir: app_contents
    )
endif
```
`launcher.sh`、`Info.plist` 和 `AppIcon.icns` 都是我实现写好后放在 `macos` 文件夹下面的文件：`launcher.sh` 是用于引导 GTKWave 的脚本，`Info.plist` 是 macOS App Bundle 的信息文件，`AppIcon.icns` 是 GTKWave 的图标文件（之前在 Xcode 里生成的，我直接 copy 过来了）。

`launcher.sh` 的内容如下：
```sh
#!/bin/sh

DIR="$(cd "$(dirname "$0")" && pwd)"
CONTENTS="$(dirname "$DIR")"
RESOURCES="$CONTENTS/Resources"

exec "$RESOURCES/bin/gtkwave" "$@"
```
主要就是获取当前脚本的路径，然后获取 macOS App Bundle 的 `Resources` 目录，最后执行 GTKWave 的可执行文件。

然后我们就可以正常构建这个 macOS App Bundle 了：
```shell
meson setup build \
    -Dbuild_macos_app=enabled \
    -Dset_rpath=enabled \
    -Dintrospection=false \
    --datadir=/Applications/gtkwave.app/Contents/Resources/share \
    --prefix=/Applications/gtkwave.app --bindir=Contents/Resources/bin

meson compile -C build
```
构建完成后，我们就能在系统的 `/Applications` 目录下或是在 Launchpad 中找到 `gtkwave`，双击就能打开了：

![gtkwave-preview1](https://emin-blog.oss-cn-shanghai.aliyuncs.com/img/gtkwave-macos-app/preview1.png)

或者也可以通过 Spotlight （我用 [Raycast](https://www.raycast.com/)) 搜索 `gtkwave` 来打开：

![gtkwave-preview0](https://emin-blog.oss-cn-shanghai.aliyuncs.com/img/gtkwave-macos-app/preview0.png)