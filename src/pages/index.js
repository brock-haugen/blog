const posts = Object.entries({
  whoami: require("./whoami.md"),
}).map(([fp, { data, content }]) => {
  data.slug = `/${fp}`;
  data.title =
    data.title ||
    fp
      .split(".")
      .pop()
      .split("-")
      .map((s) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`)
      .join(" ");

  return { content, data };
});

export default posts;
