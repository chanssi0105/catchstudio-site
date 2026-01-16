module.exports = class {
  data() {
    return {
      permalink: "/assets/data/projects.json",
      eleventyExcludeFromCollections: true
    };
  }

  render({ collections }) {
    const items = (collections.projects || []).map((p) => ({
      title: p.data.title || "",
      url: p.url || "",
      thumb: p.data.thumb || "",
      year: p.data.year || ""
    }));
    return JSON.stringify(items);
  }
};
