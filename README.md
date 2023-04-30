# work-smart
 Make Web Workers fun again 🚀

# Features
- 👌 Function based workers
- ♾️ Easy to use event system instead of postMessage
- 📲 Use callback functions
- 📦 Export worker functions
- 🟦 Typescript compatible

# Why?
**When you are using Web Workers without work-smart you**
- ➡️ Need to create a separate file for each worker
- ➡️ Can't easily pass in data from the main thread
- ➡️ Have to deal with postMessage() all the time
- ➡️ Can't use a nice event system
- ➡️ Can't pass in callback functions
- ➡️ Can't call worker functions from the main thread
  
# Installation
Expecting you are using a module bundler, run:
```sh
npm i -D work-smart
```
And you are good to go!

# Usage
First import the smart function:
```js
import smart from 'work-smart'
```

Because work-smart is designed to use function based worker, you create a worker like this:
```js
const worker = smart((self) => {
    // This code will run in a web worker 👍
})

// Run the worker
worker.start()
```

## Passing in arguments
Because the worker runs in a separate thread, it has no access to variables or functions defined  outside of the function. However if you want to pass in variables or functions from the main thread, you can do that easily:
```js
function myFunc() {
    console.log('🚀')
}

smart((self, myStr, myFunc) => {
    console.log(myStr)
    myFunc()
}, [
    'This variable is from the main scope!',
    myFunc
])
```
Just make sure that the functions don't rely on other functions outside of their scope.

## Terminating a worker
If you want to stop a worker form doing what it's currently doing, you can terminate it.

**Inside the worker:**
```js
smart(self => {
    // It's also best practice to add this add the end of each worker function
    self.terminate()
})
```

**Inside the main thread:**
```js
const worker = smart(() => {})
worker.terminate()
```

## The event system
If you want to share data between the worker and the main thread, you can use the event system. Here is an example script:
```js
const worker = smart((self) => {
    self.on('my-event', () => {
        console.log('Event was dispatched')
    })
})

worker
    .start()
    .emit('my-event')
```

You can pass data too:
```js
const worker = smart((self) => {
    self.on('my-event', (data1, data2) => {
        console.log(data1, data2)
    })
})

worker
    .start()
    .emit('my-event', 123, 'hello')
```

Or define a listener in the main thread:
```js
const worker = smart((self) => {
    self.emit('my-event', 123, 'hello')
})

worker
    .start()
    .on('my-event', (data1, data2) => {
        console.log(data1, data2)
    })
```

However, one of work-smart's key features are callback function
```js
const worker = smart((self) => {
    self.emit('do-something-in-main', (arg) => {
        // This is a callback function
        console.log('CB:', arg)
    })
})
worker.on('do-something-in-main', (cb) => {
    cb('Test!')
})
worker.start()
```
Callback functions are executed where they were defined, but can use arguments from the other thread.
If you have used socket.io, this is going to feel familiar.

You can also get the return value of a callback function by awaiting them:
```js
const worker = smart((self) => {
    self.emit('do-something-in-main', () => {
        // This is a callback function
        return 'Test!'
    })
})
worker.on('do-something-in-main', async (cb) => {
    console.log(await cb())
})
worker.start()
```

This even works with async functions:
```js
const worker = smart((self) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms))
    
    self.emit('do-something-in-main', async () => {
        // This is a callback function
        await sleep(1000)
        return 'Test!'
    })
})
worker.on('do-something-in-main', async (cb) => {
    console.log(await cb())
})
worker.start()
```

## Worker functions
You might want your worker to different tasks, whenever requested by the main thread. Instead of having to deal with events, you could also create worker functions, which can be called by the main thread:
```js
const worker = smart(self => {
    // Initialize a function called myfunc
    self.fn('myfunc', (arg) => {
        console.log(arg)
    })
})
worker.start()

// Call the myfunc function with "Hello World!" as an argument
worker.fn('myfunc').call('Hello World!')
```

As always you can use return values by awaiting the function call.
```js
const worker = smart(self => {
    // Initialize a function called myfunc
    self.fn('myfunc', (arg) => {
       return arg
    })
})
worker.start()

// Call the myfunc function with "Hello World!" as an argument
console.log(await worker.fn('myfunc').call('Hello World!'))
```

This will work with async functions too, but you probably are already aware of this.

## ESM mode
If you want you worker to be of type `module`, you can just pass **true** as the first argument to the worker.start function:
```js
worker.start(true)
```
However, I didn't notice a difference between those two yet.

# How does it work?
When you create a SmartWorker, a [data url](https://developer.mozilla.org/en-US/docs/web/http/basics_of_http/data_urls) will be created based on your worker function. As soon as you call worker.start(), a Web Worker get's created based on this url.

All of the other nice features are just fancy API wrappers for postMessage(). All your events and data will be encoded into the WSETP (Work Smart Event Transfer Protocol). If you want to read more about that, take a look at the [specification](/WSETP-Specification.md). Your data will be serialized using JSON, and for callback functions a wrapper is created, which stores a call id and transmits arguments and return values over the WSETP. Even Worker Functions are just an abstraction of the WSETP.