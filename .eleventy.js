module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

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