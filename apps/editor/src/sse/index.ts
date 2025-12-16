import { type HtmlEscapedString } from "hono/utils/html";

export const fragmentEvent = (
  html: HtmlEscapedString | Promise<HtmlEscapedString> | null
) => {
  if (html === null) {
    return {
      data: "",
      event: "datastar-patch-elements",
    };
  }

  return {
    data: [`elements ${html.toString().replaceAll("\n", "\nelements ")}`].join(
      "\n"
    ),
    event: "datastar-patch-elements",
  };
};

export const redirectEvent = (url: string) => {
  return {
    data: [
      "mode append",
      "selector body",
      `elements <script>window.location = "${url}"</script>
`,
    ].join("\n"),
    event: "datastar-patch-elements",
  };
};
