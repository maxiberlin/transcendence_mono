/** @type {import('vite').UserConfig} */
export default {
  // Specify the root directory of your project

  // Specify the public directory (optional)
  publicDir: './public',

  // Specify the output directory for the build (optional)
  build: {
    outDir: './dist',
    // Specify the target environment (e.g., 'esnext', 'es2015')
    target: 'esnext',

    // Enable/disable minification (default: 'terser')
    // minify: 'terser',

    // Enable/disable CSS code splitting (default: true)
    cssCodeSplit: true

    // Add any additional build options here
    // ...
  },

  // Configure the server options (optional)
  // server: {
  //     port: 3000,
  // },

  // Add any additional plugins or configurations here
  plugins: []

}
