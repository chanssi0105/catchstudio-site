module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  eleventyConfig.setNunjucksEnvironmentOptions({
    trimBlocks: true,
    lstripBlocks: true
  });

  // Projects collection (tags: "projects" 붙은 콘텐츠를 모음)
  eleventyConfig.addCollection("projects", (collectionApi) => {
    return collectionApi.getFilteredByTag("projects").sort((a, b) => {
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