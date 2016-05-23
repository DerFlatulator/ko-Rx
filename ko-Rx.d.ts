
interface KnockoutSubscribable<T> {
    toRxObservable<T>(startWithCurrentValue?: boolean): Rx.Observable<T>;
}

interface KnockoutBindingHandlers {
    rx: KnockoutBindingHandler;
}

interface ToKnockoutComputedOptions {
    forwardOnError?: boolean;
    forwardOnCompleted?: boolean;
}

declare namespace Rx {
    interface ObservableStatic {
        fromKnockout<T>(subscribable: KnockoutSubscribable<T>): Observable<T>;
    }
  
    interface Observable<T> {
        toKnockoutComputed(options?: ToKnockoutComputedOptions): KnockoutComputed<T>;
    }
}

declare var koRx: {
    (ko: KnockoutStatic, Rx: any, options?: {
        extend: boolean,
    }): {
        toRxObservable(startWithCurrentValue?: boolean): Rx.Observable<any>;
        toKnockoutComputed(options?: ToKnockoutComputedOptions): KnockoutComputed<any>;
        rxBinding: KnockoutBindingHandler;
    };
}
