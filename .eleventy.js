module.exports = function (eleventyConfig) {
  const seo = require("./src/_lib/seo.cjs");
  eleventyConfig.addFilter("languagePaths", seo.languagePaths);
  eleventyConfig.addFilter("structuredData", seo.structuredData);
  eleventyConfig.addFilter("hasUrl", (entries, url) => entries.some(entry => entry.url === url));
  const buildDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  eleventyConfig.addFilter("sitemapDate", value => {
    if (!value) return buildDate;
    return new Date(value).toISOString().slice(0, 10);
  });
  eleventyConfig.addPassthroughCopy({ "src/3aac8acab19f917768dd101a94ef9a70.txt": "3aac8acab19f917768dd101a94ef9a70.txt" });
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });
  eleventyConfig.addPassthroughCopy({ "src/llms.txt": "llms.txt" });
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy("illustrator-ready-export");
  eleventyConfig.addPassthroughCopy("quiz.html");
  eleventyConfig.addPassthroughCopy("quiz2_1.html");
  eleventyConfig.addPassthroughCopy("quiz2_2.html");
  eleventyConfig.addPassthroughCopy("quiz4.html");
  eleventyConfig.addPassthroughCopy("sounds");
  eleventyConfig.addPassthroughCopy({
    "assets/images/favicon-quiz.png": "assets/images/favicon-quiz.png"
  });

  eleventyConfig.setNunjucksEnvironmentOptions({
    trimBlocks: true,
    lstripBlocks: true
  });

    // Projects collection (all)
  eleventyConfig.addCollection("projects", (collectionApi) => {
    return collectionApi.getFilteredByTag("projects").sort((a, b) => {
      const ad = a.date ? new Date(a.date).getTime() : 0;
      const bd = b.date ? new Date(b.date).getTime() : 0;
      return bd - ad;
    });
  });

  // ✅ Projects (ko)
  eleventyConfig.addCollection("projects_ko", (collectionApi) => {
    return collectionApi.getFilteredByTag("projects")
      .filter((p) => !((p.url || "").startsWith("/en/")))
      .sort((a, b) => {
        const ad = a.date ? new Date(a.date).getTime() : 0;
        const bd = b.date ? new Date(b.date).getTime() : 0;
        return bd - ad;
      });
  });

  // ✅ Projects (en)
  eleventyConfig.addCollection("projects_en", (collectionApi) => {
    return collectionApi.getFilteredByTag("projects")
      .filter((p) => ((p.url || "").startsWith("/en/")))
      .sort((a, b) => {
        const ad = a.date ? new Date(a.date).getTime() : 0;
        const bd = b.date ? new Date(b.date).getTime() : 0;
        return bd - ad;
      });
  });


  return {
    dir: {
      input: "src",
      includes: "_includes",
      output: "dist"
    }
  };
};
