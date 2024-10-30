import { convert } from "html-to-text";
import { Suspense } from "react";
import { renderToReadableStream } from "react-dom/server";
import { Options } from "../shared/options";
import { plainTextSelectors } from "../shared/plain-text-selectors";
import { pretty } from "../shared/pretty";

async function streamToString(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let result = "";
  let done: boolean | undefined;

  while (!done) {
    // eslint-disable-next-line no-await-in-loop
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    if (value) {
      result += decoder.decode(value, { stream: !done });
    }
  }

  return result;
}

export async function render(
  element: React.ReactElement,
  options?: Options,
): Promise<string> {
  const suspendedElement = <Suspense>{element}</Suspense>;
  const readableStream = await renderToReadableStream(suspendedElement);
  const html = await streamToString(readableStream);

  if (options?.plainText) {
    return convert(html, {
      selectors: plainTextSelectors,
      ...options.htmlToTextOptions,
    });
  }

  const doctype =
    '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';

  const document = `${doctype}${html.replace(/<!DOCTYPE.*?>/, "")}`;

  if (options?.pretty) {
    return pretty(document);
  }

  return document;
}
