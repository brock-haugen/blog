import { useRouter } from "next/router";
import ErrorPage from "next/error";

import { getAllPosts, getPostBySlug } from "../../lib/posts";
import Header from "../../components/Header";
import markdownToHtml from "../../lib/markdown";

export default function Post({ post }) {
  const router = useRouter();
  if (!router.isFallback && !post?.slug) {
    return <ErrorPage statusCode={404} />;
  }

  return (
    <>
      {router.isFallback ? (
        <>Loading…</>
      ) : (
        <>
          <Header {...post} />
          {post.image &&
            (post.imageStretch ? (
              <img src={post.image} width="100%" />
            ) : (
              <div
                style={{
                  paddingBottom: "50%",
                  position: "relative",
                  width: "100%",
                }}
              >
                <img
                  src={post.image}
                  style={{
                    display: "block",
                    height: 0,
                    margin: "auto",
                    maxHeight: "100%",
                    maxWidth: "100%",
                    minHeight: "100%",
                    minWidth: "100%",
                    objectFit: "contain",
                    objectPosition: "center center",
                    padding: 0,
                    position: "absolute",
                    width: 0,
                  }}
                />
              </div>
            ))}
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </>
      )}
    </>
  );
}

export async function getStaticProps({ params }) {
  const post = getPostBySlug(params.slug, [
    "content",
    "date",
    "image",
    "imageStretch",
    "slug",
    "title",
  ]);
  const content = await markdownToHtml(post.content || "");

  return {
    props: {
      post: {
        ...post,
        content,
      },
    },
  };
}

export async function getStaticPaths() {
  const posts = getAllPosts(["slug"]);

  return {
    paths: posts.map((post) => {
      return {
        params: {
          slug: post.slug,
        },
      };
    }),
    fallback: false,
  };
}
