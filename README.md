[![Build Status](https://travis-ci.org/DerFlatulator/ko-Rx.svg?branch=master)](https://travis-ci.org/DerFlatulator/ko-Rx)
[![npm version](https://badge.fury.io/js/ko-rx.svg)](https://badge.fury.io/js/ko-rx)
[![Coverage Status](https://coveralls.io/repos/github/DerFlatulator/ko-Rx/badge.svg?branch=master)](https://coveralls.io/github/DerFlatulator/ko-Rx?branch=master)

# ko-Rx
## A utility for converting between ko.observable and Rx.Observable.

This package serves as a bridge between two libraries: [Knockout JS](http://knockoutjs.com) and [RxJS](https://github.com/Reactive-Extensions/RxJS/). 

It offers:
* Conversion from  `ko.subscribable` (e.g.: `ko.observable`, `ko.computed`, `ko.pureComputed`) to `Rx.Observable`.
* Conversion from `Rx.Observable` to a read-only `ko.computed`.
* A Knockout binding handler "`rx`", for pushing values to an `Rx.Observer`.

## API

This utility expects you to pass a reference to Knockout's `ko` and RxJS's `Rx`. It will not write to `ko` or `Rx` unless you ask it. 

To add methods to relevant prototypes, call (once):
```js
koRx(ko, Rx, { extend: true });
```

### Knockout to Rx

To convert from a Knockout observable or computed observable, call `toRxObservable()`. This is useful if you have an existing Knockout observable as a source, and want to perform Rx operations on it.

#### Parameters

1. `startWithCurrentValue` - If `true`, the most recent value of the subscribable is read and will be the first value of the resulting Rx Observable if it is not `undefined`.

#### Example
```js
var koObservable = ko.observable('initial value');
koObservable.toRxObservable(true)
    .take(2)
    .subscribe(
        function onNext(value) {
            console.log(value);
        }, 
        null, 
        function onCompleted() {
            console.log('complete');
        });
    
koObservable('second value');

/* Which Logs:
    initial value
    second value
    complete
*/
```

Or, you can call the static function: `Rx.Observable.fromKnockout`:

```js
var koObservable = ko.observable(0);
var rxObservable = Rx.Observable.fromKnockout(koObservable);
```

### Rx to Knockout

To convert from an `Rx.Observable`, simply call `toKnockoutComputed()`. This is useful if you need to tie an Rx Observable to your Knockout View Model.

#### Parameters

Since Rx Observables are usually cold, there is no "first value" to read.

* `options` - Object:
  - `options.forwardOnError` - Default: `false`. If `true`, an error sent to the observable will be passed to the computed under the `error` property.
  - `options.forwardOnCompleted` - Default: `false`. If `true`, when the observable's `onCompleted` is called, `true` will be passed to the computed under the `completed` property.

#### Example

```js
var rxObservable = Rx.Observable.interval(100, function () { 
    return Math.random();
});
var viewModel = {
    readOnlyComputed: rxObservable.toKnockoutComputed()
};
ko.applyBindings(viewModel, document.getElementById('demo'));
```

```html
<span id="demo1" data-bind="text: readOnlyComputed"></span>
```

###  Knockout `rx` binding handler

The Knockout `rx` binding handler can be used to feed an `Rx.Observer` or `Rx.Subject` from your UI, declaratively.

#### Parameters

**Required:**
* `observer` - Required, the `Rx.Observer` or `Rx.Subject` on your view model.

**Optional:**
* `event` - Default: `"change"`. The event upon which the Rx observer is passed a new value.
* `method` - Default: `"onNext"`. The function to pass new values to. Can be `"onNext"`, `"onError"`, or `"onCompleted"`.
* `first` - Default: `false`. If true, the initial value of the element is pass to `method`.
* `track` - Default: `null`. If a Knockout observable is passed, the Rx observer will be updated every time the tracked observable changes.
* `completeOnDisposal` - Default: `false`. If `true`, the Rx observer's `onCompleted` will be called when the DOM node is disposed.
* `attr` - Default: `"value"`. Select an attribute to read from the element in the DOM. E.g. `"title"`.
* `prop` - Instead of an `attr`, select a property from the element (in JS), for example `"textContent"`.

#### Examples

Basic usage:

```html
<input id="demo2" type="text" value="0" data-bind="rx: {observer: rxSubject}" />
```

```js
var subject = new Rx.Subject;
ko.applyBindings({ rxSubject: subject }, document.getElementById('demo2'));
subject
    .throttle(200)
    .subscribe(function onNext(inputText) {
        /* Will log the value of the text field each time it is changed. */
        console.log(inputText);
    });

```

Tracking a knockout observable:

```html
<span id="demo3" 
      data-bind="text: koObservable(),
                 rx: {track: koObservable, prop: 'textContent', observer: rxSubject}">
</span>
```

```js
var inputField = doc.getElementById('test');
var observable = ko.observable('initial (ignored, `first` is not true)');
var subject = new Rx.Subject;
ko.applyBindings({ 
    koObservable: observable,
    rxSubject: subject 
}, inputField);

observable('second value');
observable('third value');

subject.subscribe(function (value) {
    console.log(value);
});

/* Logs:
    second value
    third value
*/
```


## Hey, stop touching to my `prototype`s!

Alternatively, if you do not want to write to `ko` or `Rx`, you can request all of the provided functionality by calling `koRx`:

```js
var koRxFns = koRx(ko, Rx);
```

Which provides all the functionality without writing to any prototypes. Be sure to use `fn.call`, to provide the appropriate `this`-context.

**For example:**

```js
var koComputed = koRxFns.toKnockoutComputed.call(someRxObservable);
var rxObservable = koRxFns.toRxObservable.call(someKoObservable, true);

ko.bindingHandlers.rx = koRxFns.rxBinding;
```

## Compatability

Written in plain ECMAScript 5, safe to load in the browser without any transformation.

## Tests

Fully unit tested with mocha, chai, sinon and jsdom. Run with: 

```
$ npm run test-node     # to test in Node.JS
$ npm run test-phantom  # to test in PhantomJS
```

## License

MIT.
