import smart from './index.ts'

const w = smart((w, data) => {
    console.log('This is da worker!')
    console.log(data)
    w.terminate()
    w.emit('evname', 'data', 2, () => {
        // Callback will be called here!
        console.log('CB called!')
    })
    
    w.document().body.append('Hello from the worker!')

    w.fn('myfunc', (d) => {
        console.log('myfunc called with', d)
        return 'Return value of myfunc!'
    })

    w.fn('func2', () => {
        return new Promise(r => setTimeout(r, 1000))
    })
}, [
    'Data from the current file'
])
w.start()
// w.terminate()
w.emit('test')
w.on('evname', (d1, d2, cb) => {
    cb()
})
console.log(await w.fn('myfunc').call(123))

await w.fn('func2').call()



smart(() => {})
    .on('ev1', () => {})
    .start(true)
    .emit('ev2')
    .terminate()