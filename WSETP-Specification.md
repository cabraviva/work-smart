# WSETP Specification
This is the specification of the Work Smart Event Transfer Protocol (or WSETP for short)

## Why?
The WSETP was designed to transfer events & data over a single string, as we can't transfer functions or objects over the `postMessage()` function.

# Structure
A WSETP string is structured like this:
```js
[Event Type Identifier]_WSETP[VERSION_MAJOR].[VERSION_MINOR];EV=[Event name];DL=[Data Length];[DATA]
```

and could look like this:
```
D_WSETP1.0;EV=my-ev-name;DL=2;D0=%22MyString%22;D1=123
```

which would just mean:
|Field|Value|
|-----|-----|
|Event Type|Data|
|Version|1.0|
|Data Length|2|
|First Data|MyString|
|Second Data|123|

## Event Type Identifier
The event type identifier indicates the type of the event
|ETI|Meaning|
|---|-------|
|D|Data|
|F|Callback function call|
|C|Function call|
|R|Function return value|

Depending on the ETI data is processed differently, however the structure stays the same. The most used ETI is `D`

## Versions
Here is a table of all versions and features that were added:
|Version|Added Features|
|--|--|
|1.0|Base|

## Event name
The event name is just a urlencoded string holding the name of the event that will be emitted

## Data Length
The data length tells the parser how many different data segments were transmitted. It is the same as using
```js
[...data].length
```
in javascript
## Data
Data segments are separated by a semicolon. Each data segment starts with a `D` followed by the index (starting at 0), a `=` and the urlencoded serialized data.

Example:
`D0=123;D1=%22This%20is%20a%20string%22`

### Data Serialization
Data is being serialized by the following schema:
```coffee
if data is of type 'function'
    - Store function locally with an index
    -> '@FUNC&[Index]'
    -> for example: '@FUNC&1'
if data is of type 'date'
    - Encode date into iso string
    -> '@DATE&[ISO String]'
    -> for example: '@DATE&2023-04-30T11:05:13.272Z'
else
    - Stringify data using JSON.stringify()
    -> '[STRINGIFIED JSON Data]'
    -> for example: '{"key":"value"}'
```

# Structure for data with the "F" ETI
The structure is the following:
```js
F_WSETP[VERSION];EV=CBC_[Function Index]_[Function Call ID];DL=[Arguments length];[Arguments serialized as data]
```

The function call id is just a uuid which is responsible for assigning the return events to the call.

If we want to call the callback function with the index of 0 and no arguments the WSETP string would look like this:
```js
F_WSETP1.0;EV=CBC_0_46dcd23d-e8d1-405f-99d2-6cb84a017e99;DL=0;
```

However if we wanted to put the number `123` as the first argument it would look like this:
```js
F_WSETP1.0;EV=CBC_0_46dcd23d-e8d1-405f-99d2-6cb84a017e99;DL=1;D0=123
```

The arguments are encoded exactly the same as normal data.

# Structure for data with the "C" ETI
The structure is the following:
```js
C_WSETP[VERSION];EV=[Function Name]_[Function Call ID];DL=[Arguments length];[Arguments serialized as data]
```

If we want to call the function with the name of `myfunc` and no arguments the WSETP string would look like this:
```js
C_WSETP1.0;EV=myfunc_46dcd23d-e8d1-405f-99d2-6cb84a017e99;DL=0;
```

The function call id is just a uuid which is responsible for assigning the return events to the call.

However if we wanted to put the number `123` as the first argument it would look like this:
```js
C_WSETP1.0;EV=myfunc_46dcd23d-e8d1-405f-99d2-6cb84a017e99;DL=1;D0=123
```

The arguments are encoded exactly the same as normal data.

# Structure for data with the "R" ETI
When a (callback) function was called, the response is going to use the `R` ETI.
The structure looks like this:
```js
R_WSETP[VERSION];EV=[Function Call ETI (F or C)]_[Function call id];DL=1;D0=[Returned data (or null)]
```

If wee are transmitting the return value for the callback function with the Function call id `46dcd23d-e8d1-405f-99d2-6cb84a017e99` and the return value  `123`, the WSETP string would look like this:
```js
R_WSETP1.0;EV=F_46dcd23d-e8d1-405f-99d2-6cb84a017e99;DL=1;D0=123
```

# Terminate Event
If any WSETP strings event name is `$WSETP_TERMINATE`, it's a signal from the worker for the main thread to terminate the worker right now.
It could look like this:
```js
D_WSETP1.0;EV=%24WSETP_TERMINATE;DL=0;
```