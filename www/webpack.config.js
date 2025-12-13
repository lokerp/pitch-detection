const path = require('path');
const CopyWebpackPlugin = require("copy-webpack-plugin");
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin'); // Добавьте этот плагин

module.exports = {
    entry: './index.js', // Измените точку входа
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "bundle.js",
        publicPath: '/'
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.html'
        }),
        new WasmPackPlugin({
            crateDirectory: path.resolve(__dirname, ".."),
            outDir: path.resolve(__dirname, "../pkg"),
        })
    ],
    mode: "development",
    experiments: {
        asyncWebAssembly: true,
    },
    resolve: {
        extensions: ['.js', '.wasm'],
        fallback: {
            "path": false,
            "fs": false
        }
    },
    devServer: {
        static: {
            directory: path.join(__dirname, "dist"),
        },
        compress: true,
        port: 8080,
        historyApiFallback: true,
    },
};