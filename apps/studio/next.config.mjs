const staticExport = process.env.PRAGYAN_STATIC_EXPORT === "1";
export default {
  ...(staticExport
    ? { output: "export" }
    : {
        async rewrites() {
          return [
            {
              source: "/api/:path*",
              destination: `${process.env.API_ORIGIN || "http://127.0.0.1:4000"}/api/:path*`,
            },
          ];
        },
      }),
  distDir: staticExport
    ? ".next-static"
    : process.env.NODE_ENV === "development"
      ? ".next-dev"
      : ".next",
  transpilePackages: ["@pragyan/schema", "@pragyan/video"],
  experimental: { externalDir: true },
};
