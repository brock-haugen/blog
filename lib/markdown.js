import { remark } from "remark";
import remarkEmoji from "remark-emoji";
import remarkHtml from "remark-html";
import remarkPrism from "remark-prism";

export default async function markdownToHtml(markdown) {
  const result = await remark()
    .use(remarkHtml, { sanitize: false })
    .use(remarkPrism)
    .use(remarkEmoji)
    .process(markdown);
  return result.toString();
}
