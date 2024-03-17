---
title: AWS服务器训练深度学习模型(Yolov5)
date: 2024-03-16 16:43:14
permalink: /pages/yolov5/
categories:
  - study
  - yolov5
tags:
  - 
---
# AWS服务器训练深度学习模型(以Yolov5为例)

大二时候学习了深度学习后，开始上手自己训练模型。在训练过几个模型后，觉得使用自己的笔记本训练模型算力实在是吃紧(后来还导致笔记本烧主板)，于是租用了AWS服务器进行模型训练。
参考了李沐老师的[视频](https://www.bilibili.com/video/BV1MA411L78X?spm_id_from=333.999.0.0&vd_source=40f1ef60578ccbbc14f177e18d61fda6)
::: tip
现在回过头来看，还是用Google的Colab会员训练似乎更划算一些，能租到A100和T4，费用也不算太离谱
:::

<aside>
💡 出于经费限制，我当时选择了最低配置的服务器，不过对于训练数据集较大的情况下, 服务器的内存或显存大小可能会影响模型的训练速度, 当然选择更好的配置也会增加费用
</aside>

## 购买AWS服务器
1. 注册AWS账号
    
    [AWS Console控制台_亚马逊云管理控制台-AWS云服务](https://aws.amazon.com/cn/console/)
    
    <aside>
    💡 申请实例数量需要经过亚马逊人工审核 较耗时
    
    </aside>
    
2. 配置服务器类型

    系统Ubuntu
    
    ![选择系统类型](https://emin-blog.oss-cn-shanghai.aliyuncs.com/img/yolov5_0.png)
    
    较便宜GPU类型：g4dn
    
    ![选择实例类型](https://emin-blog.oss-cn-shanghai.aliyuncs.com/img/yolov5_1.png)
    
    - 查看配置和价格网站
        
        [Amazon EC2 Instance Comparison](https://instances.vantage.sh)
        
    
    存储从8GB改为20GB或者更大
    
    ![选择存储](https://emin-blog.oss-cn-shanghai.aliyuncs.com/img/yolov5_2.png)

    
    选择密钥(没有密匙的话可以新建一个)
    
    ![选择密匙](https://emin-blog.oss-cn-shanghai.aliyuncs.com/img/yolov5_3.png)
    

复制ip地址

## 登陆服务器并配置环境
### 登陆服务器
- SSH连接到服务器
    
    先修改权限 连接服务器
    
    ```shell
    #更改密钥权限
    chmod 400 Downloads/key.pem
    #连接服务器
    ssh -i Downloads/key.pem ubuntu@***.***.***
    #更新软件源
    sudo apt-get update
    #安装必要依赖包
    sudo apt-get install build-essential
    sudo apt-get install unzip
    ```
    

### 安装CUDA环境
去英伟达官网下载cuda

[CUDA Toolkit 11.7 Downloads](https://developer.nvidia.com/cuda-downloads)

```shell
#安装cuda
sudo sh cuda.***.run
#选择accept然后install
vim .bashrc #我倾向于使用vim来编辑，选择一个自己熟悉的文本编辑器即可
#shift+g “G”跳到最后一行
LD_library_PATH=/usr/local/cuda-11.2/lib64

```

### 安装miniconda
去miniconda官网获取安装链接(根据服务器的架构选择对应的安装包，一般x86的linux机器选择linux64bit即可，arm则对应aarch64)

[Miniconda - Conda documentation](https://docs.conda.io/en/latest/miniconda.html#linux-installers)

```shell
#运行sh文件 安装
bash Miniconda3 Linux py39_4.9.2-linu-x86_64.sh
#按q跳过阅读 全程输入yes同意协议
#激活环境
bash
#新建环境
conda create -n yolo python=3.8 pip
conda activate yolo
```

### 安装pytorch
去官网获取pytorch下载链接（Stable -Linux-Pip-python-CUDA11.*）

[PyTorch](https://pytorch.org/get-started/locally/)

```shell
pip3 install torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cu116
pip install -U jupyter
```

### 上传代码
git下载Yolov5代码 上传jupyter notebook代码

[GitHub - ultralytics/yolov5: YOLOv5 🚀 in PyTorch > ONNX > CoreML > TFLite](https://github.com/ultralytics/yolov5)

```shell
git https://github.com/ultralytics/yolov5.git
pip install -r requirements.txt
jupyter notebook
ssh -i Downloads/key.pem -L888:locahost:8888 ubuntu@****.****.***
#上传代码即可开始训练
```

<aside>
💡 注意密钥的权限限制 此外Yolov5的代码仍需要进行一定的修改才能进行训练
</aside>

### 开始训练
接下来就是开始训练模型了，第一次训练模型的时候完全不懂怎么训练，使用了质量不高的Dataset，导致模型在测试集上的表现一直提不上去，就算使用了Data Augment和Dropout这些方法也无济于事,此外也尝试过使用迁移学习的一些方法，冻结部分网络结构的权重再进行针对性的训练，但是最终结果都还是不够理想。

后来发现了[Roboflow](https://universe.roboflow.com/)这个网站上有大量的图像数据集，而且有Health Check功能，可以提前判断数据集的质量。最终找到一个质量还算比较好的数据集，最后还是训练出了比较满意的结果(不过和那些SOTA模型还是没法比的hhhh)