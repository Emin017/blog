module.exports = {
  title: "Emin's blog",
  description: "Welcome to Emin's blog",
  theme: "vdoing",
  author: {
    name: "Emin", // 必需
    link: "https://github.com/Emin017", // 可选的
  },
  base: "/blog/", // 这是部署到github相关的配置
  markdown: {
    lineNumbers: true, // 代码块显示行号
    extractHeaders: ["h2", "h3", "h4", "h5", "h6"],
  },
  themeConfig: {
    nav: [
      // 导航栏配置
      { text: "首页", link: "/" },
      { text: "教程搬运", link: "/tutorial/intro/" },
      { text: "学习记录", link: "/study/intro/" },
      { text: "Emin's GitHub", link: "https://github.com/Emin017" },
    ],
    sidebar: "structuring", // 侧边栏配置
  },
};
