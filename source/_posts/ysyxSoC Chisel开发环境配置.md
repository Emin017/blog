---
title: ysyxSoC Chisel 开发环境配置
permalink: /IC/ysyx/chisel/ysyxSoC/
categories:
  - 学习笔记
  - 一生一芯
  - chisel
  - 体系结构&数字 IC
tags:
  - 一生一芯
  - chisel
abbrlink: 24992
date: 2024-04-12 15:15:32
---

最近一生一芯做到了接 SoC 的部分，发现还是需要重新配置一下 mill 的配置文件才能使用 IDEA 的高亮和代码跳转，因此记录一下配置过程。
<!-- more -->

# ysyxSoC Chisel 开发环境配置

{% note warning %}
如果是在 2024 年 4 月 21 号后获取的代码，请直接跳到 [新版本 ysyxSoC 代码导入](https://eminblog.cc/IC/ysyx/chisel/ysyxSoC/#新版本-ysyxSoC-代码导入)章节！
{% endnote %}

## 代码导读
ysyxSoC 的代码可以通过下面的命令进行获取：
```shell
cd ysyx-workbench
git clone git@github.com:OSCPU/ysyxSoC.git
```
ysyxSoC 的代码结构如下：
```shell
ysyxSoC
├── Makefile
├── chiplink # chiplink 相关代码
├── generated # 生成的 SoC 代码
│   ├── ysyxSoCFull-ChipLink.v
│   └── ysyxSoCFull.v
├── lint # verilator lint 检查
│   ├── Makefile
│   ├── README.md
│   └── verilator-warning.txt
├── patch # Rocket-chip 的补丁
│   ├── chisel6.diff
│   └── rocket-chip.patch
├── perip # 外设相关 IP
├── rocket-chip # rocket-chip 代码
├── soc # soc 代码
└── spec # spec 文档（接口规范）
    └── cpu-interface.md
```
ysyxSoC 的总线部分借助了 [rocket-chip](https://github.com/chipsalliance/rocket-chip) 的 [diplomacy](https://github.com/chipsalliance/rocket-chip/blob/master/docs/README.md) 框架来完成连接，因此我们通过阅读 ysyxSoC 的 Makefile 可以得知，ysyxSoC 的代码是在 rocket-chip 中生成，再拷贝到 generated 文件夹中的。

```Makefile
FINAL_V = rocket-chip/out/emulator/freechips.rocketchip.system.TestHarness/freechips.rocketchip.system.DefaultConfig/mfccompiler/compile.dest/TestHarness.sv
YSYXSOCFULL_V = generated/ysyxSoCFull.v
ROCKET_CHIP_YSYXSOC_PATH  = rocket-chip/src/main/scala/ysyxSoC
ROCKET_CHIP_CHIPLINK_PATH = rocket-chip/src/main/scala/chiplink

$(YSYXSOCFULL_V):
	cp $(abspath soc)/* $(ROCKET_CHIP_YSYXSOC_PATH)
	cp $(abspath chiplink)/* $(ROCKET_CHIP_CHIPLINK_PATH)
	$(MAKE) -C rocket-chip verilog
	cp $(FINAL_V) $@
	sed -i -e 's/_\(aw\|ar\|w\|r\|b\)_\(\|bits_\)/_\1/g' $@
	sed -i '/firrtl_black_box_resource_files.f/, $$d' $@

verilog: $(YSYXSOCFULL_V)
```
我使用 JetBrains 家的 IDEA 进行 Chisel 的开发，但是由于我将 ysyxSoC 文件夹直接加到了 npc 目录中，且暂时未对`build.sc`进行修改，这导致 ysyxSoC 文件夹中所有的 chisel 代码在 IDEA 都无法进行高亮显示和代码跳转。因此接下来我们要对 `build.sc` 进行适当调整，以提供 IDEA Support 。
## 为 rockee-chip 添加 IDEA 支持
我在 npc 文件夹中直接加入了 ysyxSoC 框架，所以接下来需要改动 npc 中的 `build.sc`，以将 rocket-chip 加入到我的构建模块中。
这里我~~偷了个小懒，~~ 借鉴了香山的 [`build.sc`](https://github.com/OpenXiangShan/XiangShan/blob/master/build.sc)，对其进行了适当的删减（去除了很多不需要的模块）。
修改过的 `build.sc` 如下：

{% fold build.sc %}

```diff
diff --git a/npc/build.sc b/npc/build.sc
index a223dac4..af36912f 100644
--- a/npc/build.sc
+++ b/npc/build.sc
@@ -1,43 +1,146 @@
 // import Mill dependency
 import mill._
-import mill.scalalib._
+import scalalib._
 import mill.scalalib.scalafmt.ScalafmtModule
-import mill.scalalib.TestModule.Utest
 // support BSP
 import mill.bsp._
+import $file.`ysyxSoC`.`rocket-chip`.common
+import $file.`ysyxSoC`.`rocket-chip`.cde.common
+import $file.`ysyxSoC`.`rocket-chip`.hardfloat.build
 
-object playground extends ScalaModule with ScalafmtModule { m =>
-  val useChisel7 = false
-  val useUTest = false
-  override def scalaVersion = "2.13.12"
-  override def scalacOptions = Seq(
-    "-language:reflectiveCalls",
-    "-deprecation",
-    "-feature",
-    "-Xcheckinit"
-  )
-  override def ivyDeps = Agg(
-    if (useChisel7) ivy"org.chipsalliance::chisel:7.0.0-M1" else
-      ivy"org.chipsalliance::chisel:6.2.0",
-  )
-  override def scalacPluginIvyDeps = Agg(
-    if (useChisel7) ivy"org.chipsalliance:::chisel-plugin:7.0.0-M1" else
-      ivy"org.chipsalliance:::chisel-plugin:6.2.0",
-  )
-  object test extends ScalaTests {
-    override def ivyDeps = m.ivyDeps() ++ Agg(
-      ivy"com.lihaoyi::utest:0.8.1",
-      if (useChisel7) ivy"edu.berkeley.cs::chiseltest:6.0.0" else
-        ivy"edu.berkeley.cs::chiseltest:6.0.0",
+val defaultScalaVersion = "2.13.10"
+
+def defaultVersions(chiselVersion: String) = chiselVersion match {
+  case "chisel7" =>
+    Map(
+      "chisel"        -> ivy"org.chipsalliance::chisel:7.0.0-M1",
+      "chisel-plugin" -> ivy"org.chipsalliance:::chisel-plugin:7.0.0-M1",
+      "chiseltest"    -> ivy"edu.berkeley.cs::chiseltest:6.0.0"
     )
-    def testFramework =
-      if (useUTest) "utest.runner.Framework" else
-        "org.scalatest.tools.Framework"
+  case "chisel" =>
+    Map(
+      "chisel"        -> ivy"org.chipsalliance::chisel:6.2.0",
+      "chisel-plugin" -> ivy"org.chipsalliance:::chisel-plugin:6.2.0",
+      "chiseltest"    -> ivy"edu.berkeley.cs::chiseltest:6.0.0"
+    )
+  case "chisel3" =>
+    Map(
+      "chisel"        -> ivy"edu.berkeley.cs::chisel3:3.6.0",
+      "chisel-plugin" -> ivy"edu.berkeley.cs:::chisel3-plugin:3.6.0",
+      "chiseltest"    -> ivy"edu.berkeley.cs::chiseltest:0.6.2"
+    )
+}
+
+trait HasChisel extends SbtModule with Cross.Module[String] {
+
+  def chiselModule: Option[ScalaModule] = None
+
+  def chiselPluginJar: T[Option[PathRef]] = None
+
+  def chiselIvy: Option[Dep] = Some(defaultVersions(crossValue)("chisel"))
+
+  def chiselPluginIvy: Option[Dep] = Some(defaultVersions(crossValue)("chisel-plugin"))
+
+  override def scalaVersion = defaultScalaVersion
+
+  override def scalacOptions = super.scalacOptions() ++
+    Agg("-language:reflectiveCalls", "-Ymacro-annotations", "-Ytasty-reader")
+
+  override def ivyDeps = super.ivyDeps() ++ Agg(chiselIvy.get)
+
+  override def scalacPluginIvyDeps = super.scalacPluginIvyDeps() ++ Agg(chiselPluginIvy.get)
+}
+
+object rocketchip extends Cross[RocketChip]("chisel", "chisel7")
+
+trait RocketChip extends millbuild.`ysyxSoC`.`rocket-chip`.common.RocketChipModule with HasChisel {
+
+  override def scalaVersion: T[String] = T(defaultScalaVersion)
+
+  override def millSourcePath = os.pwd / "ysyxSoC" / "rocket-chip"
+
+  override def sources = T.sources {
+    super.sources() ++ Seq(PathRef(this.millSourcePath / "ysyxSoC" / "rocket-chip" / "src"))
+  }
+  def macrosModule = macros
+
+  def hardfloatModule = hardfloat(crossValue)
+
+  def cdeModule = cde
+
+  def mainargsIvy = ivy"com.lihaoyi::mainargs:0.5.4"
+
+  def json4sJacksonIvy = ivy"org.json4s::json4s-jackson:4.0.6"
+
+  object macros extends Macros
+
+  trait Macros extends millbuild.`ysyxSoC`.`rocket-chip`.common.MacrosModule with SbtModule {
+
+    def scalaVersion: T[String] = T(defaultScalaVersion)
+
+    def scalaReflectIvy = ivy"org.scala-lang:scala-reflect:${defaultScalaVersion}"
   }
-  /*
+
+  object hardfloat extends Cross[Hardfloat](crossValue)
+
+  trait Hardfloat extends millbuild.`ysyxSoC`.`rocket-chip`.hardfloat.common.HardfloatModule with HasChisel {
+
+    override def scalaVersion: T[String] = T(defaultScalaVersion)
+
+    override def millSourcePath = os.pwd / "ysyxSoC" / "rocket-chip" / "hardfloat" / "hardfloat"
+
+  }
+
+  object cde extends CDE
+
+  trait CDE extends millbuild.`ysyxSoC`.`rocket-chip`.cde.common.CDEModule with ScalaModule {
+
+    def scalaVersion: T[String] = T(defaultScalaVersion)
+
+    override def millSourcePath = os.pwd / "ysyxSoC" / "rocket-chip" / "cde" / "cde"
+  }
+}
+
+trait NPCModule extends ScalaModule with ScalafmtModule with HasChisel {
+
+  def rocketModule: ScalaModule
+
+  override def moduleDeps = super.moduleDeps ++ Seq(
+    rocketModule
+  )
+}
+
+object playground extends Cross[Playground]("chisel", "chisel7")
+
+trait Playground extends NPCModule with HasChisel {
+
+  override def millSourcePath = os.pwd
+
+  def rocketModule = rocketchip(crossValue)
+
+  override def forkArgs = Seq("-Xmx20G", "-Xss256m")
+
+  override def sources = T.sources {
+    super.sources() ++ Seq(PathRef(this.millSourcePath / "playground" / "src"))
+  }
+
+  object test extends SbtModuleTests with TestModule.ScalaTest {
+
+    override def forkArgs = Seq("-Xmx20G", "-Xss256m")
+
+    override def sources = T.sources {
+      super.sources() ++ Seq(PathRef(this.millSourcePath / "playground" / "test"))
+    }
+
+    override def ivyDeps = super.ivyDeps() ++ Agg(
+      defaultVersions(crossValue)("chiseltest")
+    )
+    /*
   override def repositoriesTask = T.task { Seq(
     coursier.MavenRepository("https://maven.aliyun.com/repository/central"),
     coursier.MavenRepository("https://repo.scala-sbt.org/scalasbt/maven-releases"),
   ) ++ super.repositoriesTask() }
-   */
+     */
+  }
 }

```
{% endfold %}

需要说明一下的是这里我同样也是选择了进行了 [`Cross Builds`](https://mill-build.com/mill/Cross_Builds.html)，主要是出于两个考虑：
1. 需要将 rocket-chip 的 `build.sc` 加进 npc 的 `build.sc`, 而 rocket-chip 中的 build.sc 是 Cross Builds，因此~~为了偷懒，不修改 rocket-chip 代码~~我将 npc 也改为 Cross Builds 了
2. ysyxSoC 环境中默认使用 `chisel3.6`, 而我在 npc 环境中可能会用到`chisel6`甚至是`chisel7`，因此使用 Cross Builds 更方便切换版本

经过上述修改后，rocket-chip 已经被我加入到了 npc 的 mill 构建系统中，但是如果直接进行编译：
```shell
mill -i __.compile
```
我们会发现 mill 的编译是无法通过的。这是因为目前 rocket-chip 还是使用`chisel5`, 有许多 API 在`chisel6`中已经被废弃了，因此我们还是需要对 rocket-chip 中的部分代码进行修改

## 替换 rocket-chip 中在 chisel6 中已弃用的 API
我们进入香山 fork 的 [rocket-chip 仓库](https://github.com/OpenXiangShan/rocket-chip)，可以看到香山中的 rocket-chip 也已经对这些在 chisel6 中被废弃的 API 进行了 [替换](https://github.com/Emin017/rocket-chip/commit/542030fe5832d740fb28eb21c35eafc965320eb9)
![xiangshan rocket-chip](https://emin-blog.oss-cn-shanghai.aliyuncs.com/img/xiangshan-rocket.png)
当然，由于猜测香山的 rocket-chip 做了些定制化的修改，具体的代码位置和内容与 ysyxSoC 中的代码相比可能会有区别，我还是选择从 chipsalliance 的 rocket-chip 仓库中 fork 了一个 rocket-chip 进行修改。
因此只要根据我 [ fork 的仓库](https://github.com/Emin017/rocket-chip) 生成 path 补丁即可：
```
git clone https://github.com/Emin017/rocket-chip.git rocket-chip-patch
cd rocket-chip-patch
git checkout minsoc
git diff 542030fe dbcb06af > ../patch/chisel6.patch
```

这里也直接提供了一个可以直接使用的 patch：
{% fold patch %}
```diff
diff --git a/src/main/scala/diplomacy/BundleBridge.scala b/src/main/scala/diplomacy/BundleBridge.scala
index e02d6f4f9..0e2eef8ba 100644
--- a/src/main/scala/diplomacy/BundleBridge.scala
+++ b/src/main/scala/diplomacy/BundleBridge.scala
@@ -3,8 +3,9 @@
 package freechips.rocketchip.diplomacy
 
 import chisel3._
-import chisel3.experimental.{DataMirror, SourceInfo}
-import chisel3.experimental.DataMirror.internal.chiselTypeClone
+import chisel3.experimental.SourceInfo
+import chisel3.reflect.DataMirror
+import chisel3.reflect.DataMirror.internal.chiselTypeClone
 import org.chipsalliance.cde.config.Parameters
 import freechips.rocketchip.util.DataToAugmentedData
 
diff --git a/src/main/scala/diplomacy/LazyModule.scala b/src/main/scala/diplomacy/LazyModule.scala
index 5f4da46cb..da9bdd4d4 100644
--- a/src/main/scala/diplomacy/LazyModule.scala
+++ b/src/main/scala/diplomacy/LazyModule.scala
@@ -3,9 +3,8 @@
 package freechips.rocketchip.diplomacy
 
 import chisel3._
-import chisel3.internal.sourceinfo.{SourceInfo, UnlocatableSourceInfo}
 import chisel3.{Module, RawModule, Reset, withClockAndReset}
-import chisel3.experimental.{ChiselAnnotation, CloneModuleAsRecord}
+import chisel3.experimental.{ChiselAnnotation, CloneModuleAsRecord, SourceInfo, UnlocatableSourceInfo}
 import firrtl.passes.InlineAnnotation
 import org.chipsalliance.cde.config.Parameters
 
diff --git a/src/main/scala/groundtest/TraceGen.scala b/src/main/scala/groundtest/TraceGen.scala
index 5c5cba9b5..51d284eb5 100644
--- a/src/main/scala/groundtest/TraceGen.scala
+++ b/src/main/scala/groundtest/TraceGen.scala
@@ -186,7 +186,7 @@ class TagMan(val logNumTags : Int) extends Module {
   io.tagOut := nextTag
 
   // Is the next tag available?
-  io.available := ~MuxLookup(nextTag, true.B, inUseMap)
+  io.available := ~MuxLookup(nextTag, true.B)(inUseMap)
 
   // When user takes a tag
   when (io.take) {
@@ -249,8 +249,7 @@ class TraceGenerator(val params: TraceGenParams)(implicit val p: Parameters) ext
   val addrBagIndices = (0 to addressBagLen-1).
                     map(i => i.U(logAddressBagLen.W))
 
-  val randAddrFromBag = MuxLookup(randAddrBagIndex, 0.U,
-                          addrBagIndices.zip(bagOfAddrs))
+  val randAddrFromBag = MuxLookup(randAddrBagIndex, 0.U)(addrBagIndices.zip(bagOfAddrs))
 
   // Random address from the address bag or the extra addresses.
 
@@ -268,8 +267,8 @@ class TraceGenerator(val params: TraceGenParams)(implicit val p: Parameters) ext
 
           // A random address from the extra addresses.
           val randAddrFromExtra = Cat(0.U,
-                MuxLookup(randExtraAddrIndex, 0.U,
-                  extraAddrIndices.zip(extraAddrs)), 0.U(3.W))
+                MuxLookup(randExtraAddrIndex, 0.U)
+                  (extraAddrIndices.zip(extraAddrs)), 0.U(3.W))
 
           Frequency(List(
             (1, randAddrFromBag),
@@ -279,8 +278,7 @@ class TraceGenerator(val params: TraceGenParams)(implicit val p: Parameters) ext
   val allAddrs = extraAddrs ++ bagOfAddrs
   val allAddrIndices = (0 until totalNumAddrs)
     .map(i => i.U(log2Ceil(totalNumAddrs).W))
-  val initAddr = MuxLookup(initCount, 0.U,
-    allAddrIndices.zip(allAddrs))
+  val initAddr = MuxLookup(initCount, 0.U)(allAddrIndices.zip(allAddrs))
 
   // Random opcodes
   // --------------
diff --git a/src/main/scala/jtag/JtagShifter.scala b/src/main/scala/jtag/JtagShifter.scala
index 69f6d1272..d76ac3535 100644
--- a/src/main/scala/jtag/JtagShifter.scala
+++ b/src/main/scala/jtag/JtagShifter.scala
@@ -3,7 +3,7 @@
 package freechips.rocketchip.jtag
 
 import chisel3._
-import chisel3.experimental.DataMirror
+import chisel3.reflect.DataMirror
 import chisel3.internal.firrtl.KnownWidth
 import chisel3.util.{Cat, Valid}
 
diff --git a/src/main/scala/rocket/BTB.scala b/src/main/scala/rocket/BTB.scala
index 25b5b359d..d3f637a41 100644
--- a/src/main/scala/rocket/BTB.scala
+++ b/src/main/scala/rocket/BTB.scala
@@ -5,7 +5,7 @@ package freechips.rocketchip.rocket
 
 import chisel3._
 import chisel3.util._
-import chisel3.internal.InstanceId
+import chisel3.InstanceId
 import org.chipsalliance.cde.config.Parameters
 import freechips.rocketchip.subsystem.CacheBlockBytes
 import freechips.rocketchip.tile.HasCoreParameters
diff --git a/src/main/scala/rocket/DCache.scala b/src/main/scala/rocket/DCache.scala
index 308392aca..66aa0715f 100644
--- a/src/main/scala/rocket/DCache.scala
+++ b/src/main/scala/rocket/DCache.scala
@@ -561,7 +561,7 @@ class DCacheModule(outer: DCache) extends HellaCacheModule(outer) {
   val put     = edge.Put(a_source, access_address, a_size, a_data)._2
   val putpartial = edge.Put(a_source, access_address, a_size, a_data, a_mask)._2
   val atomics = if (edge.manager.anySupportLogical) {
-    MuxLookup(s2_req.cmd, WireDefault(0.U.asTypeOf(new TLBundleA(edge.bundle))), Array(
+    MuxLookup(s2_req.cmd, WireDefault(0.U.asTypeOf(new TLBundleA(edge.bundle))))(Array(
       M_XA_SWAP -> edge.Logical(a_source, access_address, a_size, a_data, TLAtomics.SWAP)._2,
       M_XA_XOR  -> edge.Logical(a_source, access_address, a_size, a_data, TLAtomics.XOR) ._2,
       M_XA_OR   -> edge.Logical(a_source, access_address, a_size, a_data, TLAtomics.OR)  ._2,
diff --git a/src/main/scala/rocket/NBDcache.scala b/src/main/scala/rocket/NBDcache.scala
index f9161dd5d..510fe1f5e 100644
--- a/src/main/scala/rocket/NBDcache.scala
+++ b/src/main/scala/rocket/NBDcache.scala
@@ -82,7 +82,7 @@ class IOMSHR(id: Int)(implicit edge: TLEdgeOut, p: Parameters) extends L1HellaCa
   val get     = edge.Get(a_source, a_address, a_size)._2
   val put     = edge.Put(a_source, a_address, a_size, a_data)._2
   val atomics = if (edge.manager.anySupportLogical) {
-    MuxLookup(req.cmd, (0.U).asTypeOf(new TLBundleA(edge.bundle)), Array(
+    MuxLookup(req.cmd, (0.U).asTypeOf(new TLBundleA(edge.bundle)))(Array(
       M_XA_SWAP -> edge.Logical(a_source, a_address, a_size, a_data, TLAtomics.SWAP)._2,
       M_XA_XOR  -> edge.Logical(a_source, a_address, a_size, a_data, TLAtomics.XOR) ._2,
       M_XA_OR   -> edge.Logical(a_source, a_address, a_size, a_data, TLAtomics.OR)  ._2,
diff --git a/src/main/scala/rocket/RocketCore.scala b/src/main/scala/rocket/RocketCore.scala
index 65f8c7323..62c9486da 100644
--- a/src/main/scala/rocket/RocketCore.scala
+++ b/src/main/scala/rocket/RocketCore.scala
@@ -384,10 +384,10 @@ class Rocket(tile: RocketTile)(implicit p: Parameters) extends CoreModule()(p)
   val ex_rs = for (i <- 0 until id_raddr.size)
     yield Mux(ex_reg_rs_bypass(i), bypass_mux(ex_reg_rs_lsb(i)), Cat(ex_reg_rs_msb(i), ex_reg_rs_lsb(i)))
   val ex_imm = ImmGen(ex_ctrl.sel_imm, ex_reg_inst)
-  val ex_op1 = MuxLookup(ex_ctrl.sel_alu1, 0.S, Seq(
+  val ex_op1 = MuxLookup(ex_ctrl.sel_alu1, 0.S)(Seq(
     A1_RS1 -> ex_rs(0).asSInt,
     A1_PC -> ex_reg_pc.asSInt))
-  val ex_op2 = MuxLookup(ex_ctrl.sel_alu2, 0.S, Seq(
+  val ex_op2 = MuxLookup(ex_ctrl.sel_alu2, 0.S)(Seq(
     A2_RS2 -> ex_rs(1).asSInt,
     A2_IMM -> ex_imm,
     A2_SIZE -> Mux(ex_reg_rvc, 2.S, 4.S)))
diff --git a/src/main/scala/rocket/ScratchpadSlavePort.scala b/src/main/scala/rocket/ScratchpadSlavePort.scala
index c5b5632f5..998fe7e26 100644
--- a/src/main/scala/rocket/ScratchpadSlavePort.scala
+++ b/src/main/scala/rocket/ScratchpadSlavePort.scala
@@ -57,16 +57,16 @@ class ScratchpadSlavePort(address: Seq[AddressSet], coreDataBytes: Int, usingAto
 
     def formCacheReq(a: TLBundleA) = {
       val req = Wire(new HellaCacheReq)
-      req.cmd := MuxLookup(a.opcode, M_XRD, Array(
+      req.cmd := MuxLookup(a.opcode, M_XRD)(Array(
         TLMessages.PutFullData    -> M_XWR,
         TLMessages.PutPartialData -> M_PWR,
-        TLMessages.ArithmeticData -> MuxLookup(a.param, M_XRD, Array(
+        TLMessages.ArithmeticData -> MuxLookup(a.param, M_XRD)(Array(
           TLAtomics.MIN           -> M_XA_MIN,
           TLAtomics.MAX           -> M_XA_MAX,
           TLAtomics.MINU          -> M_XA_MINU,
           TLAtomics.MAXU          -> M_XA_MAXU,
           TLAtomics.ADD           -> M_XA_ADD)),
-        TLMessages.LogicalData    -> MuxLookup(a.param, M_XRD, Array(
+        TLMessages.LogicalData    -> MuxLookup(a.param, M_XRD)(Array(
           TLAtomics.XOR           -> M_XA_XOR,
           TLAtomics.OR            -> M_XA_OR,
           TLAtomics.AND           -> M_XA_AND,
diff --git a/src/main/scala/tilelink/AtomicAutomata.scala b/src/main/scala/tilelink/AtomicAutomata.scala
index 3bf633db0..37211ba8f 100644
--- a/src/main/scala/tilelink/AtomicAutomata.scala
+++ b/src/main/scala/tilelink/AtomicAutomata.scala
@@ -178,7 +178,7 @@ class TLAtomicAutomata(logical: Boolean = true, arithmetic: Boolean = true, conc
             when (en) {
               r.fifoId := a_fifoId
               r.bits   := in.a.bits
-              r.lut    := MuxLookup(in.a.bits.param(1, 0), 0.U(4.W), Array(
+              r.lut    := MuxLookup(in.a.bits.param(1, 0), 0.U(4.W))(Array(
                 TLAtomics.AND  -> 0x8.U,
                 TLAtomics.OR   -> 0xe.U,
                 TLAtomics.XOR  -> 0x6.U,
diff --git a/src/main/scala/tilelink/Edges.scala b/src/main/scala/tilelink/Edges.scala
index 2c555c03a..2fcb23fc2 100644
--- a/src/main/scala/tilelink/Edges.scala
+++ b/src/main/scala/tilelink/Edges.scala
@@ -4,7 +4,6 @@ package freechips.rocketchip.tilelink
 
 import chisel3._
 import chisel3.util._
-import chisel3.internal.sourceinfo.SourceInfo
 import chisel3.experimental.SourceInfo
 import org.chipsalliance.cde.config.Parameters
 import freechips.rocketchip.util._
@@ -274,17 +273,17 @@ class TLEdge(
 
   // Does the request need T permissions to be executed?
   def needT(a: TLBundleA): Bool = {
-    val acq_needT = MuxLookup(a.param, WireDefault(Bool(), DontCare), Array(
+    val acq_needT = MuxLookup(a.param, WireDefault(Bool(), DontCare))(Array(
       TLPermissions.NtoB -> false.B,
       TLPermissions.NtoT -> true.B,
       TLPermissions.BtoT -> true.B))
-    MuxLookup(a.opcode, WireDefault(Bool(), DontCare), Array(
+    MuxLookup(a.opcode, WireDefault(Bool(), DontCare))(Array(
       TLMessages.PutFullData    -> true.B,
       TLMessages.PutPartialData -> true.B,
       TLMessages.ArithmeticData -> true.B,
       TLMessages.LogicalData    -> true.B,
       TLMessages.Get            -> false.B,
-      TLMessages.Hint           -> MuxLookup(a.param, WireDefault(Bool(), DontCare), Array(
+      TLMessages.Hint           -> MuxLookup(a.param, WireDefault(Bool(), DontCare))(Array(
         TLHints.PREFETCH_READ   -> false.B,
         TLHints.PREFETCH_WRITE  -> true.B)),
       TLMessages.AcquireBlock   -> acq_needT,
diff --git a/src/main/scala/tilelink/Fragmenter.scala b/src/main/scala/tilelink/Fragmenter.scala
index 0aace162b..f522cacbe 100644
--- a/src/main/scala/tilelink/Fragmenter.scala
+++ b/src/main/scala/tilelink/Fragmenter.scala
@@ -275,7 +275,7 @@ class TLFragmenter(val minSize: Int, val maxSize: Int, val alwaysMin: Boolean =
         val maxLgHint        = Mux1H(find, maxLgHints)
 
         val limit = if (alwaysMin) lgMinSize else
-          MuxLookup(in_a.bits.opcode, lgMinSize, Array(
+          MuxLookup(in_a.bits.opcode, lgMinSize)(Array(
             TLMessages.PutFullData    -> maxLgPutFull,
             TLMessages.PutPartialData -> maxLgPutPartial,
             TLMessages.ArithmeticData -> maxLgArithmetic,
diff --git a/src/main/scala/tilelink/Fuzzer.scala b/src/main/scala/tilelink/Fuzzer.scala
index 1b3ed7fee..878b4ae74 100644
--- a/src/main/scala/tilelink/Fuzzer.scala
+++ b/src/main/scala/tilelink/Fuzzer.scala
@@ -180,7 +180,7 @@ class TLFuzzer(
     // Pick a specific message to try to send
     val a_type_sel  = noiseMaker(3, inc, 0)
 
-    val legal = legal_dest && MuxLookup(a_type_sel, glegal, Seq(
+    val legal = legal_dest && MuxLookup(a_type_sel, glegal)(Seq(
       "b000".U -> glegal,
       "b001".U -> (pflegal && !noModify.B),
       "b010".U -> (pplegal && !noModify.B),
@@ -188,7 +188,7 @@ class TLFuzzer(
       "b100".U -> (llegal && !noModify.B),
       "b101".U -> hlegal))
 
-    val bits = MuxLookup(a_type_sel, gbits, Seq(
+    val bits = MuxLookup(a_type_sel, gbits)(Seq(
       "b000".U -> gbits,
       "b001".U -> pfbits,
       "b010".U -> ppbits,
diff --git a/src/main/scala/tilelink/Metadata.scala b/src/main/scala/tilelink/Metadata.scala
index cbd0d8c50..7f4f2854c 100644
--- a/src/main/scala/tilelink/Metadata.scala
+++ b/src/main/scala/tilelink/Metadata.scala
@@ -81,7 +81,7 @@ class ClientMetadata extends Bundle {
     import ClientStates._
     val c = categorize(cmd)
     //assert(c === rd || param === toT, "Client was expecting trunk permissions.")
-    MuxLookup(Cat(c, param), Nothing, Seq(
+    MuxLookup(Cat(c, param), Nothing)(Seq(
     //(effect param) -> (next)
       Cat(rd, toB)   -> Branch,
       Cat(rd, toT)   -> Trunk,
@@ -137,7 +137,7 @@ class ClientMetadata extends Bundle {
   private def cmdToPermCap(cmd: UInt): UInt = {
     import MemoryOpCategories._
     import TLPermissions._
-    MuxLookup(cmd, toN, Seq(
+    MuxLookup(cmd, toN)(Seq(
       M_FLUSH   -> toN,
       M_PRODUCE -> toB,
       M_CLEAN   -> toT))
diff --git a/src/main/scala/util/RecordMap.scala b/src/main/scala/util/RecordMap.scala
index 4dd6bc11a..69c0093f7 100644
--- a/src/main/scala/util/RecordMap.scala
+++ b/src/main/scala/util/RecordMap.scala
@@ -4,8 +4,8 @@ package freechips.rocketchip.util
 
 import chisel3._
 import scala.collection.immutable.ListMap
-import chisel3.internal.requireIsChiselType
-import chisel3.experimental.DataMirror.internal.chiselTypeClone
+import chisel3.experimental.requireIsChiselType
+import chisel3.reflect.DataMirror.internal.chiselTypeClone
 
 final class RecordMap[T <: Data] (eltMap: ListMap[String, T])
     extends Record {
@@ -13,7 +13,7 @@ final class RecordMap[T <: Data] (eltMap: ListMap[String, T])
   eltMap.foreach { case (name, elt) => requireIsChiselType(elt, name) }
 
   // This is needed for Record
-  val elements = ListMap[String, T]() ++ eltMap.mapValues(chiselTypeClone(_).asInstanceOf[T])  // mapValues return value is lazy
+  val elements = ListMap[String, T]() ++ eltMap.view.mapValues(chiselTypeClone(_).asInstanceOf[T])  // mapValues return value is lazy
 
   def apply(x: Int) = elements.values.toSeq(x)
   def apply(x: String) = elements.get(x)
diff --git a/src/main/scala/util/TraceCoreInterface.scala b/src/main/scala/util/TraceCoreInterface.scala
index 6f948e09d..fad9263a4 100644
--- a/src/main/scala/util/TraceCoreInterface.scala
+++ b/src/main/scala/util/TraceCoreInterface.scala
@@ -4,7 +4,6 @@
 package freechips.rocketchip.util
 
 import chisel3._
-import chisel3.experimental.ChiselEnum
 
 // Definitions for Trace core Interface defined in RISC-V Processor Trace Specification V1.0
 object TraceItype extends ChiselEnum {
```
{% endfold %}

最后只要进行将这个 patch 打上就行了：
```shell
cd ysyxSoC/rocket-chip
git apply ../patch/chisel6.patch
```
## 为 SoC 相关代码提供高亮和跳转支持
ysyxSoC 目录中的 soc 文件夹和 chiplink 文件夹中也有 chisel 代码文件，这些代码是需要被拷贝到 rocket-chip 中，参与最终的 verilog 生成。
我选择将这些代码文件夹软连接到 src 中的 ysyx 文件夹中：
```shell
src
└── main
    └── scala
         ├── amba
         │   ├── ahb
         │   ├── apb
         │   ├── axi4
         │   ├── axis
         ├── aop
         ├── chiplink
         ├── devices
         │   ├── debug
         │   └── tilelink
         ├── diplomacy
         ├── examples
         ├── formal
         ├── groundtest
         ├── interrupts
         ├── jtag
         ├── prci
         ├── regmapper
         ├── rocket
         ├── subsystem
         ├── system
         ├── tile
         ├── tilelink
         ├── unittest
         ├── util
         ├── ysyx
         │   ├── chiplink -> ysyxSoC/chiplink
         │   └── soc -> ysyxSoC/soc
         └── ysyxSoC
```
OK，现在所有的代码应该都有高亮和跳转支持了，可以直接通过 mill 生成 IDEA 索引：
```shell
cd ysyxSoC
mill -i mill.idea.GenIdea/idea
```

## 新版本 ysyxSoC 代码导入
yzh 老师在 2024 年 4 月 21 日推送了新版本的 ysyxSoC 框架，新版本的 SoC 框架相较与旧版本有了大量的改动，其结构如下：
```shell
ysyxSoC
├── Makefile
├── build.sc
├── lint // lint 语法检查
│   ├── Makefile
│   ├── README.md
│   └── verilator-warning.txt
├── patch // rocket-chip 补丁
│   └── rocket-chip.patch
├── perip //外设 IP
│   ├── amba
│   ├── bitrev
│   ├── flash
│   ├── gpio
│   ├── ps2
│   ├── psram
│   ├── sdram
│   ├── spi
│   ├── uart16550
│   └── vga
├── rocket-chip
├── spec // cpu 端口规范说明
│   └── cpu-interface.md
└── src // ysyxSoC 代码
    ├── CPU.scala
    ├── SoC.scala
    ├── Top.scala
    ├── amba
    ├── chiplink
    ├── device
    └── util
```
在新版 ysyxSoC 中，我们可以发现 ysyxSoC 的代码被统一移动到了 src 文件夹下（此前分为 chiplink 和 soc 两个文件夹），因此现在我们无需软链接即可生成所有代码的 IDEA 索引。另外工程中也内置了 build.sc，在其中已经将 rocketchip 加入到 MILL 的构建中，并且还声明了一个名为`ysyxsoc`的单例对象（ysyxsoc 中定义了 rocketchip 模块），所以我们在 npc 的 build.sc 中定义这个对象就能导入 ysyxSoC 工程。详细修改如下：
{% fold build.sc %}
```scala
trait NPCModule extends ScalaModule with ScalafmtModule with HasChisel {

  def ysyxModule: ScalaModule // 因为 ysyxSoC 中已经引入了 rocket-chip, 我们只需要定义 ysyxModule 即可

  override def moduleDeps = super.moduleDeps ++ Seq(
    ysyxModule
  )
}

trait Playground extends NPCModule with HasChisel {

  override def millSourcePath = os.pwd

  def ysyxModule = ysyxsoc // 在此处定义 ysyxModule

  override def forkArgs = Seq("-Xmx20G", "-Xss256m")

  override def sources = T.sources {
    super.sources() ++ Seq(PathRef(this.millSourcePath / "playground" / "src"))
  }

  object test extends SbtModuleTests with TestModule.ScalaTest {

    override def forkArgs = Seq("-Xmx20G", "-Xss256m")

    override def sources = T.sources {
      super.sources() ++ Seq(PathRef(this.millSourcePath / "playground" / "test"))
    }

    override def ivyDeps = super.ivyDeps() ++ Agg(
      ivy"edu.berkeley.cs::chiseltest:6.0.0"
    )
}

```
{% endfold %}

另外还需要注意的是 ysyxSoC 中虽然引入了 rocket-chip, 但是并没有采用 Cross Build, 因此如果要采用和上文一样的 Cross Build 方式，则还需要进行更多的修改。

到这里我们就能使用代码高亮和自动跳转啦！Enjoy it ！ :)