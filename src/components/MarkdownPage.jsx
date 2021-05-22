import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { HeadProvider, Title } from "react-head";
import Markdown from "markdown-to-jsx";

export default ({ content, data }) => {
  useEffect(() => {
    window.hljs.highlightAll();
  }, []);

  return (
    <div className="post markdown-body">
      <HeadProvider>
        <Title>{data.title}</Title>
      </HeadProvider>

      <Link to="/">Home</Link>

      <Markdown>{content}</Markdown>
    </div>
  );
};
