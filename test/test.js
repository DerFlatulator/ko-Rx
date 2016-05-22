var hasRequire = typeof require === 'function';

if (hasRequire) {
    var expect = require('chai').expect;
    var sinon = require('sinon');
    var jsdom = require('jsdom');
    var koRx = require('../ko-Rx');

    var Rx = require('rx');
    var ko = require('knockout');
}

describe('ko-Rx - environment: ' + (hasRequire ? 'NodeJS' : 'PhantomJS'), function () {
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
            sinon.assert.calledWith(spy, 1);
            koObservable(2);
            sinon.assert.calledWith(spy, 2);
        });

        it('stops receiving values after disposal', function () {
            var rxObservable = koObservable.toRxObservable();
            var spy = sinon.spy();
            var subscription = rxObservable.subscribe(spy);
            koObservable(1);
            sinon.assert.calledWith(spy, 1);
            subscription.dispose();
            koObservable(2);
            sinon.assert.neverCalledWith(spy, 2);
        });
        
        it('does not receive first value by default', function () {
            var rxObservable = koObservable.toRxObservable();
            var spy = sinon.spy();
            var subscription = rxObservable.subscribe(spy);
            sinon.assert.neverCalledWith(spy, 2);
        });

        it('receives first value when asked', function () {
            var rxObservable = koObservable.toRxObservable(true);
            var spy = sinon.spy();
            var subscription = rxObservable.subscribe(spy);
            sinon.assert.calledWith(spy, 0);
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

        it('calls onCompleted on Rx.Observable when underlying ko.computed is disposed', function () {
            var koComputed = ko.computed({
                read: function () {
                    return koObservable();
                }
            });
            var rxObservable = koComputed.toRxObservable();
            var spyCompleted = sinon.spy();
            rxObservable.subscribe(function () {}, function () {}, spyCompleted);
            koComputed.dispose();
            sinon.assert.called(spyCompleted);
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
            sinon.assert.notCalled(spy);
            rxSubject.onNext(0);
            sinon.assert.calledWith(spy, 0);
            rxSubject.onNext(1);
            sinon.assert.calledWith(spy, 1);
        });

        it('stops receiving after computed disposal', function () {
            var koComputed = rxSubject.toKnockoutComputed();
            expect(ko.isSubscribable(koComputed)).to.be.true;
            var spy = sinon.spy();
            var subscription = koComputed.subscribe(spy);
            rxSubject.onNext(0);
            sinon.assert.calledWith(spy, 0);
            koComputed.dispose();
            rxSubject.onNext(1);
            sinon.assert.neverCalledWith(spy, 1);
        });
        
        it('stops receiving after computed subscription disposal', function () {
            var koComputed = rxSubject.toKnockoutComputed();
            expect(ko.isSubscribable(koComputed)).to.be.true;
            var spy = sinon.spy();
            var subscription = koComputed.subscribe(spy);
            rxSubject.onNext(0);
            sinon.assert.calledWith(spy, 0);
            subscription.dispose();
            rxSubject.onNext(1);
            sinon.assert.neverCalledWith(spy, 1);
        });

        it('stops receiving after onCompleted', function () {
            var koComputed = rxSubject.toKnockoutComputed();
            expect(ko.isSubscribable(koComputed)).to.be.true;
            var spy = sinon.spy();
            var subscription = koComputed.subscribe(spy);
            rxSubject.onNext(0);
            sinon.assert.calledWith(spy, 0);
            rxSubject.onCompleted();
            rxSubject.onNext(1);
            sinon.assert.neverCalledWith(spy, 1);
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

        testInDom = function (html, fn) {
            if (!hasRequire) {
                var root = document.getElementById('__test__');
                expect(root).to.exist;
                root.innerHTML = html;
                fn(document);
            } else {
                jsdom.env({
                    html: html,
                    src: [],
                    done: function (err, window) {
                        expect(err).to.be.falsy;
                        fn(window.document);
                        window.close();
                    }
                });
                
            }
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
            testInDom(
                '<input id="test" type="text" value="0" data-bind="rx: {first: true, observer: rxSubject}" />', 
                function (doc) {
                    var inputField = doc.getElementById('test');
                    ko.applyBindings({ rxSubject: rxSubject }, inputField);
                    sinon.assert.calledWith(spyNext, '0');
                    done();
                }
            );
        });

        it('gets changed values on event firing', function (done) {
            testInDom(
                '<input id="test" type="text" value="0" data-bind="rx: {observer: rxSubject}" />', 
                function (doc) {
                    var inputField = doc.getElementById('test');
                    ko.applyBindings({ rxSubject: rxSubject }, inputField);
                    inputField.value = '1';
                    dispatchEvent(doc, 'change', inputField);
                    sinon.assert.calledWith(spyNext, '1');
                    done();
                }
            );
        });

        it('can call onError', function (done) {
            testInDom(
                '<input id="test" type="text" value="0" data-bind="rx: {first: true, method: \'onError\', observer: rxSubject}" />', 
                function (doc) {
                    var inputField = doc.getElementById('test');
                    ko.applyBindings({ rxSubject: rxSubject }, inputField);
                    sinon.assert.calledOnce(spyError);
                    done();
                }
            );
        });

        it('can call onCompleted', function (done) {
            testInDom(
                '<input id="test" type="text" value="0" data-bind="rx: {first: true, method: \'onCompleted\', observer: rxSubject}" />', 
                function (doc) {
                    var inputField = doc.getElementById('test');
                    ko.applyBindings({ rxSubject: rxSubject }, inputField);
                    sinon.assert.calledOnce(spyCompleted);
                    done();
                }
            );
        });

        it('calls onNext when observables changes', function (done) {
            testInDom(
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
                    sinon.assert.calledWith(spyNext, '1');
                    sinon.assert.calledWith(spyNext, '2');
                    done();
                }
            );
        });

        it('can get attributes from the DOM', function (done) {
            testInDom(
                '<input id="test" type="text" data-bind=" rx: {first: true, attr: \'type\', observer: rxSubject}" />', 
                function (doc) {
                    var inputField = doc.getElementById('test');
                    ko.applyBindings({ rxSubject: rxSubject }, inputField);
                    sinon.assert.calledWith(spyNext, 'text');
                    done();
                }
            );
        });

        it('can get data-attributes from the DOM', function (done) {
            testInDom(
                '<input id="test" type="text" data-test="foo" data-bind=" rx: {first: true, attr: \'data-test\', observer: rxSubject}" />', 
                function (doc) {
                    var inputField = doc.getElementById('test');
                    ko.applyBindings({ rxSubject: rxSubject }, inputField);
                    sinon.assert.calledWith(spyNext, 'foo');
                    done();
                }
            );
        });

        it('can get properties from the element', function (done) {
            testInDom(
                '<input id="test" type="text" data-bind="rx: {first: true, prop: \'_testProp\', observer: rxSubject}" />', 
                function (doc) {
                    var inputField = doc.getElementById('test');
                    inputField._testProp = 'foo';
                    ko.applyBindings({ rxSubject: rxSubject }, inputField);
                    sinon.assert.calledWith(spyNext, 'foo');
                    done();
                }
            );
        });

        it('does not call onCompleted on disposal by default', function (done) {
            testInDom(
                '<input id="test" type="text" data-bind="rx: {observer: rxSubject}" />', 
                function (doc) {
                    var inputField = doc.getElementById('test');
                    inputField._testProp = 'foo';
                    ko.applyBindings({ rxSubject: rxSubject }, inputField);
                    ko.cleanNode(inputField);
                    sinon.assert.notCalled(spyCompleted);
                    done();
                }
            );
        });

        it('can call onCompleted on disposal', function (done) {
            testInDom(
                '<input id="test" type="text" data-bind="rx: {completeOnDisposal: true, observer: rxSubject}" />', 
                function (doc) {
                    var inputField = doc.getElementById('test');
                    inputField._testProp = 'foo';
                    ko.applyBindings({ rxSubject: rxSubject }, inputField);
                    ko.cleanNode(inputField);
                    sinon.assert.called(spyCompleted);
                    done();
                }
            );
        });
    });
});
