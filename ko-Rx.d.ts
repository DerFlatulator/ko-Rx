
interface KnockoutSubscribable<T> {
    toRxObservable<T>(startWithCurrentValue?: boolean): Rx.Observable<T>;
}

interface KnockoutBindingHandlers {
    rx: KnockoutBindingHandler;
}

declare namespace Rx {
    interface DisposableStatic {
        fromKnockout<T>(subscribable: KnockoutSubscribable<T>): Observable<T>;
    }
  
    interface Disposable<T> {
        toKnockoutComputed(): KnockoutComputed<T>;
    }
}
