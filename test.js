
var expect = require('chai').expect;
var sinon = require('sinon');
var jsdom = require('jsdom');

var fs = require('fs');
var path = require('path');

var koRx = require('./ko-Rx');

describe('koRx', function () {
    var Rx, ko;

    beforeEach(function () {
        Rx = require('rx');
        ko = require('knockout');
    });

    it('does not mutate objects by default', function () {
        koRx(ko, Rx);
        expect(ko.subscribable.fn.toRxObservable).to.be.undefined;
        expect(Rx.Observable.prototype.toKnockoutComputed).to.be.undefined;
        expect(ko.bindingHandlers.rx).to.be.undefined;
    });

    it('does not mutate objects when requested', function () {
        koRx(ko, Rx, { extend: false });
        expect(ko.subscribable.fn.toRxObservable).to.be.undefined;
        expect(Rx.Observable.prototype.toKnockoutComputed).to.be.undefined;
        expect(ko.bindingHandlers.rx).to.be.undefined;
    });

    it('returns desired functions', function () {
        var koRxFunctions = koRx(ko, Rx);
        expect(koRxFunctions.toRxObservable).to.be.a('function');
        expect(koRxFunctions.toKnockoutComputed).to.be.a('function');
        expect(koRxFunctions.rxBinding).to.be.an('object');
    });

    it('mutates objects when requested', function () {
        koRx(ko, Rx, { extend: true });
        expect(ko.subscribable.fn.toRxObservable).to.be.a('function');
        expect(Rx.Observable.prototype.toKnockoutComputed).to.be.a('function');
        expect(ko.bindingHandlers.rx).to.be.an('object');
    });

    describe('ko.observable to Rx.Observable', function () {
        var koObservable;

        beforeEach(function () {
            koRx(ko, Rx, { extend: true });
            koObservable = ko.observable(0);
        });
        
        it('converts ko.observable into Rx.Observable', function () {
            var rxObservable = koObservable.toRxObservable();
            expect(Rx.Observable.isObservable(rxObservable)).to.be.true;
            
            rxObservable = Rx.Observable.fromKnockout(koObservable);
            expect(Rx.Observable.isObservable(rxObservable)).to.be.true;
        });
        
        it('receives new values', function () {
            var rxObservable = koObservable.toRxObservable();
            var spy = sinon.spy();
            var subscription = rxObservable.subscribe(spy);
            koObservable(1);
            expect(spy.calledWith(1)).to.be.true;
            koObservable(2);
            expect(spy.calledWith(2)).to.be.true;
        });

        it('stops receiving values after disposal', function () {
            var rxObservable = koObservable.toRxObservable();
            var spy = sinon.spy();
            var subscription = rxObservable.subscribe(spy);
            koObservable(1);
            expect(spy.calledWith(1)).to.be.true;
            subscription.dispose();
            koObservable(2);
            expect(spy.calledWith(2)).to.be.false;
        });
        
        it('does not receive first value by default', function () {
            var rxObservable = koObservable.toRxObservable();
            var spy = sinon.spy();
            var subscription = rxObservable.subscribe(spy);
            expect(spy.calledWith(0)).to.be.false; 
        });

        it('receives first value when asked', function () {
            var rxObservable = koObservable.toRxObservable(true);
            var spy = sinon.spy();
            var subscription = rxObservable.subscribe(spy);
            expect(spy.calledWith(0)).to.be.true;
        });

        it('converts ko.computed into Rx.Observable', function () {
            var koComputed = ko.computed({
                read: function () {
                    return koObservable();
                }
            });
            var rxObservable = koComputed.toRxObservable();
            expect(Rx.Observable.isObservable(rxObservable)).to.be.true;
        });
    });
    
    describe('Rx.Observable to ko.computed', function () {
        var rxSubject;
        
        beforeEach(function () {
            koRx(ko, Rx, { extend: true });
            rxSubject = new Rx.Subject;
        });

        afterEach(function () {
            rxSubject.dispose();
        });

        it('converts Rx.Subject to ko.computed', function () {
            var koComputed = rxSubject.toKnockoutComputed();
            expect(ko.isComputed(koComputed)).to.be.true;
        });

        it('converts Rx.Observable to ko.computed', function () {
            var rxObservable = Rx.Observable.just(0);
            var koComputed = rxObservable.toKnockoutComputed();
            expect(ko.isComputed(koComputed)).to.be.true;
        });

        it('is read only', function () {
            var koComputed = rxSubject.toKnockoutComputed();
            expect(ko.isWritableObservable(koComputed)).to.be.false;
            var subscription = koComputed.subscribe
        });

        it('receives new values', function () {
            var koComputed = rxSubject.toKnockoutComputed();
            expect(ko.isSubscribable(koComputed)).to.be.true;
            var spy = sinon.spy();
            var subscription = koComputed.subscribe(spy);
            expect(spy.called).to.be.false;
            rxSubject.onNext(0);
            expect(spy.calledWith(0)).to.be.true;
            rxSubject.onNext(1);
            expect(spy.calledWith(1)).to.be.true;
        });

        it('stops receiving after subscription disposal', function () {
            var koComputed = rxSubject.toKnockoutComputed();
            expect(ko.isSubscribable(koComputed)).to.be.true;
            var spy = sinon.spy();
            var subscription = koComputed.subscribe(spy);
            rxSubject.onNext(0);
            expect(spy.calledWith(0)).to.be.true;
            subscription.dispose();
            rxSubject.onNext(1);
            expect(spy.calledWith(1)).to.be.false;
        });

        it('stops receiving after onCompleted', function () {
            var koComputed = rxSubject.toKnockoutComputed();
            expect(ko.isSubscribable(koComputed)).to.be.true;
            var spy = sinon.spy();
            var subscription = koComputed.subscribe(spy);
            rxSubject.onNext(0);
            expect(spy.calledWith(0)).to.be.true;
            rxSubject.onCompleted();
            rxSubject.onNext(1);
            expect(spy.calledWith(1)).to.be.false;
        });
    });
    
    describe('knockout "rx" binding', function () {
        var rxSubject, spyNext, spyError, spyCompleted;

        beforeEach(function () {
            koRx(ko, Rx, { extend: true });
            rxSubject = new Rx.Subject;
            spyNext = sinon.spy();
            spyCompleted = sinon.spy();
            spyError = sinon.spy();
            rxSubject.subscribe(spyNext, spyError, spyCompleted);
        });

        testInJsDom = function (html, fn) {
            jsdom.env({ 
                html: html, 
                src: [], 
                done: function (err, window) {
                    expect(err).to.be.falsy;
                    fn(window.document, ko);
                    window.close();
                }
            });
        };
        
        dispatchEvent = function (document, event, element) {
            var evt = document.createEvent('HTMLEvents');
            evt.initEvent(event, false, true);
            element.dispatchEvent(evt);
        };

        it('has update and init functions', function () {
            var rxBinding = ko.bindingHandlers.rx;
            expect(rxBinding).to.be.an('object');
            expect(rxBinding.init).to.be.a('function');
            expect(rxBinding.update).to.be.a('function');
        });
        
        it('binds successfully and gets initial value', function (done) {
            testInJsDom(
                '<input id="test" type="text" value="0" data-bind="rx: {first: true, observer: rxSubject}" />', 
                function (doc) {
                    var inputField = doc.getElementById('test');
                    ko.applyBindings({ rxSubject: rxSubject }, inputField);
                    expect(spyNext.calledWith('0')).to.be.true;
                    done();
                }
            );
        });

        it('gets changed values on event firing', function (done) {
            testInJsDom(
                '<input id="test" type="text" value="0" data-bind="rx: {observer: rxSubject}" />', 
                function (doc) {
                    var inputField = doc.getElementById('test');
                    ko.applyBindings({ rxSubject: rxSubject }, inputField);
                    inputField.value = '1';
                    dispatchEvent(doc, 'change', inputField);
                    expect(spyNext.calledWith('1')).to.be.true;
                    done();
                }
            );
        });

        it('can call onError', function (done) {
            testInJsDom(
                '<input id="test" type="text" value="0" data-bind="rx: {first: true, method: \'onError\', observer: rxSubject}" />', 
                function (doc) {
                    var inputField = doc.getElementById('test');
                    ko.applyBindings({ rxSubject: rxSubject }, inputField);
                    expect(spyError.called).to.be.true;
                    done();
                }
            );
        });

        it('can call onCompleted', function (done) {
            testInJsDom(
                '<input id="test" type="text" value="0" data-bind="rx: {first: true, method: \'onCompleted\', observer: rxSubject}" />', 
                function (doc) {
                    var inputField = doc.getElementById('test');
                    ko.applyBindings({ rxSubject: rxSubject }, inputField);
                    expect(spyCompleted.called).to.be.true;
                    done();
                }
            );
        });

        it('calls onNext when observables changes', function (done) {
            testInJsDom(
                '<span id="test" data-bind="text: observable(), rx: {track: observable, prop: \'textContent\', observer: rxSubject}"></span>', 
                function (doc) {
                    var inputField = doc.getElementById('test');
                    var observable = ko.observable('0');
                    ko.applyBindings({ 
                        observable: observable,
                        rxSubject: rxSubject 
                    }, inputField);
                    observable('1');
                    observable('2');
                    expect(spyNext.calledWith('1')).to.be.true;
                    expect(spyNext.calledWith('2')).to.be.true;
                    done();
                }
            );
        });

        it('can get attributes from the DOM', function (done) {
            testInJsDom(
                '<input id="test" type="text" data-bind=" rx: {first: true, attr: \'type\', observer: rxSubject}" />', 
                function (doc) {
                    var inputField = doc.getElementById('test');
                    ko.applyBindings({ rxSubject: rxSubject }, inputField);
                    expect(spyNext.calledWith('text')).to.be.true;
                    done();
                }
            );
        });

        it('can get data-attributes from the DOM', function (done) {
            testInJsDom(
                '<input id="test" type="text" data-test="foo" data-bind=" rx: {first: true, attr: \'data-test\', observer: rxSubject}" />', 
                function (doc) {
                    var inputField = doc.getElementById('test');
                    ko.applyBindings({ rxSubject: rxSubject }, inputField);
                    expect(spyNext.calledWith('foo')).to.be.true;
                    done();
                }
            );
        });

        it('can get properties from the element', function (done) {
            testInJsDom(
                '<input id="test" type="text" data-bind="rx: {first: true, prop: \'_testProp\', observer: rxSubject}" />', 
                function (doc) {
                    var inputField = doc.getElementById('test');
                    inputField._testProp = 'foo';
                    ko.applyBindings({ rxSubject: rxSubject }, inputField);
                    expect(spyNext.calledWith('foo')).to.be.true;
                    done();
                }
            );
        });

        it('does not call onCompleted on disposal by default', function (done) {
            testInJsDom(
                '<input id="test" type="text" data-bind="rx: {observer: rxSubject}" />', 
                function (doc) {
                    var inputField = doc.getElementById('test');
                    inputField._testProp = 'foo';
                    ko.applyBindings({ rxSubject: rxSubject }, inputField);
                    ko.cleanNode(inputField);
                    expect(spyCompleted.called).to.be.false;
                    done();
                }
            );
        });

        it('can call onCompleted on disposal', function (done) {
            testInJsDom(
                '<input id="test" type="text" data-bind="rx: {completeOnDisposal: true, observer: rxSubject}" />', 
                function (doc) {
                    var inputField = doc.getElementById('test');
                    inputField._testProp = 'foo';
                    ko.applyBindings({ rxSubject: rxSubject }, inputField);
                    ko.cleanNode(inputField);
                    expect(spyCompleted.called).to.be.true;
                    done();
                }
            );
        });
    });
});
