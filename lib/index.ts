declare global {
    interface Window {
        __func_hooks__: Function[]
    }
}

/**
 * Creates a WebWorker
 * @param fn WebWorker function to be executed in seperate thread
 * @returns {SmartWorker} SmartWorker object
 */
function smart<F extends (worker: WorkerSelf) => any>(fn: F): SmartWorker;
/**
 * Creates a WebWorker
 * @param fn WebWorker function to be executed in seperate thread
 * @param args Arguments that will be passed into the worker function
 * @returns {SmartWorker} SmartWorker object
 */
function smart<F extends (worker: WorkerSelf, ...args: any[]) => any>(fn: F, args: Parameters<F>): SmartWorker;

/** Code **/
function smart(fn: Function, args: any[] = []): SmartWorker {
    if (typeof (Worker) !== 'undefined') {
        const url = funcToDataUrl(fn, args)
        let worker: Worker | null = null
        let wsrh: Function[] = []
        const swo: SmartWorker = {
            start (enableESM = false) {
                worker = new Worker(url, {
                    type: enableESM ? 'module' : 'classic',
                    name: 'SmartWorker'
                })
                wsrh.forEach(el => {
                    worker?.addEventListener('message', e => {
                        el(e)
                    })
                })

                worker.addEventListener('message', ({ data: msg}) => {
                    // Handles callback functions
                    if (msg.startsWith('F')) {
                        // Callback function
                        const parsed = __decodeF_WSETP(msg)
                        const fn = window.__func_hooks__[parsed.fIndex]
                        const rv = fn(...parsed.args)
                        if (rv instanceof Promise) {
                            rv.then(rrv => {
                                worker?.postMessage(__createReturnValue_WSETP(
                                    'F',
                                    parsed.fcid,
                                    rrv
                                ))
                            }).catch(rrv => {
                                worker?.postMessage(__createReturnValue_WSETP(
                                    'F',
                                    parsed.fcid,
                                    rrv
                                ))
                            })
                        } else {
                            worker?.postMessage(__createReturnValue_WSETP(
                                'F',
                                parsed.fcid,
                                rv
                            ))
                        }
                    } else if (msg.startsWith('R')) {
                        // Received return value
                        // TODO:
                    } else if (msg.startsWith('D')) {
                        const parsed = __decodeD_WSETP(msg)
                        if (parsed.eventName === '$WSETP_TERMINATE') {
                            worker?.terminate()
                        }
                    }
                })

                wsrh = []
                return swo
            },
            terminate () {
                worker?.terminate()
                return swo
            },
            emit(event, ...data) {
                worker?.postMessage(__encode_D_WSETP(event, data))
                return swo
            },
            on(event, handler) {
                const el = ({ data: msg }: MessageEvent<string>) => {
                    if (msg.startsWith('D')) {
                        const parsed = __decodeD_WSETP(msg)
                        // Normal event message
                        if (event === parsed.eventName) {
                            handler(...parsed.data)
                        }
                    }
                }
                if (!worker) wsrh.push(el)
                worker?.addEventListener('message', el)
                return swo
            },
            fn (name) {
                return {
                    call (...args) {
                        return new Promise((resolve, reject) => {
                            // TODO:
                        })
                    }
                }
            }
        }
        return swo
    } else {
        throw new Error('Browser doesn\'t support WebWorkers!')
    }
}

if (!window.__func_hooks__) window.__func_hooks__ = []

function __encode_data_only_fwsetp__(doarray: any[], _fhooks: any[]) {
    function __serializer(d: any) {
        if (typeof d === 'function') {
            return `@FUNC&${_fhooks.push(d) - 1}`
        } else if (d instanceof Date) {
            return `@DATE&${d.toISOString()}`
        } else {
            return JSON.stringify(d)
        }
    }

    return doarray.map(__serializer).map((e, i) => `D${i}=${encodeURIComponent(e)}`).join(';')
}

function __decodeD_WSETP (data: string) {
    function __uuid__() {
        // @ts-expect-error
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        ) + '-' + Date.now()
    }

    const segments = data.split(';').filter(e => e !== '')
    const versionHeader = segments[0]
    const eventName = decodeURIComponent(segments[1].split('=')[1])
    const dataLength = parseInt(decodeURIComponent(segments[2].split('=')[1]))
    const dataSegments = segments.slice(3)
    const ETI = segments[0].substring(0, 1)
    const datav: any[] = []

    let _fhooks: any[] = []
    try {
        // @ts-expect-error
        _fhooks = __func_hooks__
    } catch {
        if (!window.__func_hooks__) window.__func_hooks__ = []
        _fhooks = window.__func_hooks__
    }
    if (!(_fhooks instanceof Array)) _fhooks = []

    dataSegments.forEach(element => {
        const index = parseInt(element.split('=')[0].replace(/[^\d.]/g, ''))
        const rawData = decodeURIComponent(element.split('=')[1])

        if (rawData.startsWith('@DATE&')) {
            // Date
            datav[index] = new Date(rawData.substring(6))
        } else if (rawData.startsWith('@FUNC&')) {
            // Callback function
            const cbfIndex = parseInt(rawData.substring(6))
            datav[index] = function () {
                var args = Array.from(arguments)
                return [
                    'SEND_CALLBACK_WSETP',
                    `F_WSETP1.0;EV=CBC_${cbfIndex}_${__uuid__()};DL=${args.length};${__encode_data_only_fwsetp__(args, _fhooks)}`
                ]
            }
        } else {
            datav[index] = JSON.parse(rawData)
        }
    })

    return {
        eventName,
        dataLength,
        versionHeader,
        data: datav,
        eventTypeIdentifier: ETI
    }
}

