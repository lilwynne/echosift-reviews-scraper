import { pathToFileURL } from "node:url";

const projectRoot = new URL("../", import.meta.url);

function resolveProjectFile(pathname) {
  const hasExtension = /\.[a-z0-9]+$/i.test(pathname);
  const normalizedPath = hasExtension ? pathname : `${pathname}.ts`;

  return new URL(normalizedPath, projectRoot).href;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/server") {
    return {
      shortCircuit: true,
      url: pathToFileURL(
        new URL("../node_modules/next/server.js", import.meta.url).pathname
      ).href
    };
  }

  if (specifier.startsWith("@/")) {
    return {
      shortCircuit: true,
      url: resolveProjectFile(specifier.slice(2))
    };
  }

  return nextResolve(specifier, context);
}
