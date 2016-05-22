(function (root, exportName, factory) { 
    if (typeof define === 'function' && define.amd) define([], factory); else if (typeof module === 'object' && module.exports) module.exports = factory(); else root[exportName] = factory(); 
}(this, 'koRx', function () {

    var koRx = function (ko, Rx, options) {
        if (options === undefined) options = {};

        /**
         * knockout.subscribable to Rx.Observable
         */
        koRx.toRxObservable = function toRxObservable(startWithCurrentValue) {
            if (startWithCurrentValue === undefined) startWithCurrentValue = false;
            var koSubscribable = this;
            return Rx.Observable.create(function (observer) {
                // create a subscription, calling onNext on change
                var koSubscription = koSubscribable.subscribe(observer.onNext, observer);
                
                // hack into the underlying ko.subscribable so that if it is an existing
                // ko.subscription, its disposal terminates the Rx.Observable
                if (koSubscribable.dispose) {
                    var dispose = koSubscribable.dispose;
                    koSubscribable.dispose = function () {
                        // call the underlying knockout disposal function
                        dispose.apply(koSubscribable, arguments);
                        // call the observer's onCompleted
                        observer.onCompleted();
                    }
                }

                // start with the current value if applicable 
                if (startWithCurrentValue && ko.isObservable(koSubscribable)) {
                    var currentValue = koSubscribable();
                    currentValue === undefined || observer.onNext(currentValue);
                }
                
                // dispose of the ko.subscription when the Rx.Observable is disposed
                return koSubscription.dispose.bind(koSubscription);
            });
        }

        /**
         * Static helper from Rx.Observable, mirrors `fromPromise`, `fromEvent`, etc.
         */
        function fromKnockout(koSubscribable) {
            return koSubscribable.toRxObservable();
        }

        /**
         * Rx.Observable to ko.computed
         */
        koRx.toKnockoutComputed = function toKnockoutComputed() {
            var rxObservable = this;
            var koObservable = ko.observable();
            var rxDisposable = new Rx.SingleAssignmentDisposable;
            var computed = ko.pureComputed(function () {
                if (!rxDisposable.getDisposable()) {
                    // This is to prevent our computed from accidentally
                    // subscribing to any ko observables that happen to 
                    // get evaluated during our call to this.subscribe().
                    ko.computed(function () {
                        var rxSubscription = rxObservable.subscribe(koObservable);
                        rxDisposable.setDisposable(rxSubscription);
                    }).dispose();
                }
                return koObservable();
            });
            
            var dispose = computed.dispose;
            computed.dispose = function () {
                rxDisposable.dispose();
                dispose.apply(computed, arguments);
            };

            return computed;
        };

        function updateRxBinding(element, options) {
            var value = null;
            if (options.prop) 
                value = element[options.prop];
            else if (options.attr)
                value = element.getAttribute(options.attr);
            else
                value = element.value;

            options.observer[options.method || 'onNext'](value);
        }

        koRx.rxBinding = {
            init: function (element, valueAccessor) {
                var options = valueAccessor();
                if (!options.event) options.event = 'change';

                var boundUpdate = updateRxBinding.bind(null, element, options);
                if (options.first) boundUpdate();

                element.addEventListener(options.event, boundUpdate);
                ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                    element.removeEventListener(options.event, boundUpdate);
                    if (options.completeOnDisposal) {
                        options.observer.onCompleted();
                    }
                });
            },
            update: function (element, valueAccessor) {
                var options = valueAccessor();
                if (options.track) {
                    updateRxBinding(element, options);
                    ko.unwrap(options.track); // force dependency detection
                }
            },
        };

        if (options.extend) {
            // Knockout uses `fn` instead of `prototype`
            ko.subscribable.fn.toRxObservable = koRx.toRxObservable;
            Rx.Observable.fromKnockout = fromKnockout;
            Rx.Observable.prototype.toKnockoutComputed = koRx.toKnockoutComputed;
            ko.bindingHandlers.rx = koRx.rxBinding;
        }

        return koRx;
    }

    return koRx;
}));