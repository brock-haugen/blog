import Head from "next/head";
import Link from "next/link";

import { getAllPosts } from "../lib/posts";
import Header from "../components/Header";

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
          listening to <a href="https://poolside.fm">Poolside.FM</a>🍹
        </p>
      </div>

      <br />
      <hr />

      <h3>Recent Posts</h3>
      {posts.slice(0, 5).map((p) => (
        <div key={p.slug}>
          <Link href={`/posts/${p.slug}`}>{p.title}</Link>
        </div>
      ))}
    </>
  );
}

export async function getStaticProps({ params }) {
  const posts = getAllPosts(["title", "slug"]);

  return {
    props: {
      posts,
    },
  };
}
