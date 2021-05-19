import React from "react";
import { BrowserRouter as Router, Link, Route, Switch } from "react-router-dom";
import Markdown from "markdown-to-jsx";

import MarkdownPage from "./MarkdownPage";
import readme from "../../README.md";
import pages from "../pages";
import posts from "../posts";

posts.sort((a, b) => (a.data.date > b.data.date ? 1 : -1));

export default () => (
  <Router>
    <Switch>
      {[...posts, ...pages].map(({ content, data }) => (
        <Route key={data.title} path={data.slug}>
          <MarkdownPage content={content} data={data} />
        </Route>
      ))}
      <Route path="/">
        <div className="markdown-body">
          <Markdown>{readme.content}</Markdown>

          <hr />
          <h3>Recent Posts</h3>
          {posts.map((p) => (
            <Link key={p.data.slug} to={p.data.slug}>
              {p.data.title} <small>({p.data.date})</small>
            </Link>
          ))}
        </div>
      </Route>
    </Switch>
  </Router>
);