function __decodeF_WSETP (data: string) {
    const decoded = __decodeD_WSETP(data)
    const fIndex = parseInt(decoded.eventName.split('_')[1])
    const fcid = decoded.eventName.split('_')[2]

    return {
        fIndex,
        fcid,
        args: decoded.data
    }
}

function __decodeC_WSETP (data: string) {
    const decoded = __decodeD_WSETP(data)
    const fname = decoded.eventName.split('_')[0]
    const fcid = decoded.eventName.split('_')[1]

    return {
        fname,
        fcid,
        args: decoded.data
    }
}

function __decodeR_WSETP (data: string) {
    const decoded = __decodeD_WSETP(data)
    const callETI = decoded.eventName.split('_')[0]
    const fcid = decoded.eventName.split('_')[1]

    return {
        callETI,
        returnValue: decoded.data[0],
        fcid
    }
}

function __createReturnValue_WSETP (callETI: 'F' | 'C', fcid: string, retVal: any) {
    let _fhooks: any[] = []
    try {
        // @ts-expect-error
        _fhooks = __func_hooks__
    } catch {
        if (!window.__func_hooks__) window.__func_hooks__ = []
        _fhooks = window.__func_hooks__
    }
    if (!(_fhooks instanceof Array)) _fhooks = []
    return `R_WSETP1.0;EV=${callETI}_${encodeURIComponent(fcid)};DL=1;${__encode_data_only_fwsetp__([retVal], _fhooks)}`
}

function __encode_D_WSETP (ev: string, data: any[]) {
    let _fhooks: any[] = []
    try {
        // @ts-expect-error
        _fhooks = __func_hooks__
    } catch {
        if (!window.__func_hooks__) window.__func_hooks__ = []
        _fhooks = window.__func_hooks__
    }
    if (!(_fhooks instanceof Array)) _fhooks = []
    return `D_WSETP1.0;EV=${encodeURIComponent(ev)};DL=${data.length};${__encode_data_only_fwsetp__(data, _fhooks)}`
}

function funcToDataUrl(func: Function, data?: any[]) {
    if (!(data instanceof Array)) data = []

    const workerSelfCode = `var __func_hooks__=[];var __fns__={};
${__encode_data_only_fwsetp__};${__decodeD_WSETP};${__decodeF_WSETP};
${__decodeC_WSETP};${__decodeR_WSETP};${__createReturnValue_WSETP};${__encode_D_WSETP};
function __emit_ev__(evname){
    var data=Array.from(arguments).slice(1);
    postMessage(__encode_D_WSETP(evname, data))
    return __WorkerSelf__;
};
function __listen_ev__(evname, handler){
    self.addEventListener('message', function (ev) {
        var msg = ev.data;
        if (msg.startsWith('D')) {
            const parsed = __decodeD_WSETP(msg);
            if (evname === parsed.eventName) {
                handler(...parsed.data);
            }
        }
    });
    return __WorkerSelf__;
};
var __WorkerSelf__={
    terminate: function(){postMessage("D_WSETP1.0;EV=%24WSETP_TERMINATE;DL=0;");return __WorkerSelf__},
    emit: __emit_ev__,
    on: __listen_ev__,
    document: function(){
        // TODO:
    },
    fn: function(name, func) {
        __fns__[name] = func;
        return __WorkerSelf__;
    },
};`

    const functionString = `"use strict";\n;${workerSelfCode};(${func})(__WorkerSelf__,${data.map(e => {
        if (typeof e === 'function') {
            return `(${e})`
        } else if (e instanceof Date) {
            return `(new Date("${e.toISOString()}"))`
        } else {
            return JSON.stringify(e)
        }
    }).join(', ')});`
    const url = `data:text/javascript;base64,${btoa(unescape(encodeURIComponent(functionString)))}`
    return url
}

/** Types **/
type SmartWorker = {
    /**
     * Starts the Worker
     * @param Defines wether the worker should be of type module
     */
    start(enableESM?: boolean): SmartWorker,

    /**
     * Terminates the Worker
     */
    terminate(): SmartWorker,

    /**
     * Dispatches an event
     * @param event Event to emit
     * @param data Data to emit
     */
    emit(event: string, ...data: any[]): SmartWorker,
    /**
     * Dispatches an event
     * @param event Event to emit
     */
    emit(event: string): SmartWorker,

    /**
     * Listens for events emitted by the worker
     * @param event Event name
     * @param handler Event handler
     */
    on(event: string, handler: Function): SmartWorker,
    
    /**
     * Retrieves a function defined inside of the worker
     * @param name Name of the function
     */
    fn(name: string): {
        /**
         * Calls the function with the specified arguments.
         * @param args Arguments to pass into the function
         * @returns {Promise<any>} Return value of the function
         */
        call(...args: any[]): Promise<any>
    }
}

type PseudoDocument = {
    // TODO:
}

type WorkerSelf = {
    /**
     * Terminates the Worker
     */
    terminate(): WorkerSelf,

    /**
     * Dispatches an event
     * @param event Event to emit
     * @param data Data to emit
     */
    emit(event: string, ...data: any[]): WorkerSelf,
    /**
     * Dispatches an event
     * @param event Event to emit
     */
    emit(event: string): WorkerSelf,

    /**
     * Listens for events emitted by the main thread
     * @param event Event name
     * @param handler Event handler
     */
    on(event: string, handler: Function): WorkerSelf,

    /**
     * Returns the document of the main dom, so that you can manipulate it
     */
    document(): PseudoDocument

    /**
     * Defines a function that can be executed by the main thread in the worker
     * @param name Name of the function
     */
    fn(name: string, func: Function): WorkerSelf
}

/** Exports **/
export default smart