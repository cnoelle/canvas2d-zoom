import path from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import pkg from "resolve-typescript-plugin"; // required for importing .ts files as .js files with webpack https://www.npmjs.com/package/resolve-typescript-plugin 
const ResolveTypeScriptPlugin = pkg.default;

export default {
  entry: {
    bundle: "./src/canvas2d-zoom.ts",
    lineUtils: "./src/LineUtils.ts"
  },
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{
          loader: "ts-loader",
          options: { configFile: path.resolve("./tsconfig.webpack.json")}
        }],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js" ],
    plugins: [new ResolveTypeScriptPlugin()]
  },
  output: {
    filename: "[name].js",
    path: path.resolve("./dist"),
    library: {
      type: "module"
    },
    clean: true
  },
  experiments: {
    outputModule: true
  },
  plugins: [
      new HtmlWebpackPlugin({
          title: "Canvas zoom sample",
          template: "index.html",
          //inject: "body",
          inject: false,
          scriptLoading: "module"
      }),
  ],
  devServer: {
      static: [
          { directory: path.resolve("./dist") }
      ],
      compress: false,
      port: 8080,
  },
}
