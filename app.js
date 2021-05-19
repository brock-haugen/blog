import Markdown from "markdown-to-jsx";
import React from "react";
import { BrowserRouter as Router, Link, Route, Switch } from "react-router-dom";
import { render } from "react-dom";
import { HeadProvider, Title } from "react-head";

import home from "./posts/_home.md";
import posts from "./posts/_index";

posts.sort((a, b) => (a.data.date > b.data.date ? 1 : -1));

const Post = ({ content, data }) => (
  <div className="post markdown-body">
    <HeadProvider>
      <Title>{data.title}</Title>
    </HeadProvider>

    <Link to="/">Home</Link>

    <Markdown>{content}</Markdown>
  </div>
);

const App = () => (
  <Router>
    <Switch>
      {posts.map(({ content, data }) => (
        <Route key={data.title} path={data.slug}>
          <Post content={content} data={data} />
        </Route>
      ))}
      <Route path="/">
        <div className="markdown-body">
          <Markdown>{home.content}</Markdown>

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

render(<App />, document.getElementById("root"));
