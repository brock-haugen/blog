import Markdown from 'markdown-to-jsx';
import React from 'react';
import { render } from 'react-dom';

import { content, data } from "./file.md";

console.log(data);

render(<Markdown>{content}</Markdown>, document.getElementById("root"));