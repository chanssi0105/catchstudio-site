function languagePaths(url = "/") {
  const isEn = url.startsWith("/en/");
  const ko = isEn ? url.slice(3) : url;
  return { isEn, ko, en: `/en${ko}` };
}

function serialize(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

function website(site, inLanguage) {
  return {
    "@type": "WebSite", "@id": `${site.url}/#website`, name: site.name,
    alternateName: site.alternateName, url: `${site.url}/`, inLanguage
  };
}

function structuredData(page, site, services, title, description, isProject, caseStudy, thumb) {
  const paths = languagePaths(page.url);
  const lang = paths.isEn ? "en" : "ko";
  const language = paths.isEn ? "en" : "ko-KR";
  const base = site.url;
  const orgId = `${base}/#organization`;
  const url = base + page.url;
  const serviceItems = services.map(service => ({
    "@type": "Service",
    "@id": `${base}/#service-${service.id}`,
    name: service.name[lang],
    description: service.description[lang],
    provider: { "@id": orgId }
  }));
  const graph = [website(site, language)];
  if (["/", "/about/", "/contact/"].includes(paths.ko)) {
    graph.push({
      "@type": ["ProfessionalService", "Organization"], "@id": orgId,
      name: site.name, alternateName: site.alternateName, url: `${base}/`,
      logo: base + site.logo, image: base + site.defaultOgImage,
      description: site.defaultDescription, email: site.email,
      telephone: site.telephone, areaServed: site.areaServed,
      knowsAbout: services.map(service => service.name[lang]),
      hasOfferCatalog: { "@type": "OfferCatalog", name: lang === "en" ? "Design services" : "디자인 서비스",
        itemListElement: serviceItems.map(service => ({ "@type": "Offer", itemOffered: service })) }
    });
  }
  const breadcrumb = items => ({
    "@type": "BreadcrumbList", "@id": `${url}#breadcrumbs`,
    itemListElement: items.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item }))
  });
  const home = [lang === "en" ? "Home" : "홈", `${base}${paths.isEn ? "/en/" : "/"}`];
  if (isProject && caseStudy) {
    graph.push({
      "@type": "CreativeWork", "@id": `${url}#work`, name: title, description,
      dateCreated: String(caseStudy.year), creator: { "@id": orgId },
      about: { "@type": "Organization", name: caseStudy.client },
      genre: caseStudy.type, image: base + thumb, url
    });
    graph.push(breadcrumb([home,
      [lang === "en" ? "Projects" : "프로젝트", `${base}${paths.isEn ? "/en" : ""}/projects/`],
      [title, url]]));
  }
  return serialize({ "@context": "https://schema.org", "@graph": graph });
}

module.exports = { languagePaths, structuredData, website, serialize };
