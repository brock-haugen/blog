import Head from "next/head";
import Link from "next/link";

export default function Headers({ date, ogImage, title }) {
  return (
    <>
      <Head>
        <title>{title} | I'd Rather Be Running</title>
        <meta property="og:image" content={ogImage?.url} />
      </Head>

      <div>
        <Link href="/">Home</Link>
      </div>

      <h1 className="title">{title}</h1>
      {date && <small>{new Date(date).toLocaleDateString()}</small>}
      <hr />
      <br />
    </>
  );
}
