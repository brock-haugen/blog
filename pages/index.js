import Head from "next/head";

import { getAllPosts } from "../lib/posts";

export default function HomePage({ posts }) {
  return (
    <>
      <Head>
        <title>I'd Rather Be Running</title>
      </Head>

      <div>
        <h1>I'd Rather Be Running</h1>
        <p>
          <em>
            An uninspired collection of ramblings from a biased perspective
          </em>
        </p>
        <p>
          Written by <a href="/whoami">Brock</a> in{" "}
          <a href="https://en.wikipedia.org/wiki/Markdown">Markdown</a> while
          listening to <a href="https://poolside.fm">Poolside.FM</a>🍹. Deployed
          via <a href="https://ipfs.io">IPFS</a>.
        </p>
      </div>

      <br />
      <hr />

      <h3>Recent Posts</h3>
      {posts.slice(0, 5).map((p) => (
        <div key={p.slug}>
          <a
            href={`/posts/${p.slug}${
              process.env.NODE_ENV === "development" ? "" : ".html"
            }`}
          >{`${new Date(p.date).toLocaleDateString()} - ${p.title}`}</a>
        </div>
      ))}
    </>
  );
}

export async function getStaticProps() {
  const posts = getAllPosts(["title", "slug"]);

  return {
    props: {
      posts,
    },
  };
}
