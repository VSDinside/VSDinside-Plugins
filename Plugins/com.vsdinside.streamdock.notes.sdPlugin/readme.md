## 目录结构

```
com.vsdinside.streamdock.notes.sdPlugin          插件根目录
                     |
                     |--- plugin\              插件进程端目录，使用 tauri 编写，是一个 tauri 模板项目目录
                     |       |
                     |       |--- src\         tauri 模板项目的前端目录
                     |       |--- src-tauri\   tauri 模板项目的 rust 后端目录
                     |
                     |--- propertyInspector\   属性检查器端目录，使用原生 js 编写
                     |--- scripts\             脚本目录
                     |--- static\              静态资源目录
```

## 使用方式（仅支持 windows）

### 1. 克隆至本地，进入插件进程端目录，构建 tauri 项目

```shell
cd .\plugin\

npm install

npm run tauri build
```

### 2. 构建完成后，打开 Stream Dock
