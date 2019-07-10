import { BindingEngine, Disposable } from "aurelia-binding";

export function compareTwoArrays(arr1, arr2, propertyToCompare, onMatch: (element, element2, i, j)=>any, onDone?) {
    for (let i = 0; i < arr1.length; i++) {
        const element = arr1[i];
        for (let j = 0; j < arr2.length; j++) {
            const element2 = arr2[j];
            if(arr1[propertyToCompare] == arr2[propertyToCompare]){
                let {stop, increaseI, increaseJ} = onMatch(element, element2, i, j);

                if(stop){
                    break;
                }

                if(increaseI){
                    i++;
                }

                if(increaseJ){
                    j++;
                }

            }
        }
    }
}

export function isPlainObject(obj) {
    return typeof obj === 'object'
        && obj !== null
        && obj.constructor === Object
        && Object.prototype.toString.call(obj) === '[object Object]';
}

export function cloneObject(obj){
    
    let newObj = {};
    
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const element = obj[key];
            newObj[key] = element;
        }
    }

    return newObj;

}


/**
 *Clona un array, y sus elementos
 *
 * @export
 * @param {*} arr
 */
export function cloneArray(arr){

    let arr2 = [];

    for (const iterator of arr) {
        arr2.push(cloneObject(iterator));
    }

    return arr2;

}

export async function asyncFn(promise:Promise<any>) {
    try {
        let data = await promise;
        return [null, data]
    } catch (error) {
        console.error(error);
        return [error, null];
    }
}

export class ObserveChangeInRecord {
    subscription: Disposable;

    onChange: Function;

    onDischange: Function;

    constructor(private bindingEngine: BindingEngine, private property = '__changed', private record?) {

        if (record) {
            this.observe();
        }

    }

    init(record, property?) {
        this.record = record;

        if (property) {
            this.property = property;
        }

        this.observe();
    }

    private observe() {
        this.subscription = this.bindingEngine
            .propertyObserver(this.record, this.property)
            .subscribe((newValue, oldValue) => {

                if (newValue && !oldValue) {
                    this.onChange();
                }

                else if (!newValue) {
                    this.onDischange();
                }

            });
    }





}
