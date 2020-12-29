import typescript from "rollup-plugin-typescript"

export default {
    input: 'src/index.ts',
    output: [
        { name: 'rsf', file: 'lib/rsf.js', format: 'cjs', sourcemap: true },
        { name: 'rsf', file: 'lib/rsf.esm.js', format: 'umd', sourcemap: true }
    ],
    plugins: [
        typescript({
            exclude: 'node_modules/**',
            typescript: require('typescript')
        })
    ]
}