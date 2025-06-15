const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Debug logs
console.log('Current working directory:', process.cwd());
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Looking for .env file at:', path.resolve(__dirname, '.env'));
console.log('Does .env file exist?', require('fs').existsSync(path.resolve(__dirname, '.env')));
console.log('First few characters of .env file:', require('fs').readFileSync(path.resolve(__dirname, '.env'), 'utf8').substring(0, 30));

// Define environment variables
const env = {
    GOOGLE_DRIVE_API_KEY: JSON.stringify(process.env.GOOGLE_DRIVE_API_KEY || ''),
    OPENAI_API_KEY: JSON.stringify(process.env.OPENAI_API_KEY || ''),
    GOOGLE_DRIVE_CLIENT_ID: JSON.stringify(process.env.GOOGLE_DRIVE_CLIENT_ID || ''),
    GOOGLE_DRIVE_CLIENT_SECRET: JSON.stringify(process.env.GOOGLE_DRIVE_CLIENT_SECRET || '')
};

// Log environment variables
console.log('Environment variables loaded:');
console.log('GOOGLE_DRIVE_API_KEY exists:', !!process.env.GOOGLE_DRIVE_API_KEY);
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('GOOGLE_DRIVE_CLIENT_ID exists:', !!process.env.GOOGLE_DRIVE_CLIENT_ID);
console.log('GOOGLE_DRIVE_CLIENT_SECRET exists:', !!process.env.GOOGLE_DRIVE_CLIENT_SECRET);

// Read and process manifest.json
const manifestPath = path.resolve(__dirname, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Replace the client ID placeholder with the actual value
if (manifest.oauth2 && manifest.oauth2.client_id === '${GOOGLE_DRIVE_CLIENT_ID}') {
    manifest.oauth2.client_id = process.env.GOOGLE_DRIVE_CLIENT_ID;
    console.log('Updated manifest.json with client ID:', process.env.GOOGLE_DRIVE_CLIENT_ID);
}

module.exports = {
    mode: 'production',
    entry: {
        background: './background.js',
        sidepanel: './sidepanel.js',
        config: './config.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        clean: true
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': env
        }),
        new CopyPlugin({
            patterns: [
                { 
                    from: 'manifest.json',
                    transform(content) {
                        return Buffer.from(JSON.stringify(manifest, null, 2));
                    }
                },
                { from: 'sidepanel.html' },
                { from: 'styles.css' },
                { from: 'icons', to: 'icons' },
                { from: 'evaluation', to: 'evaluation' }
            ]
        })
    ],
    resolve: {
        extensions: ['.js']
    },
    optimization: {
        minimize: true
    }
}; 