import { type HtmlEscapedString } from "hono/utils/html";

export const fragmentEvent = (
  html: HtmlEscapedString | Promise<HtmlEscapedString>
) => {
  return {
    data: `elements ${html.toString().replaceAll("\n", "")}\n\n`,
    event: "datastar-patch-elements",
  };
};
