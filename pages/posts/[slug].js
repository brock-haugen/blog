import { useRouter } from "next/router";
import ErrorPage from "next/error";
import Image from "next/image";

import { getAllPosts, getPostBySlug } from "../../lib/posts";
import Header from "../../components/Header";
import markdownToHtml from "../../lib/markdown";

export default function Post({ post, preview }) {
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
                <Image
                  src={post.image}
                  layout="fill"
                  objectFit="contain"
                  objectPosition="center"
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
