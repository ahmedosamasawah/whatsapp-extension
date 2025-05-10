import fs from "fs";
import copy from "rollup-plugin-copy";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import svelte from "rollup-plugin-svelte";
import terser from "@rollup/plugin-terser";
import postcss from "rollup-plugin-postcss";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";

const entryPoints = [
  { name: "content", path: "src/content/content.js", dir: "content" },
  { name: "popup", path: "src/pages/popup/popup.js", dir: "popup" },
  { name: "options", path: "src/pages/options/options.js", dir: "options" },
  {
    name: "background",
    path: "src/background/background.js",
    dir: "background",
  },
  { name: "hook", path: "src/content/hook.js", dir: "content" },
];

/** @param {string} title @param {string} script */
function createHtml(title, script) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="${script}.css">
</head>
<body>
  <div id="whatsapp-transcriber-app"></div>
  <script src="${script}.js"></script>
</body>
</html>`;
}

function writeHtmlFile(dir, filename, content) {
  return {
    writeBundle() {
      if (!fs.existsSync(`dist/${dir}`))
        fs.mkdirSync(`dist/${dir}`, { recursive: true });

      fs.writeFileSync(`dist/${dir}/${filename}`, content);
    },
  };
}

export default entryPoints.map((entry) => {
  return {
    input: entry.path,
    output: {
      sourcemap: process.env.NODE_ENV !== "production",
      format: "iife",
      name: entry.name,
      file: `dist/${entry.dir}/${entry.name}.js`,
    },
    plugins: [
      svelte({
        compilerOptions: {
          css: false,
        },
      }),

      postcss({
        plugins: [tailwindcss(), autoprefixer()],
        extract: `${entry.name}.css`,
        minimize: process.env.NODE_ENV === "production",
        inject: false,
      }),

      resolve({
        browser: true,
        dedupe: ["svelte"],
      }),

      commonjs(),

      process.env.NODE_ENV === "production" && terser(),

      copy({
        targets: [
          { src: "public/manifest.json", dest: "dist" },
          { src: "public/assets", dest: "dist" },
          { src: "public/fonts", dest: "dist" },
        ],
      }),

      ...(entry.name === "popup"
        ? [
            writeHtmlFile(
              "popup",
              "popup.html",
              createHtml("WhatsApp AI Transcriber Plus", "popup")
            ),
          ]
        : []),
      ...(entry.name === "options"
        ? [
            writeHtmlFile(
              "options",
              "options.html",
              createHtml("WhatsApp AI Transcriber Plus Settings", "options")
            ),
          ]
        : []),
    ].filter(Boolean),
    watch: {
      clearScreen: false,
    },
  };
});
