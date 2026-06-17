const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const pluginId = 'itguy-datadog-observability-app';

module.exports = (env = {}) => {
  const isProduction = Boolean(env.production);

  return {
    context: __dirname,
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    entry: {
      module: './src/module.ts',
      'datasource/module': './src/datasource/module.ts',
      'panel/module': './src/panel/module.ts',
    },
    output: {
      clean: {
        keep: /^(.*?_(amd64|arm64|arm)(\.exe)?|go_plugin_build_manifest)$/,
      },
      filename: '[name].js',
      library: {
        type: 'amd',
      },
      path: path.resolve(__dirname, 'dist'),
      publicPath: 'auto',
      uniqueName: pluginId,
    },
    externals: {
      react: 'react',
      'react-dom': 'react-dom',
      '@grafana/data': 'grafana/data',
      '@grafana/runtime': 'grafana/runtime',
      '@grafana/ui': 'grafana/ui',
    },
    module: {
      rules: [
        {
          test: /\.[tj]sx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      modules: [path.resolve(__dirname, 'src'), 'node_modules'],
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'src',
            to: '.',
            globOptions: {
              ignore: ['**/*.ts', '**/*.tsx'],
            },
          },
          {
            from: 'README.md',
            to: 'README.md',
            noErrorOnMissing: true,
          },
        ],
      }),
    ],
  };
};
